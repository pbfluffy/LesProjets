# Wildlight Expedition

Semi-idle fantasy RPG (design brief: three heroes, Pinewood Trail stages, barrier-timed boss, 24 h offline farming).
**Static JS, no build step**: `index.html`, `style.css`, `game.js` (data, save, farming, battle sim, UI), `art.js`
(canvas art: `drawHero`, `drawMon`, `drawSword`, `drawBackground`; loaded before `game.js`, helpers prefixed `art`).

- Live path: `/wildlight-expedition/` (deployed by copying the folder in `deploy.yml`).
- Save: `localStorage["wildlight-expedition-v1"]`. It does not use the shared `theme`/`lang` keys.
- Dev: serve the folder with any static server and open `/wildlight-expedition/` (a `file://` page may block scripts).
- `window.__wl` exposes the save and actions in the console for playtesting.

## Weapon drops, grades and cloud save
- Weapons can NOT be bought. Each weapon is an item: `save.items[weapon][grade]` counts copies. Fights and farming drop Common copies from the
  stage's weighted `drops` table (`dropWeapon`). `MERGE_N` (3) copies of the same weapon and grade merge in the Forge into one of the next grade
  (`GRADES` in `game.js`: Common → Legendary, each with a damage/heal multiplier). A hero uses the best grade owned.
- Drop chances (`DROP` in `game.js`): `manual` per won fight (+`pity` per fight without a drop), and a lower `autoPerHour` rolled per farmed hour on claim.
- Old saves migrate in `hydrate()`: crafted weapons and known recipes both become one Common copy.
- Art loading: `sprites.js` publishes `window.spriteState` (`map` / `units`: loading, ready, failed). While `loading`, `game.js` shows a placeholder
  (never the drawn fallback art), and fights wait until the heroes and monsters are ready. Map art loads first and in parallel with `meta.json`.
- `cloud.js`: Sign in with Google (Firebase project `pumgoda`, named app `wildlight`) and cloud save in Firestore `userWildlight/{uid}`
  (fields `state` JSON string, `updatedAt`, `level`, `cleared`; rule in `firestore.rules`, **deployed manually**: see skill `deploy-firestore-rules`).
  Newest save wins; if both device and account have progress the first time, the player chooses. `cloud._test` lets tests swap in a fake backend.

## Resources and header
- Two resources: **Gold** and **Lumber** (`save.gold`, `save.lumber`). Old saves and cloud saves that still have `iron` are converted to lumber in `hydrate()`.
- The header chips are buttons: tapping one opens an info sheet (`RESOURCES` / `showResInfo` in `game.js`) that says how to get it and what it is for;
  the numbers come from the stage tables, so the sheet stays correct when rates change. Big amounts are abbreviated in the chip (`fmtShort`).
- The account is a round button in the top right (`#account-btn`, painted by `cloud.js`): signed out = tap to sign in with Google; signed in = your picture
  with a ring (green saved, amber saving, red error) and a small menu with the status and Sign out.
