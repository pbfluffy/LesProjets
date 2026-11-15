---
name: village-77
description: Run, verify and ship changes to village-77 (village marketplace + handymen board with LINE login) and its Worker. Use when editing anything under village-77/.
---

Read `village-77/CLAUDE.md` and `village-77/worker/README.md` first.

## Run
`preview_start` with name `village-77` (port 5184) → `http://localhost:5184/village-77/`.
LINE sign-in needs the callback URL `http://localhost:5184/village-77/` registered on the LINE channel and the
Worker's secrets set; without them `/line-auth` returns 503 and the sheet says LINE sign-in isn't on yet — that is
expected locally, not a bug.

## Verify
- Posts/listings: create, edit, favourite, rate; check freshness labels and category filters in EN and TH.
- Auth paths: Google (admin link at the page bottom) and LINE. Banned users (`useBans`) must be blocked.
- Photo upload goes through the Worker (`/upload`, needs a Firebase ID token) — test with a large phone photo.
- Any new Firestore field/collection: update the "Village 77" rules block and deploy rules.

## Ship
1. `npm run build`, then the ESLint `no-undef` gate (root `CLAUDE.md`).
2. Frontend via merge to `main`. Worker: manual `npx wrangler deploy` in `village-77/worker` (skill `deploy-worker`);
   the share route `…/village-77/s/*` comes from its `wrangler.toml`.
