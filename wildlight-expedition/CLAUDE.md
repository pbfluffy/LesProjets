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

## Test period tools
- `TEST_PERIOD` in `game.js` shows a "Test tools" card at the bottom of the Map tab with **Reset game data** (confirm dialog, then `resetGame()`).
  It replaces the save with a brand-new one and persists it, so a signed-in account is reset too (the newer timestamp wins on every device).
  Remove it for launch: set `TEST_PERIOD` to false, or delete the `test tools` block, the card in `renderMap` and the three `reset*` actions.
- **Build label** (test period): a small corner label shows `v <commit id> · <build time>` (`BUILD` / `parseBuild` in `game.js`). `deploy.yml` stamps the commit into the `?v=` of
  the script links and the Bangkok build time into `<meta name="build">`; locally it reads `v dev`. If the label is older than the latest deploy, you are looking at a cached copy.

## Home screen (Map tab) cards
- Order (`renderMap` in `game.js`): map, farming strip (only when the party is out; loot, glowing Claim), **Next up** = ONE big stage card for the first unlocked,
  uncleared stage (once everything is cleared: the farmed stage, headed "Farm & replay"), the daily hunt row, then every other stage as a compact row.
- Stage details that are not needed at a glance, like the possible weapon drops, are folded (`<details class="drops">`). Closed by default; which ones the player opened is
  kept in `uiOpen` across redraws. Drop tiers (Often / Sometimes / Rarely) come from the stage's drop weights.
- Stage cards use the painted `bg/<stage>.jpg` and the monsters' idle sprites (via `window.assetUrl` from `sprites.js`); until the art has loaded they show a colour gradient.

## Party and hiring
- A new game starts with ONE hero (Bren). Tavi and Iona are hired with gold in the Party tab (`HERO[id].hire`: 300 and 800). `save.party` lists the hired heroes; `party()` / `inParty()` /
  `partySize()` are the helpers. Saves from before hiring have no `party` and keep all three heroes (`hydrate()`); Reset game data starts a new solo game.
- Fights and farming scale with the party size so a small party is not punished: `partyScale()` multiplies monster HP (0.55 / 0.8 / 1), `encounterFor(stage)` picks smaller packs
  (`waves` on the stage, used for 1 or 2 heroes), and `farmMult()` gathers 0.6x / 0.8x / 1x. Checked by simulation: the first two stages are winnable at every size and the boss needs the barrier at every size.
- Party tab: party strip with slots, a card per hero (stats, level up, weapon family upgrade, folded "Change weapon"), then Recruit cards. Forge tab: weapons grouped by hero, merge-ready banner,
  copy pips, Equip button; weapons the player has not found are dimmed with where they drop.

## Result screens
- `stageWin()` / `bonusWin()` return a structured result (`gold`, `lumber`, `first`, `tower`, `unlock`, `drop`, `again`); `showResult()` turns it into the reward screen (`winHtml`) or the defeat screen (`loseHtml`).
- Win: 1-3 stars from how the party finished (`starRating`: someone fell = 1, all alive = 2, all alive and 60%+ HP = 3), the heroes with their remaining HP, reward tiles that count up (`animateCounts`),
  a highlighted new-weapon card with copy pips (and Open Forge when 3 copies can merge), unlock / watchtower banners, Back to the village and Fight again. Defeat: fallen heroes and up to two tips (`defeatTips`) with shortcut buttons.
- Animations respect `prefers-reduced-motion`. On short screens the card scrolls and its buttons stay pinned to the bottom.

## Item pictures and drop chances
- `assets/items/<weapon>.png` (256x256, transparent) are the weapon pictures, drawn by `itemIcon(w)` in the drop lists, Forge cards, party weapon list and the reward card. They load with the units art (`sprites.js`).
- The drop lists show the real chance per won fight: `dropRatePerWin()` (1 / expected wins until a drop, with the bad-luck bonus) x the weapon's weight in the stage table. Do not call these "often" / "rarely":
  a weapon with 30% of the drops still only drops about once in ten wins. Checked by simulating 100,000 wins per stage.

## Regions, areas and power
- 13 stages in 4 regions (`REGIONS` / `STAGES` in `game.js`): Pinewood Vale (3, boss Boar King), Mirewood (3, Toadking), Frostpeak (3, Rimecrown), Emberwaste (4, final boss Storm Drake). Each region has a painted
  map (`assets/map/`), its own watchtower (lit by the region's boss) and unlocks when the previous region's boss is cleared. The home screen shows one region at a time: chips switch regions, the Roads list is grouped per region (folded `<details class="region">`).
- The block between `const MON = {` and `const LAYOUT = {` (monsters, regions, stages) was generated from a table; edit it by hand or regenerate, but keep the shape (`stage.power = {hp, dmg, arm}`, `rec`, `first`, `drops`, `dropGrade`, `farm`, `bg`).
- Difficulty: monster HP x `power.hp` x `partyScale()`, damage x `power.dmg`, armor x `power.arm` (a hit is never below 25% of raw). `rec` is the recommended party level; the stage card shows it next to the party's level (`recBadge`).
  Balanced by simulation: a regular area leaves about 60% party HP at `rec`, bosses are about 60 s fights; 2+ levels under `rec` usually loses. Bosses use `charge` telegraphs that the barrier answers.
- Weapon drops get better with the region (`dropGrade`: see `STAGES`), so merging copies stays useful.
- Art loads per region and lazily: `window.ensureRegion(id)` in `sprites.js` fetches that region's monsters, backgrounds and map; `regionArt[id]` is idle / loading / ready, and screens show `Loading the area…` until it is ready.
  Monster files can be `.webp` (`ext` in `assets/meta.json`, alongside the alignment data `frameW/frameH/feetX/feetY/figureH`); the figure's on-screen height comes from the `HEIGHT` table in `sprites.js`.

## Installable app (PWA)
- `manifest.webmanifest` (scope `/wildlight-expedition/`), icons in `assets/pwa/` (`icon-192/512`, `icon-512-maskable`, `apple-touch-icon`, plus `thumbnail.jpg` 1200x630 used for the `og:image` link preview), all painted with Codex.
- `sw.js`: page = network first (offline: saved copy); `?v=` files = cache first; unversioned files = network first. `VERSION` is stamped with the commit by `deploy.yml` (a new deploy clears the old `wildlight-*` cache). With `VERSION = 'dev'` (local play) nothing is served from the cache while online.
- `pwa.js`: registers the worker, sends it `window.artUrls()` (every picture, from `sprites.js`) when idle so all areas work offline, and `window.pwaCard()` draws the dismissible "Install the game" card on the Map tab (Install button via `beforeinstallprompt`; "Add to Home Screen" steps on iOS; hidden when already installed).
- Cloudflare must not edge-cache `sw.js` (the site's existing "/sw.js" bypass rule covers it).

## Screen sizes (phone, tablet, PC)
- The phone layout is the base; everything else is `@media` at the end of `style.css`. Map / Party / Forge markup is grouped for it: `.vgrid > .vcol > .vg.oN` (Map) and `.cgrid` (card lists). On a phone those wrappers are `display:contents`
  (and `.vg.oN` keep the phone order with `order`), so the phone layout is unchanged.
- 720px and up (tablet): the column grows to 720px, card lists become 2 columns, the battle arena grows (`--bw`, limited by the window height so the barrier stays on screen).
- 1000px and up (PC): the tab bar moves into the header (centered), the Map becomes two columns (map, chips and Next up on the left; farm strip, daily hunt, install card and Roads on the right), card lists use 3 columns.
- Mouse devices (`hover:hover` and `pointer:fine`): hover feedback on buttons/cards and the keyboard hint in battle. Keys: Space = barrier, Esc = retreat (or close a dialog), 1 / 2 / 3 = Map / Party / Forge.
- Check changes at 320, 375, 768, 1000 and 1280 px wide.

## Repeat fights and the farm log
- **∞ Repeat** (button in the battle header, or the R key): for stage fights only (`spec.repeatable`; not the daily hunt). After a win the rewards are paid (`stageWin`), a line in `#runlog` shows what the streak has earned
  (`run` = wins, gold, lumber, weapons) and the next fight starts after 1.5 s (`restartBattle`). It stops on a defeat, on Retreat / switching it off, and on a first clear, a relit watchtower or a new area (full result screen).
  Retreat or switching off shows the "Repeat run" summary (`showRunSummary`). `B.resolved` makes sure a fight pays out only once. Wins also get a "∞ Repeat" button on the normal victory screen.
- **Farm log**: every claim or switch of the farming spot with something to collect is saved in `save.farmLog` (last 30: time, stage, minutes out, gold, lumber, weapons found + their grade; `logFarm`, synced with the save).
  The Map tab shows it as a folded "Farm log" card under the farm strip (`farmLogCard`), and Claim opens a "Farm report" dialog (`showFarmReport`).

## Weapons and monsters (round 2)
- **15 weapons** (`WEAPONS` in `game.js`): the 5 first ones plus 10 that only drop: falchion, saber, rapier (ignores 60% armor), sword & shield (`buckler`, wielder takes 25% less damage), hawk bow, longbow,
  crossbow (ignores 70% armor), heartwood staff (heals x1.5), storm staff (bolts splash 50%), frost wand. Flags: `pierce`, `shield`, `healMult`, `splash` (also for ranged), plus `pose` = which existing hero picture
  is drawn in battle (new weapons borrow the sword / twin-swords pose; Tavi and Iona have one pose each). Drop tables per stage are in `STAGES` (`drops`). Icons: `assets/items/<id>.png`.
- **22 monsters**: 8 new (Thicket Hornet, Barkbear, Mire Adder, Mist Hag, Rime Sprite, Snow Yeti, Cinder Bat, Obsidian Sentinel), each a stand-in for an existing role with similar stats, so stage balance is
  unchanged (checked old pack vs new pack by simulation). They replace a monster in the packs of path, hollow, mirewood, causeway, frostfall, glimmer, cinder, quarry and magmagate. New monsters are WebP;
  `monExt()` in `sprites.js` knows that before `meta.json` has loaded. Add a monster: `MON`, `HEIGHT` and `REGION_ART` in `sprites.js`, files in `assets/monsters/`, an entry in `assets/meta.json`.

## Auto-update (like Cloudlingo)
- Every deploy writes `version.json` (`{"v":"<commit>"}`, see `deploy.yml`). `pwa.js` fetches it (no-store, `?t=`) 3 s after load, every time the app becomes visible again and every 15 minutes. If it names a different build than the
  `?v=` of the running `pwa.js`, the page shows the "Updating to the newest version…" bar and reloads after 1.2 s. It never reloads during a fight: it waits (checks every 4 s) until the player is back in the village.
  At most one reload per new version per tab (`sessionStorage` key `wl-update`), in case a stale cache serves the old page. Does nothing on `?v=dev` (local play) or offline. `sw.js` never caches `version.json`.
- Test locally: copy the game to a folder, replace `?v=dev` in `index.html` with an old id, add a `version.json` with another id and serve it (`node tools/serve.js 8124`).

## Hero pictures per weapon
- Every weapon has its own picture of its hero: `assets/heroes/<hero>-<weapon>-idle|attack` (the first five are PNG, the 10 newer ones WebP; `HERO_FILES` / `heroPath()` in `sprites.js`). All frames of a hero share one canvas
  (Bren 812x512, Tavi 526x512, Iona 606x512, feet at 50% / 97.46%), so a new weapon only needs two matching pictures and an entry in `HERO_FILES`. If a picture is missing, the weapon's `pose` (nearest older weapon) is drawn.

## Critical hits
- Every hero hit and every normal monster hit can crit (`CRIT`, `WEAPON_CRIT`, `MON_CRIT` near `MON` in `game.js`). Hero crit chance = the weapon's `crit` + 1% per grade of the best copy (`heroStats().crit`, shown on the
  hero card and in the weapon lists), damage x1.7; monsters crit 4-10% for x1.5, never on a boss's telegraphed charge. Rolled per hit (each slash of a saber, splash hits too). Crits show a big gold (hero) or red (monster) number
  with a "!" (`floater(..., big)`, `art.js` bounce). Checked by simulation: balance is unchanged (HP left within a few points with crits on or off).
- Losing a fight always ends a Repeat run (`showResult`): the defeat screen says "∞ Repeat stopped" and shows the run's totals.

## Fight intro and end graphics
- `#arena` wraps the battle canvas with two overlays: `#arena-fx` (banners, sparks, reward chips) and `#curtain` (fade to / from black). Code: `introUi`, `introStep`, `outroUi`, `rewardsUi`, `fxAdd`, `fxClear`, `curtain` in `game.js`
  (block "fight intro / end graphics"); CSS at the end of `style.css`. They are plain DOM + CSS animations; `prefers-reduced-motion` turns the motion off.
- Start of every fight: fade in from black, a "Fight!" banner (in a repeat run "Fight N" + the stage name), the heroes walk in from the left and the monsters from the right for `INTRO` = 0.85 s while nobody attacks
  (`step()` is skipped until `B.t >= B.intro`; the sims call `step()` directly so they are not affected).
- End of a fight: a "VICTORY!" banner with the 1-3 stars and a spark burst (or "Defeated"). In a repeat run the win then shows reward chips (gold, lumber, a new weapon with its picture), fades to black at ~1 s and the next fight
  starts at ~1.4 s. Normal results (first clear, defeat, Repeat off) clear the overlay and show the result screen as before. `.arena` has the same width rules as the barrier (`--bw` on tablet / PC).

## Why an installed copy might not update (and what is done about it)
- An open copy that is "busy" never reloads. Busy = in a fight. Between two fights of a Repeat run and a result screen that has been open 45 s are safe moments (`busy()` in `pwa.js`): everything won is already paid and saved.
  `showResult()` calls `window.wlOnSafePoint()` in the repeat pause, so a waiting update installs there; the run is picked up again after the reload (`sessionStorage` `wl-resume` = stage id,
  `window.__wlResume`, boot code at the end of `game.js`). While a fight is in progress a "New version ready · Update now" pill shows (`.update-pill`); tapping it reloads at once (only the fight in progress is lost).
- The version check runs every 5 minutes (and 3 s after load, and whenever the app becomes visible).
- `sw.js` is registered as `sw.js?v=<commit>` (not on `?v=dev`), so a CDN copy of `sw.js` (Cloudflare caches it for up to 4 h unless the "bypass /sw.js" Cache Rule exists) can never hide a new deploy.
  A page load always revalidates `index.html` (`fetch(url, {cache:'no-cache'})` in the worker), never an up-to-10-minute-old browser cache copy.
- Copies from before the auto-update (PR with `version.json`) have no checker: close and reopen the installed app once.

## Sound effects
- Sound palette (matches the painted storybook style, not 8-bit beeps): wooden taps, plucked harp / lute strings (`pluck`), bronze and crystal bells (`bell`, `chime`), steel and leather for gear and fights (`steel`, `swish`), a taiko drum and a brass horn for drama (`taiko`, `horn`) and a breathy flute (`flute`); the notes use the C major pentatonic scale like the village music. Strings, bells and metal are additive voices: sine partials with their own decay (`partials`).
- `sfx.js` synthesises every sound with the Web Audio API (oscillators + filtered noise through a compressor): no audio files, works offline, ~31 sounds (`SOUNDS` table). `snd('name')` in `game.js` plays one and never throws;
  nothing plays until the first tap or key press (browser autoplay rule), and the engine is suspended while the tab is hidden. Fast bursts are throttled per sound (`GAP`).
- Hooks: UI (every button taps unless its action has its own sound: `OWN_SOUND`), tabs, hire, level up, weapon upgrade, equip, merge (anvil), farm, claim / reward chips (coins), weapon drop, folding lists (tick),
  fights (horn at the start, slash / arrow / bolt, hit, crit, monster death pop, hurt, hurt crit, barrier, block, heal, boss-charge warning), results (victory fanfare + a ding per star, defeat, first-clear / watchtower fanfare).
- The header speaker button (`#sound-btn`, key `M`) mutes everything; the choice is kept in `localStorage` `wl-sound`. `sfx.level()` returns the current loudness (used to test that a sound really plays).
- Add a sound: a function in `SOUNDS` (`tone()` / `noise()` / `notes()` helpers), then `snd('name')` where it happens.

## Background music
- `music.js`: three themes composed in code and played with Web Audio (no audio files), one step sequencer per theme that schedules ~0.3 s ahead (`pump`): **village** (A minor pentatonic, plucked arpeggios, warm pad, a wandering melody),
  **fight** (142 bpm, drums, pumping bass, riffs in A minor) and **boss** (112 bpm, D minor, brass stabs, toms, tense strings). Add a theme: an object with `bpm`, `spb` (steps per beat), `gain` and `step(state, n, time, stepDur)` in `THEMES`.
- API: `music.set('village'|'fight'|'boss'|null)` crossfades, `music.duck(seconds)` lowers it under a fanfare, `music.sync()` applies the sound mode. `game.js` sets village at boot and on leaving a fight, fight / boss in `startBattle`
  (boss = a boss monster in the pack), ducks on victory, stops on defeat. A repeat run keeps the fight theme going between fights.
- The header speaker button now cycles three modes (`sfx.toggle()`, key `M`, saved in `localStorage` `wl-sound` as `all` / `fx` / `off`): music + effects, effects only, off. Music only starts after the first tap (autoplay rule)
  and pauses while the tab is hidden.

## Fight sound layers
- Fight sounds are layered like real impacts: a sharp transient (`crack`), a low body (`thump`), a gritty `crunch` and, for big hits, a sub boom, all routed through a soft-clipping saturator (`punch: true` -> `drive()`) so they hit hard.
  Hits differ by weapon (`hitEnemy(..., kind)`: `hit` = blade, `hitarrow`, `hitmagic`); melee monsters snarl as they wind up (`growl`, deeper for bigger monsters: the argument is the monster scale), monsters die with a thud and a groan (`pop`, also sized),
  the boss charge warning is a roar plus taiko (`warn`). `snd(name, arg)` forwards one argument to the sound.
