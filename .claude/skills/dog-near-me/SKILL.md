---
name: dog-near-me
description: Run, verify and ship changes to dog-near-me (package "majon", the stray-dog ID map) and its majon-photo Worker. Use when editing anything under dog-near-me/.
---

Read `dog-near-me/ARCHITECTURE.md` and `dog-near-me/CLAUDE.md` first.

## Run
`preview_start` with name `dog-near-me` (port 5173) → `http://localhost:5173/dog-near-me/`.
Needs `VITE_MAJON_WORKER_URL` and `VITE_CARTO_KEY` in `.env.local` (untracked). Worker locally: `npm run dev` in `dog-near-me/worker`.

## Verify
- Reporting flow: photo with EXIF GPS, and photo without (falls back to device location).
- Match flow: nearby-candidate list, same-dog verdict + confidence, % similar shown as supplementary only.
- Anything calling the Worker: confirm auth-token and daily-cap failures show a friendly message rather than a crash.
- Never log or hard-code provider keys; they live only as Worker secrets.

## Ship
1. `npm run build`, then the ESLint `no-undef` gate (root `CLAUDE.md`).
2. Frontend via merge to `main`. Worker changes: manual `npx wrangler deploy` in `dog-near-me/worker`
   (skill `deploy-worker`). Rules changes: skill `deploy-firestore-rules`.
