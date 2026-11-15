---
name: nutritions-thailand
description: Run, verify and ship changes to the nutritions-thailand app (TDEE/macro tracker, food log, photo dish ID). Use when editing anything under nutritions-thailand/.
---

Read `nutritions-thailand/CLAUDE.md` first.

## Run
`preview_start` with name `nutritions-thailand` (port 5182) → `http://localhost:5182/nutritions-thailand/`.

## Verify
- Data-shape change: load the app with an **existing** `nutritions.store.v1` (don't clear storage first) and confirm
  nothing crashes and old logs still show. Test Adjust → Data backup export then import.
- Maths change (`data/constants.js`): sanity-check TDEE/macros for one known profile before and after.
- New strings: present in both EN and TH dictionaries (`i18n/strings.js`); toggle language to confirm.
- Photo tab needs the Gemini Worker; if unreachable, confirm the tab fails gracefully instead of crashing.

## Ship
1. `npm run build`, then the ESLint `no-undef` gate (root `CLAUDE.md`).
2. Merge to `main` for the Pages deploy. Photo Worker (`workers/nutritions-photo-worker.js`) and Firestore rules are
   manual (skills `deploy-worker`, `deploy-firestore-rules`).
