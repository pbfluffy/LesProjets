# nutritions-thailand

Thai cut/recomp nutrition tracker: TDEE, macros, water, custom foods, per-day logging, photo dish ID.
Live: `/nutritions-thailand/`. `README.md` has the tab-by-tab description and file tree.

## Layout

- `src/hooks/useNutritionStore.js` — all state, persistence, per-day log, export/import. Start here for data changes.
- `src/data/constants.js` — BMR/TDEE/macro/BMI maths; `src/data/meals.js` — categorized Thai food DB.
- `src/i18n/strings.js` + `LangContext.jsx` — EN/TH dictionaries; add every new string to **both** languages.
- `src/hooks/useWaterReminder.js` — browser-notification loop. `useCloudSync.js` — Firestore sync (shared core).
- Photo tab calls a Gemini proxy Worker (`../workers/nutritions-photo-worker.js`); the key is a Worker secret.

## Data

- Everything is one localStorage key, `nutritions.store.v1` (stats, custom foods, logs keyed `YYYY-MM-DD`, targets).
  Changing its shape needs a migration/defaulting path — users have existing data.
- `theme` is shared and a plain string. Backup/restore lives in **Adjust → Data backup**; keep it round-tripping.
- Cloud sync writes to the Nutritions block in `firestore.rules`.

## Gotchas

- `vite.config.js` reads `VITE_BASE` (not `VITE_BASE_PATH`) for the base path.
- Safety warnings on the calorie-delta slider are deliberate; don't loosen limits without being asked.
- Run the repo ESLint gate after edits (see root `CLAUDE.md`).
