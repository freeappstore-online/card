# Card

A small digital business card from FreeAppStore's digital-business-card idea.

Make a private device-local draft, download a vCard, or explicitly publish a copy
as a public contact page with a QR code. Visitors do not need an account to save
a public contact. Sign in from Profile to create, replace or remove your public
cards. Public collections are publicly readable, including without a share link.

Drafts stay on this browser and do not sync with your account. Saved drafts and
vCard downloads work offline after the first successful app load. Public pages
need a connection and are deliberately not cached as offline personal data.
Removing a public page cannot recall downloaded contacts.

## Develop

Node 22+, pnpm 10.30.3.

```
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Playwright needs Chromium and WebKit installed. Browser tests cover draft typing,
validation, Profile return, downloads, reload, offline reading, public confirmation,
rejected-write retry, actual QR decoding and deletion. Connected tests intercept
the API with synthetic actors and block service workers so mocked requests cannot
escape through a worker. They do not prove interactive OAuth or live authorization.

Built locally with published CLI 0.4.76 and SDK 0.16.39; platform findings are filed
and queued for the FAS platform coder, rather than patched during app development.
See [CREATION-REVIEW.md](CREATION-REVIEW.md).
