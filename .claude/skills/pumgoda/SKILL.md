---
name: pumgoda
description: Run, verify and ship changes to the pumgoda app (pet-friendly places map, paw tiers, trips, votes) and its admin editor. Use when editing pumgoda/, workers/pumgoda-*, or the Pumgoda parts of admindepum.html.
---

Read `pumgoda/CLAUDE.md` first.

## Run
`preview_start` with name `pumgoda` (port 5176) → `http://localhost:5176/` (base is `./`). Map tiles need
`VITE_CARTO_KEY` in the environment (`.env.local`, untracked) — blank tiles usually mean a missing key or a
referer-list problem, not a code bug.
Admin editor: launch `admin-static` (5178) → `http://localhost:5178/admindepum.html` (needs the admin Google account).

## Verify
- Tier changes: edit `data/computeTier.js` only; check one venue per tier (stroller → 1 paw … pet menu → 4 paws).
- Filter changes: reload with previously saved filter state in localStorage — invalid/old shapes must be discarded, not crash.
- Votes/trips: need a signed-in user and the matching Firestore rules.
- Offline: confirm `places.fallback.json` path still works when the catalog fetch fails.

## Ship
1. `npm run build`, then the ESLint `no-undef` gate (root `CLAUDE.md`).
2. Merge to `main` for Pages. Catalog data edits happen live in Firestore through the admin page (no deploy).
   Photo/lookup Workers and rules are manual (skills `deploy-worker`, `deploy-firestore-rules`).
