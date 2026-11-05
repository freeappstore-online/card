/**
 * Device-local persistence. This data is device-only. Not an account backup and not fas.kv.
 * Import this module from app code. Installation does not read or delete saved data.
 * A failed save returns { ok: false, reason } and must not be shown as saved.
 * watchPreference notifies other tabs; it does not merge and is not conflict resolution.
 * Put an app-owned resolveConflict on putFile when a file id may already exist.
 */
export {
  getPreference,
  setPreference,
  removePreference,
  watchPreference,
  openStore,
  getRecord,
  putRecord,
  deleteRecord,
  withTransaction,
  openFileStore,
  putFile,
  getFile,
  getFileMetadata,
  listFiles,
  installCapability,
  getCapability,
} from '@freeappstore/sdk/persist';
