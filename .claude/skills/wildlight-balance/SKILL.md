---
name: wildlight-balance
description: Check or tune Wildlight Expedition difficulty, drops and rewards by running stepped battle simulations in the browser. Use after changing hero stats, party scaling, monsters, skills, armor, drop rates or farming.
---

Balance is checked by simulation, not by feel. Numbers and targets live in `wildlight-expedition/CLAUDE.md` ("Balanced by simulation..."); update them when you change something.

## Targets
- A regular area leaves about **60% of the party's HP at the recommended level** (`STAGE[id].rec`); a boss fight lasts about 60 s; two or more levels under `rec` usually loses.
- The first two stages are winnable at every party size (1-4 heroes; `partyScale()` multiplies monster HP: 1 / 0.55 / 0.8 / 1 / 1.7 for 0 / 1 / 2 / 3 / 4 heroes; farming gathers `farmMult()`).
- Milo alone beats Pinewood Path; mixed 4-hero parties are about as hard as the old 3-hero party; tank-heavy parties are easier (the reward for hiring them).
- Weapon drop per win about 13% plus pity (`DROP.manual`, `DROP.pity`); farming rolls once per full hour away (`DROP.autoPerHour`, 12%). Armor shares the same roll (about a quarter of drops).
- Boss charges hit the whole party for `CHARGE_SOFT` (15%) of their damage; the Bog King (Toadking) is won at `rec` with about 75% health left.

## Run a simulation (browser pane visible, game loaded, `__wl` available)
```js
const w = __wl, party = ['milo','bren','tavi','iona'], sleep = ms => new Promise(r => setTimeout(r, ms));
async function sim(sid, lvAdd, runs = 4) {
  let wins = 0, hp = [];
  for (let i = 0; i < runs; i++) {
    w.save.hired = party.slice(); w.save.party = party.slice();
    for (const k of Object.keys(STAGE)) w.save.cleared[k] = true;            // every stage reachable
    for (const id of party) w.save.heroes[id].lvl = STAGE[sid].rec + lvAdd;   // weapons stay the starters unless you set them
    w.actions.fight(sid); let t = 0; while (!w.B && t++ < 40) await sleep(100);
    cancelAnimationFrame(w.B.raf); const B = w.B; B.t = B.intro; B.introDone = true;   // skills only run after the intro
    let n = 0; while (!B.over && n++ < 4000) { B.t += 0.05; step(0.05); }              // step() does not advance B.t
    if (B.enemies.every(e => e.dead)) wins++;
    hp.push(Math.round(100 * B.heroes.reduce((a, h) => a + h.hp, 0) / B.heroes.reduce((a, h) => a + h.maxHp, 0)));
    closeBattle();
  }
  return wins + '/' + runs + ' hp ' + hp.join(',');
}
```
- Use 4-6 runs per case, compare the same stage at `rec`, `rec - 1`, `rec - 2`, with and without the thing you changed (armor, a skill, a stat).
- To test one constant, temporarily change its `const` to `let` in `game.js`, reload, set it from the console between runs, then change it back and re-check `node --check`.
- Drops: call `rollManualDrop(STAGE[id])` thousands of times and count weapons vs armor; farming: `save.farm = {stage, since: Date.now() - 24*3600*1000}; claimFarm(true)` returns the found list.
- The sim has no weapon upgrades and uses the starter weapons, so late stages (Rimecrown and later) can show losses at `rec`; compare against a baseline run, do not read the absolute numbers.
- Clean up: `closeBattle()`, `localStorage.clear()`.
