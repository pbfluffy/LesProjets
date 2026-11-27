# Wildlight Expedition

Semi-idle fantasy RPG (design brief: three heroes, Pinewood Trail stages, barrier-timed boss, 24 h offline farming).
**Static JS, no build step**: `index.html`, `style.css`, `game.js` (data, save, farming, battle sim, UI), `art.js`
(canvas art: `drawHero`, `drawMon`, `drawSword`, `drawBackground`; loaded before `game.js`, helpers prefixed `art`).

- Live path: `/wildlight-expedition/` (deployed by copying the folder in `deploy.yml`).
- Save: `localStorage["wildlight-expedition-v1"]`. It does not use the shared `theme`/`lang` keys.
- Dev: serve the folder with any static server and open `/wildlight-expedition/` (a `file://` page may block scripts).
- `window.__wl` exposes the save and actions in the console for playtesting.

## Recipes, grades and cloud save
- Weapons are items: `save.items[weapon][grade]` counts copies. Craft copies in the Forge; `MERGE_N` (3) copies of the same weapon and grade
  merge into one of the next grade (`GRADES` in `game.js`: Common → Legendary, each with a damage/heal multiplier). A hero uses the best grade owned.
- Recipes are random drops (`DROP` in `game.js`): `manual` chance per won fight (+`pity` per fight without a drop), and a lower `autoPerHour`
  chance rolled when farming is claimed. Stage pools are `drops` on each stage.
- `cloud.js`: Sign in with Google (Firebase project `pumgoda`, named app `wildlight`) and cloud save in Firestore `userWildlight/{uid}`
  (fields `state` JSON string, `updatedAt`, `level`, `cleared`; rule in `firestore.rules`, **deployed manually**: see skill `deploy-firestore-rules`).
  Newest save wins; if both device and account have progress the first time, the player chooses. `cloud._test` lets tests swap in a fake backend.
