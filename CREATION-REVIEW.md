# Card: creation review

Built locally from the front site's digital-business-card idea, using published
CLI 0.4.76, SDK 0.16.39, the connected starter and optional persistence capability.
The display name is **Card**. No measurement framework or baseline exercise was added.

## What worked

The starter supplied the frame, avatar/Profile, preferences, PWA controller,
PNG/ICO/Apple icon generation and deploy workflow. The SDK supplied device-local
transactions and explicitly public-read collections. Contact validation, vCard
escaping/folding, QR generation, publication consent and card layout remained
app-owned. A different vertical template was not needed.

Private draft creation and contact export do not require sign-in. Publication is
an explicit feature boundary: the user reviews the exact contact fields and
confirms they are public. Unknown/private fields are excluded from publication.
Visitors can view and download a card without an account. The owner can replace
published details or remove the public card. Downloaded contacts cannot be recalled.

## Findings queued for the platform coder

Implementation of these fixes is intentionally left to the coder. Pending order:

1. [#424](https://github.com/freeappstore-online/platform/issues/424): source
   compliance scans ignored transient Playwright resources while browser tests
   are running. Captured SDK CSS triggered 17 false brand overrides and captured
   JS triggered a false notifications declaration warning. Sequencing browser
   verification before publication unblocked this build without skipping checks.
   This is not evidence of failure after all tests have completed.
2. [#425](https://github.com/freeappstore-online/platform/issues/425): the actual
   publish prompt calls connected apps Firebase/Supabase-backed and shared with a
   Pro version. Card uses FAS auth/collections and has no Pro counterpart. The
   standalone prompt also incorrectly limits device storage to localStorage.
3. [#423](https://github.com/freeappstore-online/platform/issues/423): the ideas
   page still labels Teleprompter as unbuilt although Cue is live under another
   name. A supported explicit idea-to-app mapping is missing from this path.

All were filed through the verified FAS platform coder connection and added as
pending standing tasks with the order above. Task insertion did not start an
execution run. No shared platform, SDK, CLI or template implementation was edited.

## Verification

Typecheck, app unit tests and production build passed. Six browser cases across
desktop Chromium, mobile Chromium and WebKit cover sequential typing, invalid
input, draft save/reload, Profile return, a real downloaded vCard, offline draft
reload, publication consent, rejected-write retry, anonymous reads, decoded QR
content and removal. Unit tests check field allowlisting, unsafe links/control
characters, Unicode vCard escaping and UTF-8 line folding.

The connected browser fixture uses synthetic accounts and intercepted API
responses. Its service workers are blocked so mocked requests cannot escape
through a worker; the separate offline case exercises the real built worker.
This is not an interactive OAuth test or proof of live server authorization.
Physical QR scanning, a physical-device contact import and home-screen install
are separate from browser-engine and downloaded-file checks.
