---
name: wildlight-add-content
description: Checklist for adding a hero, weapon, armor, hero skill, monster or stage to Wildlight Expedition, listing every file and table that must change together. Use when adding any new game content.
---

Always copy the closest existing entry and follow it; read the matching CLAUDE.md section. After adding, run `wildlight-balance` simulations and the checks in the `wildlight-expedition` skill (phone size, no 404s, old saves still load).

## Weapon (drop-only; every hero uses weapons of their own family)
1. `WEAPONS` in `game.js`: `name`, `fam`, `hits` (damage shares per attack), `int` (seconds between attacks), flags (`pierce`, `shield`, `healMult`, `splash`, `behind`, `ranged`, `pose` = nearest existing picture, `starter`), `desc`; its crit in `WEAPON_CRIT`.
2. Item icon `assets/items/<id>.png` (256x256). Hero pictures `assets/heroes/<hero>-<id>-idle.webp` and `-attack.webp`; add the id to `HERO_FILES` in `sprites.js` (until the pictures exist `pose` makes the game use the nearest one).
3. Movement: add it to `HEAVY` / `THRUST` / `QUICK` (or a special case) in `motion()` in `sprites.js`.
4. Drops: add `[id, weight]` to the `drops` of the stages that should give it (about 13% of won fights drop something; chips and Forge text are generated).
5. Sounds: synth entries in `SWING` / `IMPACT` (and `CAST` for ranged or magic) in `sfx.js` and a recorded mapping in `SMP` (and the weapon's swing group in `SWG`).
6. Docs: weapon list in CLAUDE.md.

## Armor
1. `ARMORS` in `game.js` (`name`, `tier`, `hp`, `dr`, `desc`; damage reduction is capped at 50%) and its `ARMOR_DROPS` entries per stage.
2. Icon `assets/items/<id>.png`; layers `assets/armor/<hero>-<id>-<idle|attack>.webp` for all 8 heroes (see `wildlight-art`); add the id to `ARMOR_TIERS` in `sprites.js`.
3. Saves: `newSave` / `hydrate` / `sanitizeArmor` already handle any id in `ARMOR_IDS`; check that an old save without it loads.

## Hero (the cast is 8 now: starter Milo + 7 hires)
1. `HERO` (`hire` cost, `name`, `role`, `family`, `start` weapon, `row` front/back, `tank`, `draws`, `hp`, `atk`, `blurb`), `HERO_ORDER`, `HERO_ACCENT`; a new weapon `family` also needs `FAMILY`, `FAMILY_PLURAL` and a `WIELDER` (derived from the hero list).
2. Pictures for each weapon (+ `assets/meta.json` entry, `HEIGHT`, `PHASE`, `HERO_FILES`, `IDLE` posture in `sprites.js`), armor layers, the plain fallback in `art.js drawHero`.
3. Two skills in `skills.js` (levels 3 and 10): `SKILLS`, `ICON`, `TAG`, `wants()` for Auto, the cast and its effects, bar colour from `HERO_ACCENT`; sounds `skill_*`.
4. Camp / party UI is generic; the party fights up to `MAX_PARTY` (4). Recheck `partyScale()` if the number of fighters changes.

## Hero skill
`SKILLS` (hero, name, lvl 3 or 10, cd, mult, desc), `ICON` (24x24 SVG paths), `TAG` (short effect shown on the button), the cast code + its effect kinds in `skills.js`, `wants()` conditions for Auto, `skill_<id>` sounds in `sfx.js`, the keys 1-8 follow the party order. Timers that persist (`B.haste`, `e.stun`, `h.guard`) are ticked in `skillsStep`.

## Monster or stage
- Monster: `MON` (`hp`, `armor`, `cd`, `wind`, `dmg`, `tgt` front/back, `scale`, `boss`, `charge`), pictures `assets/monsters/<id>-idle|attack.webp`, `assets/meta.json`, `REGION_ART` in `sprites.js` (so it loads with its region), sounds for its voice and attack in `sfx.js`.
- Stage: `STAGES` entry (`req`, `enemies` + `waves` for 1-2 heroes, `drops`, `dropGrade`, `farm`, `first` rewards, `power`, `rec`, `sky`), background `assets/bg/<id>.jpg`, `LAYOUT` for new enemy counts, `REGIONS` if it opens a region; run `wildlight-balance`.

## Always
Update `wildlight-expedition/CLAUDE.md` (the tables above are described there), the PR body, and `artUrls()` coverage for new files (sprites.js builds it from the tables, so new pictures normally appear automatically).
