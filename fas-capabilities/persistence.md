# Device-local persistence

Requires @freeappstore/sdk with the persist export (0.16.18 or newer).
This capability is device-only: localStorage and IndexedDB on this origin.
Account-backed keys stay on fas.kv. Public documents stay on fas.collections.
Import getPreference and the other helpers from fas-capabilities/persistence.ts.
Do not delete existing preference keys or databases when installing later.
A cross-tab watchPreference notice is a notification, not conflict resolution.

Example (adapt the namespace and app-owned validator; inspect every result.ok):
```ts
import { openStore, getRecord, putRecord } from '@freeappstore/sdk/persist';

type Draft = { text: string };
const isDraft = (value: unknown): value is Draft =>
  typeof value === 'object' && value !== null &&
  'text' in value && typeof value.text === 'string';

export async function loadDraft() {
  const opened = await openStore({ namespace: 'notes', version: 1 });
  if (!opened.ok) return opened;
  try {
    // undefined means no record yet. A failed result is not an empty database.
    return await getRecord(opened.value, 'draft', isDraft);
  } finally {
    opened.value.close();
  }
}

export async function saveDraft(draft: Draft) {
  const opened = await openStore({ namespace: 'notes', version: 1 });
  if (!opened.ok) return opened;
  try {
    // Show "Saved" only if the returned result.ok is true.
    return await putRecord(opened.value, 'draft', draft, isDraft);
  } finally {
    opened.value.close();
  }
}
```
See https://github.com/freeappstore-online/platform/blob/main/docs/sdk.md
