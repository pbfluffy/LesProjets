# Steam screenshots: shot list and how to stage them

Steam wants **at least 5 screenshots, 1920x1080** (16:9, PNG or JPG, no UI mock-ups, no text overlays that are not in the game). The first four are the ones shown on the store page and in search results, so they carry the sale. Eight are captured in `steam/screenshots/` (generated with the script below from the running game, **not** edited).

| # | File | What it shows | Why it sells |
|---|---|---|---|
| 1 | `01-map-danger-meter.png` | Map tab, Emberwaste: painted map with signposts, region chips, the **adventure card with the Danger meter** ("Fair fight", tick at the recommended level), first-clear reward, loot to hunt, party portraits; camp and daily bounty on the right | The whole loop in one image: where to go, how risky it is, what you win |
| 2 | `02-boss-fight-skills.png` | **Storm Drake boss fight**: Bren in plate, Maren in chainmail, Iona and Tavi; Storm Call lightning striking the boss, skill buttons with cooldowns under the scene | Painted art, armor on the heroes, skills: reads as a real RPG |
| 3 | `03-boss-telegraph.png` | **Warlord's Throne** at the moment of the red banner "Orc Warlord is about to charge!", Enraged brute, Bulwark rings | Boss tactics: you can see there is something to react to |
| 4 | `04-hero-sheet-armor.png` | **Hero sheet** of Maren (lancer): stats, Epic spear, Epic chainmail with HP and damage bonus, Level up / Upgrade buttons, party and camp behind it | Depth: eight heroes, gear, grades |
| 5 | `05-forge-merge.png` | **Forge**: "12 merges ready!", Merge all, filter chips per hero, weapon tiles with Merge badges, the armor sheet "Rare x3, Merge to Epic", a Legendary plate armor worn by Bren, Put on row | The loot loop: 3 copies make the next grade |
| 6 | `06-goblin-mines-fight.png` | **Glowcap Mines** fight: Bren with twin swords, Rook, Iona, Elric (armored in plate, chainmail, leather) vs goblin scrappers, archer and shaman; Fireball and Whirlwind banners | A second region and a second cast: variety and colour |
| 7 | `07-new-region-orc-highlands.png` | **A new region**: the Orc Highlands map (war camp, skull banners, signposts 17-19), region chips with checkmarks for the cleared regions, Warlord's Throne card with war-cry text and Legendary loot | Scope: six regions; the end of the road teased |
| 8 | `08-farm-report.png` | **Offline farming**: the Farm report after 24 hours away (gold, lumber, Epic weapon and Epic plate armor found), Farm log behind | The idle hook, explained in one frame |

Order on the store page: **2, 1, 3, 5, 6, 4, 7, 8** (action first, then the loop, then depth). Steam shows the first 4 in the page's top block, so open with the boss fight.
Use the same images with a 2-3 word caption in the trailer / on social (see `trailer-plan.md`); do not add captions to the screenshots themselves.

**Note on the desktop battle view:** at 1920x1080 the arena is the 960 px wide column centred in the window, with empty dark space above and to the sides (the game is phone-first; the PC layout widens the column to 960 px at most). The shots are honest captures. If the page looks too empty next to other Steam games, the strongest fix is a wider desktop battle layout in the Steam build (a game change, out of scope for this kit). Cropping to 16:9 around the arena (for example 1440x810 scaled up) is NOT allowed to pretend it is the real window; you may crop for social media, not for the Steam gallery.

---

## How the shots are made (reproducible)

`steam/tools/capture-screenshots.js` starts a headless Chrome (or Edge) with a throw-away profile (your own save is never touched), sets the viewport to **1920x1080 at device scale 1** (the "capture from the preview browser at 1920x1080" step, over the DevTools protocol so the PNG is exactly 1920x1080), builds a save for each shot with `window.__wl`, and saves a PNG.

```powershell
node steam/tools/capture-screenshots.js            # all eight shots into steam/screenshots/
node steam/tools/capture-screenshots.js 3 6        # only shots 3 and 6
node steam/tools/capture-screenshots.js --base http://localhost:5178/wildlight-expedition/ 1
```

Needs the game to be served (`wildlight` preview on port 8123, or `admin-static` on 5178 in the repo) and Node 22+. It hides the test-period tools card, the "Install the game" card, the build label, the toast and the account button with injected CSS (nothing in the game is changed); hide the same things in the Steam build.

### The staging recipe (what the script does for every shot)

In the console of the running game (or `javascript_tool` in the preview browser at 1920x1080: `resize_window` width 1920, height 1080):

```js
resetGame();                                  // brand-new save (global of game.js)
const s = __wl.save;
// 1. progress: clear every stage up to one stage id, lighting the watchtowers on the way
let on = true;
for (const st of STAGES) { if (!on) break; s.cleared[st.id] = true; if (st.first && st.first.tower) s.towers[st.id] = true; if (st.id === 'magmagate') on = false; }
// 2. heroes: hire everybody, pick the party (max 4), levels, weapons
s.hired = ['milo','bren','tavi','iona','rook','elric','maren','tobin'];
s.party = ['bren','tavi','iona','maren'];
for (const id of s.hired) s.heroes[id].lvl = 24;
// 3. loot: items[weapon][grade] and armors[armor][grade] hold copies; grade 0..4 = Common..Legendary
s.items.sword[3] = 1; s.items.twin[2] = 3; s.armors.platearmor[2] = 3;
s.heroes.bren.weapon = 'sword';
s.heroes.bren.armor = 'platearmor'; s.heroes.bren.armorG = 3; s.armors.platearmor[3] = 1;   // worn copies must exist
// 4. money and farming: since = when the party left
s.gold = 48210; s.lumber = 3640;
s.farm = { stage: 'quarry', since: Date.now() - 24 * 3600e3 };
s.tab = 'map';
__wl.persist(true);
location.reload();                           // so the game reads the save like a real start
```

Then per shot (wait until `spriteState.units === 'ready'` after each reload; clear `window.scrollTo(0, 0)` before the capture):

1. **Map with the Danger meter**: `upTo` = `magmagate`, party Bren / Tavi / Iona / Maren at level 24-25 (recommended for Skyreach Spire is 25, so the meter reads "Fair fight", tick just right of the bar's end), Bren in plate (grade 3), Maren in chainmail, farm at `quarry` for 3 h. No other step: the adventure card shows the next stage by default. (Level 21 gives "Risky" with the one-tap Level up row, also worth keeping as a variant.)
2. **Boss fight with a skill**: same save at level 27, `__wl.actions.fight('skyreach')`, wait until `__wl.B.t > __wl.B.intro + 0.3`, `setAutoSkill(false)`, wait 9 s (cooldowns start at 30%), `castSkill('storm')`, capture 0.6 s later while the lightning and the "Storm Call!" banner are up. Drive the loop yourself if the pane is hidden (see the `wildlight-expedition` skill).
3. **Boss telegraph**: `upTo` = `warcamp`, party Bren / Maren / Elric / Tavi at level 42 with late-game gear (plate on Bren and Maren, chainmail on Tavi and Elric), `actions.fight('throne')`, Auto skills on, poll until `__wl.B.enemies.some(e => !e.dead && e.state === 'wind' && e.kind === 'charge')` (the "about to charge" banner and the red lane appear, about 6-9 s in), capture 0.3 s later.
4. **Hero sheet with armor**: shot 1's save with `s.tab = 'party'`, then `__wl.actions.heroopen('maren')` (Maren in chainmail, Epic spear). Variant: `heroopen('bren')` for plate armor.
5. **Forge merge**: shot 1's save plus extra copies so many tiles show Merge badges (`items`: sword 3x1... see the script), `s.tab = 'forge'`, `__wl.actions.forgeopen('platearmor')` for the sheet with "Merge to Epic" and the Put on row. `__wl.actions.mergeall()` would merge everything: do not call it before the shot.
6. **A second region in a fight**: `upTo` = `scrapheap`, party Bren (twin swords) / Rook (twin daggers) / Iona (storm staff) / Elric (grimoire) at level 32 in different armors, `actions.fight('gobmines')`, wait 5 s, capture mid-fight (skills Auto on, the banners show Fireball and Whirlwind).
7. **New region**: `upTo` = `kinghall`, level 36 party, `__wl.actions.region('highlands')`, wait 3.5 s for the map art to load, scroll to the top.
8. **Farm report**: shot 1's save with `farm = { stage: 'quarry', since: Date.now() - 24*3600e3 }`, `__wl.actions.claim()` opens the Farm report dialog; capture.

Clear test state when done: `localStorage.clear(); sessionStorage.clear()` (the script uses its own profile and does not need this).

---

## Quality notes and what to redo before launch

- **Looked at all eight at full size.** They are clean, sharp, correctly 1920x1080 and show no test UI. Weak spots: the "Storm Call!" and "Fireball!" banners are cut off at the arena's left edge in the game itself; the large empty areas above the arena (see the note above); the Farm report shows about +1,066,528 gold for a 24 h trip in Ashen Quarry at level 24, which looks like an inflated economy next to the 960-gold level-up price: **check the farm rates in the balance before the final shot** and re-run `node steam/tools/capture-screenshots.js 8`.
- Re-run the whole script after every visual change in the game; it takes about 2 minutes.
- The Steam build is a desktop wrapper (see `launch-checklist.md`): capture from the wrapper at 1920x1080 for the final set, so that no browser chrome or web-only cards can slip in.
- Do not show the "Test tools" card, the "v dev" label, the account / Google button or the web "Install the game" card in any screenshot or trailer.
- Steam cares about honesty: screenshots must come from the game itself. These do.
