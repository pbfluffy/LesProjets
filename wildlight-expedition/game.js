'use strict';
/* =====================================================================
   Wildlight Expedition – first playable version
   Heroes: Bren, Tavi, Iona · Stages: Pinewood Path, Ironroot Hollow,
   Thornback Crossing · Weapons: standard sword, twin swords, greatsword,
   hunting bow, wooden staff.
   ===================================================================== */

/* ---------------------------- data ---------------------------------- */
const HERO = {
  bren: { hire: 0, name: 'Bren Alder', role: 'Guardian · Front line', family: 'sword', hp: 120, atk: 8, x: 135, y: 184,
          blurb: 'Stands in front and takes most melee hits. Braces low when the party barrier goes up.' },
  tavi: { hire: 300, name: 'Tavi Reed', role: 'Archer · Ranged damage', family: 'bow', hp: 70, atk: 7, x: 72, y: 152,
          blurb: 'Fires from behind Bren. A quick backward lean before each shot.' },
  iona: { hire: 800, name: 'Iona Moss', role: 'Herbalist · Healing', family: 'staff', hp: 70, atk: 4, x: 62, y: 214,
          blurb: 'Casts bolts from the back and heals the weakest ally. A ring of petals shows who was healed.' },
};
const HERO_ORDER = ['bren', 'tavi', 'iona'];
const FAMILY = { sword: 'Sword', bow: 'Bow', staff: 'Staff' };
const FAMILY_PLURAL = { sword: 'Swords', bow: 'Bows', staff: 'Staves' };

const WEAPONS = {
  sword: { name: 'Standard sword', fam: 'sword', hits: [1], int: 1.0, starter: true,
           desc: 'Steady attacks with balanced speed and damage.' },
  twin:  { name: 'Twin swords', fam: 'sword', hits: [0.55, 0.55], int: 0.85,
           desc: 'Two quick strikes per attack against one monster.' },
  great: { name: 'Greatsword', fam: 'sword', hits: [1.7], int: 1.9, splash: 0.6,
           desc: 'Slow, heavy swings that also hit nearby monsters.' },
  bow:   { name: 'Hunting bow', fam: 'bow', hits: [1], int: 1.0, ranged: true, starter: true,
           desc: 'Steady ranged attacks against one monster.' },
  staff: { name: 'Wooden staff', fam: 'staff', hits: [1], int: 1.2, ranged: true, heal: true, starter: true,
           desc: 'Casts bolts and periodically heals the weakest ally.' },
};

const MON = {
  brushfang: { name: 'Brushfang', role: 'Pack melee', hp: 28, armor: 0, cd: 2.2, wind: 0.6, dmg: 6, tgt: 'front', scale: 1 },
  beetle: { name: 'Rustshell Beetle', role: 'Armored melee', hp: 80, armor: 3, cd: 2.4, wind: 0.5, dmg: 9, tgt: 'front', scale: 1 },
  spitter: { name: 'Pinecap Spitter', role: 'Ranged attacker', hp: 45, armor: 0, cd: 3, wind: 0.8, dmg: 10, tgt: 'back', scale: 1 },
  boar: { name: 'Thornback Boar', role: 'Stage boss', hp: 650, armor: 0, cd: 2.6, wind: 0.4, dmg: 7, tgt: 'front', scale: 1.5, boss: true, charge: { first: 6, every: 8, wind: 1.4, dmg: 55 } },
  bogtoad: { name: 'Bog Toad', role: 'Pack melee', hp: 70, armor: 1, cd: 2.5, wind: 0.55, dmg: 8, tgt: 'front', scale: 1.05 },
  reedwisp: { name: 'Reed Wisp', role: 'Ranged attacker', hp: 40, armor: 0, cd: 3, wind: 0.8, dmg: 9, tgt: 'back', scale: 1 },
  mossturtle: { name: 'Moss-shell Turtle', role: 'Armored melee', hp: 110, armor: 3, cd: 2.8, wind: 0.6, dmg: 10, tgt: 'front', scale: 1.1 },
  bogking: { name: 'Bog King', role: 'Stage boss', hp: 800, armor: 1, cd: 2.6, wind: 0.45, dmg: 12, tgt: 'front', scale: 1.6, boss: true, charge: { first: 6, every: 8, wind: 1.4, dmg: 55 } },
  frostwolf: { name: 'Frost Wolf', role: 'Pack melee', hp: 36, armor: 0, cd: 2, wind: 0.55, dmg: 7, tgt: 'front', scale: 1 },
  icegolem: { name: 'Ice Golem', role: 'Armored melee', hp: 160, armor: 4, cd: 3.2, wind: 0.7, dmg: 13, tgt: 'front', scale: 1.3 },
  frostgiant: { name: 'Frost Giant', role: 'Stage boss', hp: 1000, armor: 2, cd: 2.8, wind: 0.5, dmg: 14, tgt: 'front', scale: 1.75, boss: true, charge: { first: 6, every: 8, wind: 1.3, dmg: 60 } },
  emberimp: { name: 'Ember Imp', role: 'Ranged attacker', hp: 42, armor: 0, cd: 2.8, wind: 0.8, dmg: 10, tgt: 'back', scale: 0.95 },
  magmacrab: { name: 'Magma Crab', role: 'Armored melee', hp: 120, armor: 4, cd: 2.6, wind: 0.6, dmg: 11, tgt: 'front', scale: 1.15 },
  stormdrake: { name: 'Storm Drake', role: 'Stage boss', hp: 1200, armor: 1, cd: 2.4, wind: 0.45, dmg: 16, tgt: 'front', scale: 1.8, boss: true, charge: { first: 6, every: 8, wind: 1.3, dmg: 58 } },
};

/* Regions: each has its own painted map. pins are the stage signposts (x, y as fractions of the map), towerPos is where
   the boss's watchtower stands. A region opens when the previous region's boss is beaten. */
const REGIONS = [
  { id: 'vale', name: 'Pinewood Vale', stages: ['path', 'hollow', 'crossing'], tower: 'crossing', map: 'map/map.jpg',
    pins: [[0.25, 0.72], [0.458, 0.667], [0.661, 0.6]], towerPos: [0.889, 0.367], home: 'Village' },
  { id: 'mire', name: 'Mirewood', stages: ['mirewood', 'causeway', 'toadking'], tower: 'toadking', map: 'map/mire.jpg',
    pins: [[0.22, 0.72], [0.47, 0.63], [0.70, 0.55]], towerPos: [0.90, 0.38] },
  { id: 'frost', name: 'Frostpeak', stages: ['frostfall', 'glimmer', 'rimecrown'], tower: 'rimecrown', map: 'map/frost.jpg',
    pins: [[0.20, 0.70], [0.45, 0.62], [0.70, 0.50]], towerPos: [0.90, 0.32] },
  { id: 'ember', name: 'Emberwaste', stages: ['cinder', 'quarry', 'magmagate', 'skyreach'], tower: 'skyreach', map: 'map/ember.jpg',
    pins: [[0.14, 0.74], [0.34, 0.64], [0.55, 0.56], [0.76, 0.46]], towerPos: [0.92, 0.34] },
];

/* Stage power = monster HP and damage multipliers (armor scales with damage); rec = the hero level the area is balanced for
   (a party with that level, a weapon grade that fits the region, and good barrier timing wins comfortably). */
const STAGES = [
  { id: 'path', name: 'Pinewood Path', region: 'vale', req: null, enemies: ['brushfang', 'brushfang', 'brushfang', 'brushfang'],
    waves: { 1: ['brushfang', 'brushfang'], 2: ['brushfang', 'brushfang', 'brushfang'] },      // fewer monsters for a party of 1 or 2
    blurb: 'A pack of Brushfangs. Best for farming gold.', farm: { gold: 4, lumber: 0.3 }, best: 'Gold',
    first: { gold: 60, lumber: 5 }, drops: [['sword', 3], ['bow', 3], ['staff', 3], ['twin', 1]], dropGrade: 0, repeat: { gold: 12, lumber: 0 }, sky: ['#2d5a45', '#14301f'],
    power: { hp: 1, dmg: 1 }, rec: 1 },
  { id: 'hollow', name: 'Ironroot Hollow', region: 'vale', req: 'path', enemies: ['beetle', 'beetle', 'spitter'],
    waves: { 1: ['beetle', 'spitter'] },
    blurb: 'Rustshell Beetles screen a Pinecap Spitter. Best for farming lumber.', farm: { gold: 1.5, lumber: 1.5 }, best: 'Lumber',
    first: { gold: 120, lumber: 10 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 1.5]], dropGrade: 0, repeat: { gold: 15, lumber: 1 }, sky: ['#27495a', '#102430'],
    power: { hp: 1, dmg: 1 }, rec: 2 },
  { id: 'crossing', name: 'Thornback Crossing', region: 'vale', req: 'hollow', enemies: ['boar'], boss: true,
    blurb: 'The Thornback Boar fights alone. Defeat it to relight the watchtower and open the next road.',
    farm: { gold: 6, lumber: 2.5 }, best: 'Gold + lumber',
    first: { gold: 300, lumber: 20, tower: true }, drops: [['twin', 2], ['great', 2], ['sword', 1], ['bow', 1], ['staff', 1]], dropGrade: 0, repeat: { gold: 40, lumber: 3 }, sky: ['#5a4a3a', '#2a1f17'],
    power: { hp: 1, dmg: 1 }, rec: 4 },
  { id: 'mirewood', name: 'Mirewood Edge', region: 'mire', req: 'crossing', enemies: ['bogtoad','bogtoad','bogtoad','reedwisp'],
    blurb: 'Bog Toads lurk in the reeds while a Reed Wisp lights their way.', farm: { gold: 7, lumber: 4.4 }, best: 'Lumber',
    first: { gold: 465, lumber: 30 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 1.5]], dropGrade: 1, repeat: { gold: 60, lumber: 4 }, sky: ['#2f5a48','#12281f'],
    power: { hp: 3.18, dmg: 2.3, arm: 1.55 }, rec: 6 },
  { id: 'causeway', name: 'Sunken Causeway', region: 'mire', req: 'mirewood', enemies: ['mossturtle','mossturtle','reedwisp','reedwisp'],
    blurb: 'Moss-shell Turtles guard a drowned stone road, with Reed Wisps drifting above it.', farm: { gold: 15.8, lumber: 3.9 }, best: 'Gold',
    first: { gold: 721, lumber: 45 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 2]], dropGrade: 1, repeat: { gold: 90, lumber: 6 }, sky: ['#31584a','#14291f'],
    power: { hp: 3.27, dmg: 2.1, arm: 2.01 }, rec: 8 },
  { id: 'toadking', name: 'Toadking\'s Hollow', region: 'mire', req: 'causeway', enemies: ['bogking'], boss: true,
    blurb: 'The Bog King squats on his root throne. Defeat him to relight the Mirewood watchtower.', farm: { gold: 18.3, lumber: 6.9 }, best: 'Gold + lumber',
    first: { gold: 2234, lumber: 135, tower: true }, drops: [['sword', 1], ['bow', 1.5], ['staff', 1.5], ['twin', 2], ['great', 2.5]], dropGrade: 1, repeat: { gold: 135, lumber: 8 }, sky: ['#3a4a2c','#17200f'],
    power: { hp: 3.63, dmg: 2.08, arm: 2.27 }, rec: 10 },
  { id: 'frostfall', name: 'Frostfall Pass', region: 'frost', req: 'toadking', enemies: ['frostwolf','frostwolf','frostwolf','frostwolf'],
    blurb: 'A Frost Wolf pack hunts through the snowy mountain pass.', farm: { gold: 33.2, lumber: 7.7 }, best: 'Gold',
    first: { gold: 1732, lumber: 101 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 2]], dropGrade: 2, repeat: { gold: 203, lumber: 12 }, sky: ['#3f5f86','#16243a'],
    power: { hp: 9.37, dmg: 4.45, arm: 3.41 }, rec: 12 },
  { id: 'glimmer', name: 'Glimmer Cavern', region: 'frost', req: 'frostfall', enemies: ['icegolem','icegolem','frostwolf'],
    blurb: 'Ice Golems stand guard among glowing crystals, with a Frost Wolf at their heels.', farm: { gold: 30.8, lumber: 16.8 }, best: 'Lumber',
    first: { gold: 2684, lumber: 152 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2.5], ['great', 2]], dropGrade: 2, repeat: { gold: 304, lumber: 16 }, sky: ['#2c4e86','#101a3a'],
    power: { hp: 6.62, dmg: 3.15, arm: 3.77 }, rec: 14 },
  { id: 'rimecrown', name: 'Rimecrown Summit', region: 'frost', req: 'glimmer', enemies: ['frostgiant'], boss: true,
    blurb: 'The Frost Giant rules the frozen peak. Defeat him to relight the Frostpeak watchtower.', farm: { gold: 55.8, lumber: 18.8 }, best: 'Gold + lumber',
    first: { gold: 8320, lumber: 456, tower: true }, drops: [['sword', 1], ['bow', 1.5], ['staff', 1.5], ['twin', 2], ['great', 3]], dropGrade: 2, repeat: { gold: 456, lumber: 23 }, sky: ['#4a5f86','#1a2038'],
    power: { hp: 5.07, dmg: 2.8, arm: 4.55 }, rec: 16 },
  { id: 'cinder', name: 'Cinder Fields', region: 'ember', req: 'rimecrown', enemies: ['emberimp','emberimp','emberimp','magmacrab'],
    blurb: 'Ember Imps hurl fire across the ashen plain while a Magma Crab blocks the road.', farm: { gold: 101.1, lumber: 21.1 }, best: 'Gold',
    first: { gold: 6448, lumber: 342 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2.5], ['great', 2]], dropGrade: 3, repeat: { gold: 683, lumber: 32 }, sky: ['#6a3a2c','#241210'],
    power: { hp: 18.04, dmg: 6.26, arm: 6.13 }, rec: 18 },
  { id: 'quarry', name: 'Ashen Quarry', region: 'ember', req: 'cinder', enemies: ['magmacrab','magmacrab','emberimp','emberimp'],
    blurb: 'Magma Crabs have claimed the old obsidian quarry, guarded by Ember Imps.', farm: { gold: 93.8, lumber: 46.1 }, best: 'Lumber',
    first: { gold: 9995, lumber: 513 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2.5], ['great', 2.5]], dropGrade: 3, repeat: { gold: 1025, lumber: 44 }, sky: ['#5a3830','#1c1012'],
    power: { hp: 13.84, dmg: 4.4, arm: 7.23 }, rec: 20 },
  { id: 'magmagate', name: 'Magma Gate', region: 'ember', req: 'quarry', enemies: ['magmacrab','magmacrab','magmacrab','emberimp'],
    blurb: 'A claw-clacking pack of Magma Crabs holds the ancient gate over the lava.', farm: { gold: 212.5, lumber: 41.3 }, best: 'Gold',
    first: { gold: 15492, lumber: 769 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 3], ['great', 3]], dropGrade: 3, repeat: { gold: 1538, lumber: 62 }, sky: ['#7a3a22','#26100a'],
    power: { hp: 14.86, dmg: 4.72, arm: 7.76 }, rec: 22 },
  { id: 'skyreach', name: 'Skyreach Spire', region: 'ember', req: 'magmagate', enemies: ['stormdrake'], boss: true,
    blurb: 'The Storm Drake circles the last spire. Defeat it to light the final watchtower.', farm: { gold: 246.5, lumber: 72.3 }, best: 'Gold + lumber',
    first: { gold: 48025, lumber: 2307, tower: true }, drops: [['sword', 1], ['bow', 1.5], ['staff', 1.5], ['twin', 3], ['great', 3.5]], dropGrade: 3, repeat: { gold: 2307, lumber: 87 }, sky: ['#3a3f5a','#14162a'],
    power: { hp: 10.22, dmg: 3.88, arm: 9.29 }, rec: 25 },
];
const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));
const REGION = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const regionOf = s => REGION[s.region];

const LAYOUT = {
  1: [[290, 192]],
  2: [[262, 176], [318, 206]],
  3: [[255, 170], [262, 214], [352, 190]],
  4: [[250, 190], [295, 160], [300, 216], [348, 186]],
};

/* Weapons are items. Craft copies, then merge MERGE_N copies of the same weapon and grade into one of the next grade. */
const GRADES = [
  { name: 'Common',    mult: 1.00, color: '#c9d3c3' },
  { name: 'Fine',      mult: 1.20, color: '#7fd18a' },
  { name: 'Rare',      mult: 1.45, color: '#6db4f2' },
  { name: 'Epic',      mult: 1.80, color: '#c08af0' },
  { name: 'Legendary', mult: 2.30, color: '#f6bf4f' },
];
const MERGE_N = 3;

/* Weapons cannot be bought: they only drop (each drop is one Common copy of a weapon from the stage's table).
   Winning a fight by hand is the best way to get one; auto-farming finds them more rarely.
   manual: chance per won fight (pity: extra chance added per won fight without a drop, bad-luck protection);
   autoPerHour: chance per hour of farming, rolled when you claim. */
const DROP = { manual: 0.10, pity: 0.15, autoPerHour: 0.06 };

const BAR_DUR = 1.6, BAR_CD = 8;
const FARM_CAP_MIN = 24 * 60;

/* ---------------------------- save ---------------------------------- */
const SAVE_KEY = 'wildlight-expedition-v1';
function newSave() {
  return {
    gold: 0, lumber: 0, cleared: {}, towers: {}, pity: {}, party: ['bren'],
    // items[weapon][grade] = how many copies you own; every hero starts with their basic weapon
    items: { sword: [1, 0, 0, 0, 0], bow: [1, 0, 0, 0, 0], staff: [1, 0, 0, 0, 0] },
    heroes: {
      bren: { lvl: 1, up: 0, weapon: 'sword' },
      tavi: { lvl: 1, up: 0, weapon: 'bow' },
      iona: { lvl: 1, up: 0, weapon: 'staff' },
    },
    farm: null, daily: { date: '', done: false }, tab: 'map',
  };
}
function hydrate(raw) {
  const base = newSave();
  if (raw && typeof raw === 'object') {
    Object.assign(base, raw);
    base.party = Array.isArray(raw.party) ? HERO_ORDER.filter(id => raw.party.includes(id)) : HERO_ORDER.slice();   // older saves had everyone
    if (!base.party.length) base.party = ['bren'];
    for (const id of HERO_ORDER) base.heroes[id] = Object.assign(newSave().heroes[id], (raw.heroes || {})[id]);
    if (!raw.items) {                       // older save: each crafted weapon becomes one Common copy
      base.items = newSave().items;
      for (const w of Object.keys(raw.crafted || {})) if (raw.crafted[w] && WEAPONS[w]) base.items[w] = [1, 0, 0, 0, 0];
    }
    for (const w of Object.keys(raw.recipes || {})) {             // recipes no longer exist: keep the weapon as a copy
      if (WEAPONS[w] && !(base.items[w] || []).some(n => n > 0)) base.items[w] = [1, 0, 0, 0, 0];
    }
    delete base.crafted; delete base.recipes;
    if (raw.lumber == null && raw.iron != null) base.lumber = raw.iron;       // Iron was renamed Lumber
    delete base.iron;
  }
  base.lumber = base.lumber || 0;
  for (const w of Object.keys(WEAPONS)) if (!base.items[w]) base.items[w] = [0, 0, 0, 0, 0];
  base.pity = base.pity || {};
  base.farmLog = Array.isArray(base.farmLog) ? base.farmLog.slice(0, 30) : [];
  return base;
}
let save = (() => {
  try { return hydrate(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')); } catch (e) { return hydrate(null); }
})();

/* persist() stamps the save time (cloud sync compares it) and tells cloud.js there is something new to upload.
   persist(true) saves locally only, for changes that are not progress (like switching tab). */
function persist(quiet) {
  if (!quiet) save.updatedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
  if (!quiet && window.cloud && cloud.saved) cloud.saved();
}
/* Replace the whole save with one from the cloud (cloud.js never does this while a fight is running). */
function adoptSave(raw) {
  save = hydrate(raw);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
  render();
}

/* sprites.js reports whether the illustrated art is 'loading', 'ready' or 'failed' (then we use the drawn fallback). */
const artState = k => (window.spriteState ? window.spriteState[k] : 'failed');
/* Runs go() once the region's monsters and backgrounds have downloaded (they load on demand, and ahead of time for the next area). */
function withRegionArt(region, go) {
  if (!artReady()) return;
  if (regionReady(region)) { go(); return; }
  toast('Loading the area…');
  if (typeof window.ensureRegion === 'function') window.ensureRegion(region).then(ok => { if (ok) go(); });
}
const artReady = () => {
  if (artState('units') !== 'loading') return true;
  toast('Loading the art, one moment…');
  return false;
};

/* --------------------------- helpers -------------------------------- */
const $ = s => document.querySelector(s);
const fmt = n => Math.floor(n).toLocaleString();
const today = () => new Date().toLocaleDateString('sv');
const isUnlocked = s => !s.req || !!save.cleared[s.req];
const party = () => HERO_ORDER.filter(id => save.party.includes(id));
const inParty = id => save.party.includes(id);
const partySize = () => save.party.length;
const sumLevels = () => party().reduce((a, id) => a + save.heroes[id].lvl, 0);
/* Monsters are weaker (and packs smaller) for a smaller party, so the first fights are fair with one hero. */
const partyScale = () => [1, 0.55, 0.8, 1][partySize()] || 1;
/* A smaller party faces a smaller pack: explicit waves if the stage has them, else half the pack for one hero and all but one for two. Bosses fight alone. */
const encounterFor = s => {
  const size = partySize(), n = s.enemies.length;
  if (s.waves && s.waves[size]) return s.waves[size];
  if (n < 3 || size >= 3) return s.enemies;
  return s.enemies.slice(0, size === 1 ? Math.ceil(n / 2) : n - 1);
};
const lvlCost = l => 40 * l;
const upCost = u => ({ gold: 80 * (u + 1), lumber: 6 * (u + 1) });
const canAfford = c => save.gold >= (c.gold || 0) && save.lumber >= (c.lumber || 0);
const pay = c => { save.gold -= c.gold || 0; save.lumber -= c.lumber || 0; };
const bestGrade = w => { const a = save.items[w] || []; for (let g = GRADES.length - 1; g >= 0; g--) if (a[g] > 0) return g; return -1; };
const owned = w => bestGrade(w) >= 0;
const heroGrade = id => Math.max(0, bestGrade(save.heroes[id].weapon));   // a hero always uses the best copy they own
const gradeTag = g => `<span class="grade" style="--g:${GRADES[g].color}">${GRADES[g].name}</span>`;

function heroStats(id) {
  const s = save.heroes[id], d = HERO[id];
  const lm = 1 + 0.12 * (s.lvl - 1), um = (1 + 0.15 * s.up) * GRADES[heroGrade(id)].mult;
  return { maxHp: Math.round(d.hp * lm), atk: d.atk * lm * um, heal: 14 * lm * um };
}

/* ---------------------------- farming ------------------------------- */
const farmMult = () => (1 + 0.06 * (sumLevels() - partySize())) * (0.4 + 0.2 * partySize());     // a bigger party gathers more
function farmGain() {
  if (!save.farm) return null;
  const st = STAGE[save.farm.stage];
  const mins = Math.max(0, Math.min(FARM_CAP_MIN, (Date.now() - save.farm.since) / 60000));
  const m = farmMult();
  return { mins, full: mins >= FARM_CAP_MIN, gold: Math.floor(mins * st.farm.gold * m), lumber: Math.floor(mins * st.farm.lumber * m) };
}
/* Pick one weapon from a stage's weighted drop table and add a Common copy of it. */
function dropWeapon(s) {
  const table = s.drops || [], total = table.reduce((a, [, wt]) => a + wt, 0);
  let r = Math.random() * total, pick = table[table.length - 1][0];
  for (const [w, wt] of table) { if ((r -= wt) < 0) { pick = w; break; } }
  save.items[pick][s.dropGrade || 0]++;
  return pick;
}
function rollManualDrop(s) {
  const pity = save.pity[s.id] || 0;
  if (Math.random() < Math.min(1, DROP.manual + pity * DROP.pity)) {
    save.pity[s.id] = 0;
    return dropWeapon(s);
  }
  save.pity[s.id] = pity + 1;
  return null;
}
/* One roll per full hour of farming (and a part-roll for the rest), so a long absence can bring a few weapons. */
function rollAutoDrops(s, mins) {
  const found = [], hours = Math.min(24, mins / 60), full = Math.floor(hours), part = hours - full;
  for (let i = 0; i < full; i++) if (Math.random() < DROP.autoPerHour) found.push(dropWeapon(s));
  if (part > 0 && Math.random() < DROP.autoPerHour * part) found.push(dropWeapon(s));
  return found;
}
const dropNames = (list, grade = 0) => Object.entries(list.reduce((m, w) => (m[w] = (m[w] || 0) + 1, m), {}))
  .map(([w, n]) => (grade ? GRADES[grade].name + ' ' : '') + WEAPONS[w].name + (n > 1 ? ` ×${n}` : '')).join(', ');

/* Collects farming loot; returns the weapons found (an array) so callers can announce them. */
function claimFarm(quiet) {
  const g = farmGain();
  if (!g) return [];
  save.gold += g.gold; save.lumber += g.lumber;
  const st = STAGE[save.farm.stage], found = rollAutoDrops(st, g.mins);
  const entry = { at: Date.now(), stage: st.id, mins: Math.floor(g.mins), gold: g.gold, lumber: g.lumber, found, grade: st.dropGrade || 0 };
  const logged = logFarm(entry);
  save.farm.since = Date.now();
  persist(); hud();
  if (!quiet) { if (logged) showFarmReport(entry); else toast('Nothing to collect yet. Give your party a little longer.'); }
  return found;
}

/* ---------------------------- daily hunt ---------------------------- */
function dailyPool() {
  const pool = [];
  for (const s of STAGES) if (isUnlocked(s)) for (const m of s.enemies) if (!pool.includes(m)) pool.push(m);
  return pool;
}
function dailyMonster() {
  const pool = dailyPool(), d = today();
  let h = 0;
  for (const c of d) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
function dailyDone() { return save.daily.date === today() && save.daily.done; }
function dailyReward(m) {
  const legacy = { brushfang: { gold: 50, lumber: 8 }, beetle: { gold: 60, lumber: 15 }, spitter: { gold: 60, lumber: 15 }, boar: { gold: 150, lumber: 25 } };
  if (legacy[m]) return legacy[m];
  const s = STAGES.find(x => x.enemies.includes(m));                   // newer monsters pay a few minutes of their area's farming
  return { gold: Math.round(s.farm.gold * 14), lumber: Math.round(s.farm.lumber * 10) };
}

/* ---------------------------- UI shell ------------------------------ */
/* Header chips stay narrow: 12,345 -> 12.3k, 1,234,567 -> 1.2M (the info sheet shows the exact amount). */
function fmtShort(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString();
  const trim = x => x.replace(/\.0$/, '');
  return n < 999500 ? trim((n / 1e3).toFixed(n < 99950 ? 1 : 0)) + 'k' : trim((n / 1e6).toFixed(1)) + 'M';
}
function hud() {
  $('#gold').textContent = fmtShort(save.gold);
  $('#lumber').textContent = fmtShort(save.lumber);
}
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
const costHtml = c => {
  const parts = [];
  if (c.gold) parts.push(`<b class="${save.gold >= c.gold ? '' : 'short'}"><i class="ico gold"></i>${fmt(c.gold)}</b>`);
  if (c.lumber) parts.push(`<b class="${save.lumber >= c.lumber ? '' : 'short'}"><i class="ico lumber"></i>${fmt(c.lumber)}</b>`);
  return parts.join(' ');
};
const gainText = g => [g.gold ? `${fmt(g.gold)} gold` : '', g.lumber ? `${fmt(g.lumber)} lumber` : ''].filter(Boolean).join(' · ') || 'nothing yet';

function render() {
  hud();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.arg === save.tab));
  $('#view').innerHTML = ({ map: renderMap, party: renderParty, forge: renderForge })[save.tab]();
  paintPortraits();
  tickFarm();
  startMapLoop();
  const chipRow = $('.regions'), chipOn = chipRow && chipRow.querySelector('.on');      // keep the active region chip in view
  if (chipOn) chipRow.scrollLeft = chipOn.offsetLeft - (chipRow.clientWidth - chipOn.offsetWidth) / 2;
  if (typeof window.ensureRegion === 'function') window.ensureRegion(featuredStage().region);        // the next fight's art, ahead of time
}

/* ------------------------------ map --------------------------------- */
function mapSvg() {
  const s1 = save.cleared.path, s2 = save.cleared.hollow, s3 = save.cleared.crossing;
  const pin = (x, y, n, cleared, open) =>
    `<circle cx="${x}" cy="${y}" r="9" fill="${cleared ? '#6cc37c' : open ? '#f2b84b' : '#53635a'}" stroke="#0f1a15" stroke-width="2"/>` +
    `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#10201a">${n}</text>`;
  const tower = (x, y, lit, dim) =>
    `<g opacity="${dim ? 0.45 : 1}"><rect x="${x - 6}" y="${y - 22}" width="12" height="22" fill="#7d8791"/>` +
    `<polygon points="${x - 9},${y - 22} ${x + 9},${y - 22} ${x},${y - 33}" fill="#5a4a3a"/>` +
    (lit ? `<circle cx="${x}" cy="${y - 28}" r="14" fill="#ffd35a" opacity=".28"/><circle cx="${x}" cy="${y - 28}" r="5" fill="#ffd35a"/>`
         : `<circle cx="${x}" cy="${y - 28}" r="4" fill="#3b4048"/>`) + `</g>`;
  return `<svg class="map" viewBox="0 0 360 150" role="img" aria-label="Village map">
    <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27493a"/><stop offset="1" stop-color="#16291f"/></linearGradient></defs>
    <rect width="360" height="150" fill="url(#sk)"/>
    <polygon points="0,90 60,40 110,80 170,28 240,86 300,44 360,84 360,150 0,150" fill="#1d3a2c"/>
    <polygon points="0,110 80,70 150,108 230,64 300,106 360,80 360,150 0,150" fill="#18301f"/>
    <path d="M30 124 C 80 100, 110 124, 150 106 S 220 84, 250 92 S 300 70, 322 52" fill="none" stroke="#7b6a4a" stroke-width="6" stroke-linecap="round"/>
    <path d="M322 52 C 336 44, 346 38, 358 30" fill="none" stroke="#7b6a4a" stroke-width="4" stroke-dasharray="3 6" opacity=".6"/>
    <g fill="#8a5a3a"><rect x="14" y="108" width="14" height="12"/><rect x="30" y="112" width="12" height="10"/><rect x="20" y="120" width="12" height="9"/></g>
    <g fill="#4a2f22"><polygon points="12,108 21,100 30,108"/><polygon points="29,112 36,105 43,112"/><polygon points="19,120 26,113 33,120"/></g>
    ${pin(90, 108, 1, s1, true)}${pin(165, 100, 2, s2, !!s1)}${pin(236, 90, 3, s3, !!s2)}
    ${tower(322, 56, !!s3, false)}${tower(352, 34, false, true)}
    <text x="30" y="144" text-anchor="middle" font-size="10" fill="#c9d8c8">Village</text>
    <text x="322" y="72" text-anchor="middle" font-size="10" fill="#c9d8c8">${s3 ? 'Relit!' : 'Watchtower'}</text>
  </svg>`;
}

/* ------------------------------ home cards ---------------------------- */
// Which cards show on the home screen, in this order:
//   1. farming status (only when the party is out): loot so far and the Claim button
//   2. "Next up": ONE big card for the stage the player should do now (the first unlocked, uncleared stage;
//      once everything is cleared, the stage the party farms) with the main Fight button
//   3. the daily hunt, as a slim row
//   4. every other stage as a compact row. Details such as the possible weapon drops are folded until tapped.
const uiOpen = new Set();                       // folded sections the player opened (kept across redraws)
const uiClosed = new Set();                     // sections that start open but the player closed
document.addEventListener('toggle', e => {
  const el = e.target, k = el && el.dataset && el.dataset.key;
  if (!k) return;
  if (el.dataset.defopen === '1') (el.open ? uiClosed.delete(k) : uiClosed.add(k));
  else (el.open ? uiOpen.add(k) : uiOpen.delete(k));
}, true);

const assetSrc = p => (typeof window.assetUrl === 'function' ? window.assetUrl(p) : '');
const artIsReady = () => artState('units') === 'ready';
const monSrc = m => (typeof window.monIdleUrl === 'function' ? window.monIdleUrl(m) : assetSrc(`monsters/${m}-idle.png`));
const monArtReady = m => { const s = STAGES.find(x => x.enemies.includes(m)); return !s || (window.regionArt && window.regionArt[s.region] === 'ready'); };
const resChip = (kind, n) => `<span class="res"><i class="ico ${kind}"></i><b>${fmt(n)}</b></span>`;
const nextStage = () => STAGES.find(s => isUnlocked(s) && !save.cleared[s.id]) || null;
const featuredStage = () => nextStage() || (save.farm && STAGE[save.farm.stage]) || STAGES[STAGES.length - 1];
const stageNo = s => STAGES.indexOf(s) + 1;
const foeCounts = s => encounterFor(s).reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
const foesText = s => Object.entries(foeCounts(s)).map(([m, n]) => MON[m].name + (n > 1 ? ` ×${n}` : '')).join(' · ');

function stageBg(s) {                           // the painted stage art as a banner (a colour gradient until the art has loaded)
  const sky = `--sky1:${s.sky[0]};--sky2:${s.sky[1]};`;
  return stageArt(s) ? `${sky}--bg:url('${assetSrc(`bg/${s.id}.jpg`)}')` : sky;
}
function foesHtml(s) {
  if (!stageArt(s)) return '';
  return Object.entries(foeCounts(s)).map(([m, n]) =>
    `<span class="foe" title="${MON[m].name}"><img src="${monSrc(m)}" alt="${MON[m].name}" onerror="this.remove()" style="height:${Math.round(46 * MON[m].scale)}px">${n > 1 ? `<i>×${n}</i>` : ''}</span>`).join('');
}
function stagePill(s) {
  if (!isUnlocked(s)) return '<span class="pill lock"><i class="ico m lock sm"></i>Locked</span>';
  if (save.farm && save.farm.stage === s.id) return '<span class="pill farm"><i class="ico m tent sm"></i>Farming</span>';
  if (save.cleared[s.id]) return '<span class="pill ok"><i class="ico m check sm"></i>Cleared</span>';
  return s.boss ? '<span class="pill boss">Boss</span>' : '<span class="pill new">New</span>';
}
/* The average share of won fights that drop a weapon. Every win without a drop makes the next drop more likely
   (DROP.pity), so this is 1 / (average number of wins until a drop) and a bit above the plain DROP.manual. */
function dropRatePerWin() {
  let expected = 0, survive = 1;
  for (let k = 0; k < 40 && survive > 1e-9; k++) {
    expected += survive;
    survive *= 1 - Math.min(1, DROP.manual + DROP.pity * k);
  }
  return 1 / expected;
}
const pctText = x => (x < 0.01 ? '<1%' : Math.round(x * 100) + '%');
/* A picture of a weapon (the item art), or nothing while the art loads or if the file is missing. */
const itemIcon = (w, cls = '') => artIsReady()
  ? `<img class="itemicon ${cls}" src="${assetSrc(`items/${w}.png`)}" alt="" onerror="this.remove()">` : '';

function dropsHtml(s) {                         // folded by default
  if (!(s.drops || []).length) return '';
  const key = 'drops-' + s.id, total = s.drops.reduce((a, [, wt]) => a + wt, 0), rate = dropRatePerWin();
  const chips = s.drops.map(([w, wt]) => {
    const chance = rate * wt / total;                                   // the real chance, per fight you win
    const tier = chance >= 0.08 ? 'often' : chance >= 0.04 ? 'sometimes' : 'rarely';   // only used to colour the chip
    return `<div class="dropchip ${tier}">${itemIcon(w, 'sm')}<div><b>${WEAPONS[w].name}${s.dropGrade ? ' ' + gradeTag(s.dropGrade) : ''}</b><small>${FAMILY[WEAPONS[w].fam]} · about ${pctText(chance)} per win</small></div></div>`;
  }).join('');
  return `<details class="drops" data-key="${key}" ${uiOpen.has(key) ? 'open' : ''}><summary><span>Possible weapon drops</span><em>${s.drops.length}</em></summary>
    <div class="dropgrid">${chips}</div>
    <p class="fine">Chances are per fight you win, on average (every win without a drop makes the next one more likely). Farming finds weapons more rarely, about ${pctText(DROP.autoPerHour)} per hour.</p></details>`;
}
function stageActions(s, big) {
  if (!isUnlocked(s)) return '';
  const cleared = !!save.cleared[s.id], farming = save.farm && save.farm.stage === s.id;
  const fight = big ? (s.boss && !cleared ? 'Challenge boss' : cleared ? 'Fight again' : 'Fight') : 'Fight';
  let h = `<button class="btn ${big ? 'primary' : ''}" data-act="fight" data-arg="${s.id}"><i class="ico m swords"></i>${fight}</button>`;
  if (cleared) h += `<button class="btn alt" data-act="farm" data-arg="${s.id}" ${farming ? 'disabled' : ''}><i class="ico m tent"></i>${farming ? 'Farming here' : big ? 'Send party to farm' : 'Farm'}</button>`;
  else if (big) h += '<span class="hint">Clear it to send your party farming here.</span>';
  return h;
}
function bestFor(s) {
  const kinds = [/gold/i.test(s.best) && 'gold', /lumber/i.test(s.best) && 'lumber'].filter(Boolean);
  return `Best for ${kinds.map(k => `<span class="res"><i class="ico ${k}"></i>${k === 'gold' ? 'Gold' : 'Lumber'}</span>`).join('')}`;
}

function featuredCard(s) {
  return `<article class="stagecard">
    <div class="banner" style="${stageBg(s)}">
      <div class="bhead"><span class="num">${stageNo(s)}</span>${stagePill(s)}</div>
      <div class="bfoot"><div><h3>${s.name}</h3><p>${s.blurb}</p></div><div class="foes">${foesHtml(s)}</div></div>
    </div>
    <div class="sbody">
      ${recBadge(s)}
      ${save.cleared[s.id] ? `<div class="bestfor">${bestFor(s)}</div>` : ''}
      ${dropsHtml(s)}
      <div class="actions">${stageActions(s, true)}</div>
    </div></article>`;
}
function stageRow(s) {
  const open = isUnlocked(s), prev = STAGES[stageNo(s) - 2];
  return `<article class="stagerow ${open ? '' : 'locked'}">
    <div class="thumb" style="${stageBg(s)}"><span>${stageNo(s)}</span></div>
    <div class="rinfo">
      <div class="rtop"><h4>${s.name}</h4>${stagePill(s)}</div>
      <div class="rsub">${open ? `${foesText(s)} · Lv ${s.rec}` : `Clear ${prev.name} to unlock`}</div>
      ${open ? `<div class="ractions">${stageActions(s, false)}</div>` : ''}
    </div>
    ${open ? dropsHtml(s) : ''}
  </article>`;
}
function dailyCard() {
  const dm = dailyMonster(), dr = dailyReward(dm), done = dailyDone();
  return `<div class="daily ${done ? 'done' : ''}">
    <span class="dthumb">${artIsReady() && monArtReady(dm) ? `<img src="${monSrc(dm)}" alt="" onerror="this.remove()">` : ''}</span>
    <div class="dinfo"><b>Daily hunt</b><span>${MON[dm].name} ${resChip('gold', dr.gold)}${resChip('lumber', dr.lumber)}</span></div>
    ${done ? '<span class="pill ok"><i class="ico m check sm"></i>Done today</span>' : '<button class="btn small" data-act="bonus">Hunt</button>'}</div>`;
}
function farmStrip() {
  const cur = save.farm ? STAGE[save.farm.stage] : null;
  if (!cur) {
    const any = STAGES.some(s => save.cleared[s.id]);
    return `<div class="strip idle"><i class="ico m tent"></i><div><b>Your party is resting</b><span>${any ? 'Send them to farm a cleared stage and collect the loot later.' : 'Win your first fight to unlock farming.'}</span></div></div>`;
  }
  const g = farmGain();
  return `<div class="strip">
    <div class="shead"><i class="ico m tent"></i><b>Farming at ${cur.name}</b><span class="muted" id="farm-time"></span></div>
    <div class="gains" id="farm-gain">${resChip('gold', g.gold)}${resChip('lumber', g.lumber)}</div>
    <div class="bar"><i id="farm-bar" style="width:${(g.mins / FARM_CAP_MIN * 100).toFixed(1)}%"></i></div>
    <button class="btn good" data-act="claim" id="claim-btn">Claim</button>
    <p class="fine">Gathers for up to 24 hours. Weapons can drop too, but rarely, so fight by hand for the best chance.</p></div>`;
}

/* ------------------------------- regions ------------------------------ */
// The map shows one region at a time (a painted map per region). Which one: the region of the stage the player should do next,
// unless they tapped another region's chip (remembered until that "next stage" changes).
let uiRegion = null;
const regionUnlocked = r => isUnlocked(STAGE[r.stages[0]]);
const regionCleared = r => r.stages.filter(id => save.cleared[id]).length;
function currentRegion() {
  const f = featuredStage();
  return uiRegion && uiRegion.at === f.id ? REGION[uiRegion.id] : REGION[f.region];
}
function regionChips() {
  const cur = currentRegion();
  return `<div class="regions" role="tablist">${REGIONS.map(r => {
    const locked = !regionUnlocked(r), done = regionCleared(r) === r.stages.length;
    return `<button class="rchip ${r === cur ? 'on' : ''} ${locked ? 'lock' : ''}" role="tab" aria-selected="${r === cur}" data-act="region" data-arg="${r.id}">
      ${locked ? '<i class="ico m lock sm"></i>' : done ? '<i class="ico m check sm"></i>' : ''}<span>${r.name}</span><small>${regionCleared(r)}/${r.stages.length}</small></button>`;
  }).join('')}</div>`;
}
/* What the map canvas draws for a region (see drawMap in sprites.js). */
function mapState(r) {
  return {
    map: r.map,
    pins: r.stages.map((id, i) => ({ id, x: r.pins[i][0], y: r.pins[i][1], n: stageNo(STAGE[id]),
      state: save.cleared[id] ? 'cleared' : isUnlocked(STAGE[id]) ? 'open' : 'locked' })),
    tower: { x: r.towerPos[0], y: r.towerPos[1], lit: !!save.cleared[r.tower] },
    farming: save.farm ? save.farm.stage : null,
    home: r.home,
    more: r !== REGIONS[REGIONS.length - 1],
  };
}
const regionReady = id => !!(window.regionArt && window.regionArt[id] === 'ready');
const stageArt = s => artIsReady() && regionReady(s.region);        // this stage's pictures have downloaded

/* A hint about how the party compares with the area (recommended level is what the area was balanced for). */
function partyLevel() { return party().reduce((a, id) => a + save.heroes[id].lvl, 0) / partySize(); }
function recBadge(s) {
  const lv = partyLevel(), gap = s.rec - lv;
  const [cls, txt] = gap <= 0 ? ['ok', 'Ready'] : gap <= 2 ? ['mid', 'Close'] : ['hard', 'Too strong: level up first'];
  return `<span class="rec ${cls}">Recommended Lv <b>${s.rec}</b><i>·</i>Your party Lv <b>${Math.floor(lv)}</b><em>${txt}</em></span>`;
}

function renderMap() {
  // art.js paints the map on a canvas (animated); the SVG is the fallback when drawMap is missing.
  let h = typeof drawMap === 'function'
    ? `<canvas id="map-canvas" class="map" width="1080" height="450" role="img" aria-label="Village map"></canvas>`
    : artState('map') === 'loading'
      ? `<div class="map placeholder" role="img" aria-label="Loading the village map"><span>Loading the village…</span></div>`
      : mapSvg();

  // Groups (.vg) keep the phone order (map, farm strip, next up, daily, roads); on a wide screen CSS puts them in two columns (.vcol).
  const feat = featuredStage(), allDone = !nextStage();
  h = `<div class="vgrid"><div class="vcol"><div class="vg o1">${h}${regionChips()}</div>`;
  const colA2 = `<div class="vg o3"><h2 class="sec">${allDone ? 'Farm &amp; replay' : 'Next up'}</h2>` + featuredCard(feat) + '</div></div>';
  h += colA2 + `<div class="vcol"><div class="vg o2">${farmStrip()}${farmLogCard()}</div><div class="vg o4">${dailyCard()}${window.pwaCard ? window.pwaCard() : ''}</div>`;   // pwaCard: "Install the game" (pwa.js)
  h += '<div class="vg o5">';
  const nClear = STAGES.filter(s => save.cleared[s.id]).length;
  h += `<h2 class="sec">Roads <small>${nClear} of ${STAGES.length} cleared</small></h2>`;
  for (const r of REGIONS) {
    const rows = r.stages.map(id => STAGE[id]).filter(s => s !== feat);
    if (!rows.length) continue;
    const key = 'region-' + r.id, locked = !regionUnlocked(r), defOpen = !locked && REGION[feat.region] === r;
    const open = defOpen ? !uiClosed.has(key) : uiOpen.has(key);
    h += `<details class="region ${locked ? 'locked' : ''}" data-key="${key}" data-defopen="${defOpen ? 1 : 0}" ${open ? 'open' : ''}>
      <summary><span class="rname">${locked ? '<i class="ico m lock sm"></i>' : ''}${r.name}</span><em>${regionCleared(r)} of ${r.stages.length}</em></summary>
      <div class="rlist">${rows.map(stageRow).join('')}</div></details>`;
  }
  const nextBoss = STAGES.find(s => s.boss && !save.cleared[s.id]);
  h += `<p class="note">${nextBoss ? `Beat the boss at ${nextBoss.name} to relight the ${REGION[nextBoss.region].name} watchtower.` : 'Every watchtower is lit. More areas will open in a later version.'}</p>`;
  if (TEST_PERIOD) h += `<div class="card testtools"><div class="row between"><h3>Test tools</h3><span class="tag">Test period</span></div>
    <p class="sub">Want to start over? This wipes your progress and begins a brand-new game.</p>
    <button class="btn danger" data-act="resetask">Reset game data</button>
    <p class="sub" style="margin-top:12px">Testing the new areas? These shortcuts help:</p>
    <div class="row"><button class="btn alt" data-act="testunlock">Unlock all areas</button><button class="btn alt" data-act="testgold">+10,000 gold &amp; 2,000 lumber</button></div></div>`;
  return h + '</div></div></div>';
}

/* Animated map: one rAF loop at a time, stops when the canvas leaves the page or a battle opens. */
let mapRaf = 0;
function startMapLoop() {
  cancelAnimationFrame(mapRaf);
  const cvs = $('#map-canvas');
  if (!cvs || typeof drawMap !== 'function') return;
  const c = cvs.getContext('2d');
  const t0 = performance.now();
  const frame = now => {
    if (!cvs.isConnected) return;
    if (!B) {
      c.setTransform(cvs.width / 360, 0, 0, cvs.height / 150, 0, 0);
      c.globalAlpha = 1;
      drawMap(c, mapState(currentRegion()), (now - t0) / 1000);
    }
    mapRaf = requestAnimationFrame(frame);
  };
  mapRaf = requestAnimationFrame(frame);
}

function tickFarm() {
  const g = farmGain();
  if (!g || save.tab !== 'map') return;
  const a = $('#farm-gain'); if (!a) return;
  a.innerHTML = resChip('gold', g.gold) + resChip('lumber', g.lumber);
  $('#farm-bar').style.width = (g.mins / FARM_CAP_MIN * 100).toFixed(1) + '%';
  const m = Math.floor(g.mins), hh = Math.floor(m / 60);
  $('#farm-time').textContent = g.full ? 'Full: claim it!' : `Out ${hh}h ${m % 60}m`;
  const cb = $('#claim-btn');
  if (cb) { const any = g.gold > 0 || g.lumber > 0; cb.disabled = !any; cb.classList.toggle('ready', any); }
}
setInterval(tickFarm, 1000);

/* ------------------------------ party ------------------------------- */
// The party starts with one hero (Bren). The others are hired with gold from the Recruit section.
const HERO_ACCENT = { bren: '#c98a2b', tavi: '#4c9a5c', iona: '#b69ce0' };
const heroDps = id => {
  const w = WEAPONS[save.heroes[id].weapon], st = heroStats(id);
  return st.atk * w.hits.reduce((a, b) => a + b, 0) / w.int;
};

function partyStrip() {
  const slots = HERO_ORDER.map(id => `<span class="slot ${inParty(id) ? 'full' : ''}" title="${HERO[id].name}">${inParty(id) ? HERO[id].name[0] : '+'}</span>`).join('');
  const left = HERO_ORDER.filter(id => !inParty(id)).length;
  return `<div class="strip idle pstrip"><div class="slots">${slots}</div>
    <div><b>Your party · ${party().length} of ${HERO_ORDER.length}</b>
    <span>${left ? 'Hire more heroes with gold. A bigger party fights stronger monsters and farms faster.' : 'Your full party is ready.'}</span></div></div>`;
}

function heroCard(id) {
  const d = HERO[id], s = save.heroes[id], st = heroStats(id), w = WEAPONS[s.weapon];
  const lc = { gold: lvlCost(s.lvl) }, uc = upCost(s.up);
  const key = 'weapons-' + id, owned_ = Object.keys(WEAPONS).filter(x => WEAPONS[x].fam === d.family && owned(x));
  const stats = [['HP', st.maxHp], ['Damage/s', heroDps(id).toFixed(1)]];
  if (w.heal) stats.push(['Heal', Math.round(st.heal)]);
  return `<article class="herocard" style="--hc:${HERO_ACCENT[id]}">
    <div class="hhead">
      <canvas class="hport" data-hero="${id}" width="240" height="260"></canvas>
      <div class="hinfo">
        <div class="hname"><h3>${d.name}</h3><span class="lvl">Lv ${s.lvl}</span></div>
        <p class="hrole">${d.role}</p>
        <div class="stats">${stats.map(([k, v]) => `<span class="stat"><em>${k}</em><b>${v}</b></span>`).join('')}</div>
      </div>
    </div>
    <p class="hblurb">${d.blurb}</p>
    <div class="wnow"><span class="wlabel">Weapon</span><b>${w.name}</b>${gradeTag(heroGrade(id))}<span class="wup">${FAMILY[d.family]} +${s.up}</span></div>
    <div class="hactions">
      <button class="btn primary sm" data-act="lvl" data-arg="${id}" ${canAfford(lc) ? '' : 'disabled'}>Level up <span class="cost">${costHtml(lc)}</span></button>
      <button class="btn alt" data-act="up" data-arg="${id}" ${canAfford(uc) ? '' : 'disabled'}>Upgrade ${FAMILY_PLURAL[d.family].toLowerCase()} <span class="cost">${costHtml(uc)}</span></button>
    </div>
    <details class="drops" data-key="${key}" ${uiOpen.has(key) ? 'open' : ''}><summary><span>Change weapon</span><em>${owned_.length}</em></summary>
      <div class="weapons">${owned_.map(x => {
        const n = save.items[x].reduce((a, b) => a + b, 0);
        return `<button class="weapon ${s.weapon === x ? 'on' : ''}" data-act="equip" data-arg="${id}:${x}">
          ${itemIcon(x, 'sm')}<span><b>${WEAPONS[x].name}</b><small>${WEAPONS[x].desc}</small></span>
          <span class="wmeta">${gradeTag(bestGrade(x))}<small>${n > 1 ? `${n} owned` : ''}</small></span></button>`;
      }).join('')}</div>
      <p class="fine">A hero always wields the best grade they own. Merge copies in the Forge.</p></details>
  </article>`;
}

function recruitCard(id) {
  const d = HERO[id], short = d.hire - save.gold, can = short <= 0;
  return `<article class="herocard recruit" style="--hc:${HERO_ACCENT[id]}">
    <div class="hhead">
      <canvas class="hport" data-hero="${id}" width="240" height="260"></canvas>
      <div class="hinfo">
        <div class="hname"><h3>${d.name}</h3><span class="lvl hire">For hire</span></div>
        <p class="hrole">${d.role}</p>
        <p class="hblurb">${d.blurb}</p>
      </div>
    </div>
    <div class="hactions">
      <button class="btn primary sm" data-act="hire" data-arg="${id}" ${can ? '' : 'disabled'}>Hire <span class="cost">${costHtml({ gold: d.hire })}</span></button>
      ${can ? '' : `<span class="hint">Need ${fmt(short)} more gold</span>`}
    </div>
  </article>`;
}

function renderParty() {
  let h = partyStrip();
  h += `<h2 class="sec">Heroes</h2><div class="cgrid">` + party().map(heroCard).join('') + '</div>';
  const rec = HERO_ORDER.filter(id => !inParty(id));
  if (rec.length) h += `<h2 class="sec">Recruit <small>pay with gold</small></h2>` + `<div class="cgrid">` + rec.map(recruitCard).join('') + '</div>';
  return h;
}

/* Draws every portrait canvas: the hero with the given weapon (data-weapon, default: what they wield). data-scale sizes the hero. */
function paintPortraits() {
  if (artState('units') === 'loading') return;      // wait for the illustrated heroes instead of flashing the drawn ones
  document.querySelectorAll('canvas[data-hero]').forEach(cv => {
    const id = cv.dataset.hero, c = cv.getContext('2d'), k = Number(cv.dataset.scale || 2);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save(); c.scale(k, k);
    drawHero(c, id, cv.width / (2 * k), (cv.height - 10) / k, { weapon: cv.dataset.weapon || save.heroes[id].weapon, t: 0 });
    c.restore();
  });
}

/* ------------------------------ forge ------------------------------- */
// Weapons cannot be bought. The Forge lists every weapon, groups them by hero, and merges copies into higher grades.
const WIELDER = Object.fromEntries(HERO_ORDER.map(id => [HERO[id].family, id]));

function weaponCard(w) {
  const W = WEAPONS[w], items = save.items[w], total = items.reduce((a, b) => a + b, 0), who = WIELDER[W.fam], hero = HERO[who];
  if (!total) {
    const where = STAGES.filter(s => (s.drops || []).some(([x]) => x === w)).map(s => s.name);
    return `<article class="weaponcard locked"><div class="wport">${itemIcon(w)}</div>
      <div class="winfo"><div class="wtop"><h4>${W.name}</h4><span class="pill lock"><i class="ico m lock sm"></i>Not found</span></div>
        <p class="wdesc">${W.desc}</p><p class="fine">Drops at ${where.join(', ')}.</p></div></article>`;
  }
  const best = bestGrade(w), ready = items.some((n, g) => g < GRADES.length - 1 && n >= MERGE_N);
  const rows = [];
  for (let gr = 0; gr < GRADES.length; gr++) {
    const n = items[gr] || 0;
    if (!n) continue;
    const last = gr === GRADES.length - 1, can = !last && n >= MERGE_N;
    const pips = last ? '' : `<span class="pips" aria-label="${Math.min(n, MERGE_N)} of ${MERGE_N}">${Array.from({ length: MERGE_N }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
    rows.push(`<div class="mergerow ${can ? 'can' : ''}"><span class="mleft">${gradeTag(gr)}<b>×${n}</b><small>+${Math.round((GRADES[gr].mult - 1) * 100)}%</small></span>${
      last ? '<small>Max grade</small>' : `${pips}<button class="btn ${can ? 'good' : 'alt'} small" data-act="merge" data-arg="${w}:${gr}" ${can ? '' : 'disabled'}>Merge → ${GRADES[gr + 1].name}</button>`}</div>`);
  }
  const equipped = save.heroes[who].weapon === w, hired = inParty(who);
  const foot = !hired ? `<span class="hint">${hero.name} isn't in your party yet.</span>`
    : equipped ? `<span class="pill ok"><i class="ico m check sm"></i>${hero.name} wields this</span>`
    : `<button class="btn alt small" data-act="equip" data-arg="${who}:${w}">Equip on ${hero.name}</button>`;
  return `<article class="weaponcard ${ready ? 'ready' : ''}" style="--g:${GRADES[best].color}">
    <div class="wport">${itemIcon(w)}</div>
    <div class="winfo"><div class="wtop"><h4>${W.name}</h4>${gradeTag(best)}</div>
      <p class="wdesc">${W.desc}</p>
      <div class="mergelist">${rows.join('')}</div>
      <div class="wfoot">${foot}</div></div></article>`;
}

function renderForge() {
  const readyCount = Object.keys(WEAPONS).reduce((a, w) => a + save.items[w].filter((n, g) => g < GRADES.length - 1 && n >= MERGE_N).length, 0);
  let h = `<div class="strip idle fstrip"><i class="ico m swords"></i><div><b>${readyCount ? `${readyCount} merge${readyCount > 1 ? 's' : ''} ready!` : 'The Forge'}</b>
    <span>Weapons can't be bought: they drop from fights and farming. Merge ${MERGE_N} copies of the same weapon and grade into one of the next grade (${GRADES.map(x => x.name).join(' → ')}).</span></div></div>`;
  for (const fam of Object.keys(FAMILY)) {
    const ws = Object.keys(WEAPONS).filter(w => WEAPONS[w].fam === fam);
    h += `<h2 class="sec">${FAMILY_PLURAL[fam]} <small>${HERO[WIELDER[fam]].name}</small></h2>` + `<div class="cgrid">${ws.map(weaponCard).join('')}</div>`;
  }
  h += `<p class="note">More weapons (sword and shield, saber, rapier, falchion and bow and staff variants) drop in later areas.</p>`;
  return h;
}

/* ------------------------------ test tools --------------------------------- */
// While the game is being tested, the Map tab has a "Reset game data" button. Set TEST_PERIOD to false (or delete this block,
// the card in renderMap and the three reset actions) when the game launches.
const TEST_PERIOD = true;

/* Which build is this? deploy.yml stamps the commit into the ?v= of the script links and the build time into <meta name="build">.
   During the test period a small corner label shows both, so a stale cached copy is easy to tell from the new one. */
function parseBuild(src, stamp) {
  const m = /[?&]v=([^&#]+)/.exec(src || '');
  return { sha: m ? m[1] : 'dev', time: stamp && !stamp.startsWith('__') ? stamp : '' };
}
const BUILD = parseBuild(document.currentScript && document.currentScript.src, (document.querySelector('meta[name=build]') || {}).content);
if (TEST_PERIOD) {
  const verEl = $('#ver');
  if (verEl) verEl.textContent = `v ${BUILD.sha}${BUILD.time ? ' · ' + BUILD.time : ''}`;
}

function closeResetDialog() { const d = document.getElementById('reset-dialog'); if (d) d.remove(); }
function showResetDialog() {
  closeResetDialog();
  const signedIn = !!(window.cloud && cloud.isSignedIn && cloud.isSignedIn());
  const d = document.createElement('div');
  d.className = 'result dialog'; d.id = 'reset-dialog';
  d.innerHTML = `<div class="box"><h2>Reset game data?</h2>
    <p class="note">This erases everything: your hero levels, weapons, gold, lumber and cleared stages${signedIn ? ', on this device and in your account' : ' on this device'}. You can't undo it.</p>
    <div class="stack"><button class="btn danger" data-act="resetdo">Yes, reset everything</button><button class="btn alt" data-act="resetcancel">Cancel</button></div></div>`;
  d.addEventListener('click', e => { if (e.target === d) closeResetDialog(); });   // tap outside to cancel
  document.body.appendChild(d);
}
function resetGame() {
  closeResetDialog(); closeResInfo();
  save = hydrate(null);                 // a brand-new save: starter weapons, level 1 heroes, nothing cleared
  persist();                            // stamps the time, so a signed-in account is reset as well (cloud.js uploads it)
  toast('Game reset. A fresh start!');
  render();
  window.scrollTo(0, 0);
}

/* ------------------------- resource information ---------------------------- */
const perHour = (s, k) => fmt(s.farm[k] * 60 * farmMult());
const RESOURCES = {
  gold: {
    name: 'Gold', what: 'The expedition\'s coin.',
    get: () => [
      'Win fights by hand: every win pays a little, and the first time you clear a stage it pays a big bonus.',
      (() => { const open = STAGES.filter(s => save.cleared[s.id]), best = (open.length ? open : [STAGES[0]]).reduce((a, b) => (b.farm.gold > a.farm.gold ? b : a)); return `Send your party to farm a cleared stage and claim it later (up to 24 hours). Your best right now is ${best.name}: about ${perHour(best, 'gold')} per hour. Later areas pay much more.`; })(),
      "Finish today's bonus hunt on the Map for extra.",
    ],
    use: () => [
      `Hire more heroes in the Party tab: Tavi costs ${HERO.tavi.hire} gold and Iona ${HERO.iona.hire}.`,
      `Level up your heroes in the Party tab (${lvlCost(1)} gold at level 1, more for each level).`,
      `Upgrade a weapon family in the Party tab (it also needs lumber): the first upgrade costs ${upCost(0).gold} gold.`,
    ],
  },
  lumber: {
    name: 'Lumber', what: 'Strong timber from the old roads, what weapon upgrades are built from.',
    get: () => {
      const cleared = STAGES.filter(s => save.cleared[s.id]), best = (cleared.length ? cleared : [STAGES[0]]).reduce((a, b) => (b.farm.lumber > a.farm.lumber ? b : a));
      return [
        `Send your party to farm a cleared stage: your best right now is ${best.name}, about ${perHour(best, 'lumber')} per hour (up to 24 hours while you're away). Later areas pay much more.`,
        'Winning fights and finishing the daily bonus hunt pay a little too.',
      ];
    },
    use: () => [
      `Upgrade a weapon family in the Party tab. Every upgrade makes all of that hero's weapons stronger. The first costs ${upCost(0).lumber} lumber (and ${upCost(0).gold} gold).`,
      "Weapons themselves can't be bought: they drop from fights, and you merge copies in the Forge.",
    ],
  },
};
function closeResInfo() { const d = document.getElementById('res-info'); if (d) d.remove(); }
function showResInfo(kind) {
  const R = RESOURCES[kind];
  if (!R) return;
  closeResInfo();
  const d = document.createElement('div');
  d.className = 'result dialog'; d.id = 'res-info';
  d.innerHTML = `<div class="box resinfo">
    <div class="head"><i class="ico big ${kind}"></i><div><h2>${R.name}</h2><div class="note">You have <b>${fmt(save[kind])}</b></div></div></div>
    <p class="note">${R.what}</p>
    <h3>How to get it</h3><ul>${R.get().map(l => `<li>${l}</li>`).join('')}</ul>
    <h3>What it's for</h3><ul>${R.use().map(l => `<li>${l}</li>`).join('')}</ul>
    <button class="btn" data-act="closeinfo">Got it</button></div>`;
  d.addEventListener('click', e => { if (e.target === d) closeResInfo(); });   // tap outside to close
  document.body.appendChild(d);
}

/* ----------------------------- actions ------------------------------ */
const actions = {
  tab(t) { save.tab = t; persist(true); render(); },
  claim() { claimFarm(false); render(); },
  farm(id) {
    if (!save.cleared[id]) return;
    const prevGrade = save.farm ? (STAGE[save.farm.stage].dropGrade || 0) : 0;
    const found = save.farm ? claimFarm(true) : [];
    save.farm = { stage: id, since: Date.now() };
    persist();
    toast(`${found.length ? `Your party found: ${dropNames(found, prevGrade)}! ` : ''}Party sent to ${STAGE[id].name}.`);
    render();
  },
  hire(id) {
    const d = HERO[id];
    if (!d || inParty(id) || save.gold < d.hire) return;
    save.gold -= d.hire;
    save.party = HERO_ORDER.filter(x => x === id || inParty(x));
    persist(); toast(`${d.name} joins your party!`); render();
  },
  lvl(id) {
    if (!inParty(id)) return;
    const c = { gold: lvlCost(save.heroes[id].lvl) };
    if (!canAfford(c)) return;
    pay(c); save.heroes[id].lvl++; persist(); render();
  },
  up(id) {
    if (!inParty(id)) return;
    const c = upCost(save.heroes[id].up);
    if (!canAfford(c)) return;
    pay(c); save.heroes[id].up++; persist(); render();
  },
  equip(arg) {
    const [id, w] = arg.split(':');
    if (inParty(id) && owned(w) && WEAPONS[w].fam === HERO[id].family) { save.heroes[id].weapon = w; persist(); render(); }
  },
  merge(arg) {
    const [w, gs] = arg.split(':'), gr = Number(gs), items = save.items[w];
    if (!items || !(gr >= 0 && gr < GRADES.length - 1) || items[gr] < MERGE_N) return;
    items[gr] -= MERGE_N; items[gr + 1]++;
    persist(); toast(`Merged into a ${GRADES[gr + 1].name} ${WEAPONS[w].name}!`); render();
  },
  fight(id) {
    const s = STAGE[id];
    if (!isUnlocked(s)) return;
    withRegionArt(s.region, () => startBattle({ title: s.name, sky: s.sky, enemies: encounterFor(s), hpMult: partyScale(), power: s.power, bg: s.id, repeatable: true, onWin: () => stageWin(s) }));
  },
  bonus() {
    if (dailyDone()) return;
    const m = dailyMonster(), s = STAGES.filter(isUnlocked).find(x => x.enemies.includes(m));
    withRegionArt(s.region, () => startBattle({ title: `Bonus hunt: ${MON[m].name}`, sky: s.sky, enemies: [m], hpMult: (MON[m].boss ? 1 : 1.5) * partyScale(), power: s.power, bg: s.id, onWin: () => bonusWin(m) }));
  },
  region(id) { if (REGION[id]) { uiRegion = { id, at: featuredStage().id }; render(); } },
  testunlock() {                                          // test period: open every area (the last one stays to fight for its first-clear reward)
    if (!TEST_PERIOD) return;
    STAGES.slice(0, -1).forEach(s => { save.cleared[s.id] = true; if (s.first.tower) save.towers[s.id] = true; });
    persist(); toast('All areas unlocked.'); render();
  },
  testgold() { if (!TEST_PERIOD) return; save.gold += 10000; save.lumber += 2000; persist(); toast('Added 10,000 gold and 2,000 lumber.'); render(); },
  resetask() { if (TEST_PERIOD) showResetDialog(); },
  resetdo() { if (TEST_PERIOD) resetGame(); },
  resetcancel() { closeResetDialog(); },
  resinfo(kind) { showResInfo(kind); },
  closeinfo() { closeResInfo(); },
  account() { if (window.cloud) cloud.account(); },
  signout() { if (window.cloud) cloud.signOut(); },
  keepcloud() { if (window.cloud) cloud.choose('cloud'); },
  keepdevice() { if (window.cloud) cloud.choose('device'); },
  barrier() { raiseBarrier(); },
  retreat() {
    if (!B) return;
    if (B.over) { if (run && run.wins && $('#result').hidden) showRunSummary(); return; }       // between two repeated fights
    endBattle('retreat');
  },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || !actions[b.dataset.act]) return;
  actions[b.dataset.act](b.dataset.arg);
});
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && B) { e.preventDefault(); raiseBarrier(); }
  if (e.key === 'r' && B && !e.ctrlKey && !e.metaKey && !e.altKey) actions.repeat();
  if (e.key === 'Escape') {
    const dlg = document.getElementById('reset-dialog'), res = document.getElementById('result');
    if (dlg || document.getElementById('res-info') || document.getElementById('farm-report')) { closeResInfo(); closeResetDialog(); closeFarmReport(); }
    else if (B && res && res.hidden) actions.retreat();           // Esc leaves a fight (keyboard players)
  }
  else if (!B && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '') && ['1', '2', '3'].includes(e.key) && !document.getElementById('reset-dialog')) {
    actions.tab(['map', 'party', 'forge'][Number(e.key) - 1]);       // 1 / 2 / 3 switch tabs
  }
});

/* Stage wins return a structured result (what was earned) that showResult() turns into the reward screen. */
function stageWin(s) {
  const r = { title: s.name, sub: 'Stage cleared', gold: 0, lumber: 0, first: false, tower: false, unlock: null, drop: null, again: true };
  if (!save.cleared[s.id]) {
    save.cleared[s.id] = true;
    r.first = true; r.sub = 'First clear!';
    r.gold = s.first.gold; r.lumber = s.first.lumber;
    if (s.first.tower) { save.towers[s.id] = true; r.tower = true; r.regionName = regionOf(s).name; }
    const nxt = STAGES.find(x => x.req === s.id);
    if (nxt) r.unlock = nxt.name;
  } else {
    r.gold = s.repeat.gold; r.lumber = s.repeat.lumber;
  }
  save.gold += r.gold; save.lumber += r.lumber;
  r.drop = rollManualDrop(s); r.dropGrade = s.dropGrade || 0;                           // random weapon drop, on every win (see DROP)
  persist();
  return r;
}
function bonusWin(m) {
  const d = dailyReward(m);
  save.gold += d.gold; save.lumber += d.lumber;
  save.daily = { date: today(), done: true };
  persist();
  return { title: 'Daily hunt', sub: MON[m].name + ' defeated', gold: d.gold, lumber: d.lumber, first: false, tower: false, unlock: null, drop: null, again: false };
}

/* ===================================================================
   BATTLE
   =================================================================== */
let B = null;
const cv = $('#stage'), ctx = cv.getContext('2d');

function startBattle(spec) {
  const slots = LAYOUT[spec.enemies.length] || LAYOUT[4];
  B = { spec, t: 0, over: false, result: null, endT: 0, heroes: [], enemies: [], fx: [], later: [], bar: { t: 0, cd: 0 }, last: 0, raf: 0 };
  party().forEach(id => {
    const st = heroStats(id);
    B.heroes.push({ id, hp: st.maxHp, maxHp: st.maxHp, cd: 0.4 + Math.random() * 0.4, draw: 0, swing: 0, heal: 2.5, dead: false, hit: 0, x: party().length === 1 ? 108 : HERO[id].x, y: HERO[id].y });
  });
  spec.enemies.forEach((type, i) => {
    const d = MON[type], pw = spec.power || { hp: 1, dmg: 1 }, hp = Math.round(d.hp * (spec.hpMult || 1) * pw.hp);
    B.enemies.push({ type, hp, maxHp: hp, x: slots[i][0], y: slots[i][1], cd: d.cd * (0.35 + 0.5 * Math.random() + i * 0.08),
      state: 'idle', kind: null, wt: 0, wd: 0, lunge: 0, lungeDur: 0.35, lungeDist: 0, flash: 0, dead: false, fade: 0,
      chargeT: d.charge ? d.charge.first : 0, dmgMult: pw.dmg, armMult: pw.arm || pw.dmg });
  });
  $('#battle-title').textContent = spec.title;
  $('#result').hidden = true;
  $('#battle').hidden = false;
  document.body.style.overflow = 'hidden';
  repeatUi();
  B.raf = requestAnimationFrame(loop);
}

function raiseBarrier() {
  if (!B || B.over || B.bar.t > 0 || B.bar.cd > 0) return;
  B.bar.t = BAR_DUR; B.bar.cd = BAR_CD;
  B.fx.push({ k: 'ring', x: 95, y: 178, t: 0, life: 0.5, c: '#7cc8ff' });
}

function loop(ts) {
  if (!B) return;
  const dt = Math.min(0.05, ((ts - B.last) / 1000) || 0);
  B.last = ts;
  B.t += dt;
  if (!B.over) step(dt); else fxStep(dt);
  if (B.over && B.t > B.endT && $('#result').hidden) showResult();
  draw();
  barrierUi();
  B.raf = requestAnimationFrame(loop);
}

const aliveH = () => B.heroes.filter(h => !h.dead);
const aliveE = () => B.enemies.filter(e => !e.dead);
const heroById = id => B.heroes.find(h => h.id === id);

function step(dt) {
  if (B.bar.t > 0) B.bar.t = Math.max(0, B.bar.t - dt);
  if (B.bar.cd > 0) B.bar.cd = Math.max(0, B.bar.cd - dt);

  for (const h of B.heroes) {
    if (h.dead) continue;
    h.hit = Math.max(0, h.hit - dt);
    h.swing = Math.max(0, h.swing - dt * 4);
    const st = heroStats(h.id), w = WEAPONS[save.heroes[h.id].weapon];
    if (w.heal) {
      h.heal -= dt;
      if (h.heal <= 0) h.heal = doHeal(h, st) ? 4 : 0.5;
    }
    if (h.draw > 0) { h.draw -= dt; if (h.draw <= 0) fireHero(h, st, w); continue; }
    h.cd -= dt;
    if (h.cd <= 0 && aliveE().length) {
      h.cd = w.int;
      if (h.id === 'tavi') h.draw = 0.25; else fireHero(h, st, w);
    }
  }

  for (const e of B.enemies) {
    const d = MON[e.type];
    if (e.dead) { e.fade += dt; continue; }
    e.flash = Math.max(0, e.flash - dt);
    e.lunge = Math.max(0, e.lunge - dt);
    if (!aliveH().length) continue;
    if (e.state === 'idle') {
      e.cd -= dt;
      if (d.charge) e.chargeT -= dt;
      if (d.charge && e.chargeT <= 0) startWind(e, 'charge');
      else if (e.cd <= 0) startWind(e, 'attack');
    } else {
      e.wt += dt;
      if (e.wt >= e.wd) strike(e);
    }
  }

  B.later = B.later.filter(l => { l.t -= dt; if (l.t <= 0) { l.cb(); return false; } return true; });
  fxStep(dt);

  if (!aliveE().length) endBattle('win');
  else if (!aliveH().length) endBattle('lose');
}

function fxStep(dt) {
  B.fx = B.fx.filter(f => {
    f.t += dt;
    if (f.k === 'proj' && f.t >= f.dur && !f.done) { f.done = true; if (f.cb) f.cb(); }
    return f.t < (f.k === 'proj' ? f.dur + 0.01 : f.life);
  });
}
const later = (t, cb) => B.later.push({ t, cb });
const floater = (x, y, text, c) => B.fx.push({ k: 'txt', x, y, text, c: c || '#fff', t: 0, life: 0.9 });

function firstEnemy() { return aliveE()[0]; }

function doHeal(h, st) {
  const cand = aliveH().filter(a => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!cand) return false;
  const amt = Math.round(st.heal);
  cand.hp = Math.min(cand.maxHp, cand.hp + amt);
  floater(cand.x, cand.y - unitTop(cand.id, 70), '+' + amt, '#8ff0a4');
  B.fx.push({ k: 'petals', x: cand.x, y: cand.y - 24, t: 0, life: 0.9 });
  h.swing = 1;
  return true;
}

function fireHero(h, st, w) {
  const t = firstEnemy();
  if (!t) return;
  h.swing = 1;
  if (!w.ranged) {
    w.hits.forEach((m, i) => {
      later(i * 0.12, () => {
        if (t.dead) return;
        hitEnemy(t, st.atk * m, i);
        if (w.splash) for (const o of aliveE()) if (o !== t) hitEnemy(o, st.atk * m * w.splash, i);
        if (aliveE().length === 0 && B && !B.over) endBattle('win');
      });
    });
  } else {
    const dm = st.atk * w.hits[0];
    B.fx.push({ k: 'proj', x0: h.x + 22, y0: h.y - 30, x1: t.x, y1: t.y - 22, t: 0, dur: 0.25, kind: h.id === 'tavi' ? 'arrow' : 'bolt',
      cb: () => { const tg = t.dead ? firstEnemy() : t; if (tg) hitEnemy(tg, dm, 0); } });
  }
}

function hitEnemy(e, raw, i) {
  const armor = MON[e.type].armor * (e.armMult || 1);
  const d = Math.max(1, Math.round(Math.max(raw * 0.25, raw - armor)));       // armor can take at most 3/4 of a hit
  e.hp -= d; e.flash = 0.15;
  floater(e.x + (i || 0) * 8, e.y - unitTop(e.type, 56 * MON[e.type].scale) - 4, '-' + d, '#fff');
  if (e.hp <= 0) { e.hp = 0; e.dead = true; }
}

function startWind(e, kind) {
  const d = MON[e.type];
  e.state = 'wind'; e.kind = kind; e.wt = 0;
  e.wd = kind === 'charge' ? d.charge.wind : d.wind;
}

function frontHero() { return aliveH()[0]; }

function hurt(h, dmg) {
  if (h.dead) return;
  if (B.bar.t > 0) { floater(h.x, h.y - unitTop(h.id, 70) - 4, 'Blocked', '#7cc8ff'); return; }
  const d = Math.round(dmg);
  h.hp -= d; h.hit = 0.25;
  floater(h.x, h.y - unitTop(h.id, 70) - 4, '-' + d, '#ff8a7a');
  if (h.hp <= 0) { h.hp = 0; h.dead = true; }
}

function strike(e) {
  const d = MON[e.type];
  const kind = e.kind;
  e.state = 'idle'; e.kind = null;
  if (kind === 'charge') {
    e.lungeDur = 0.55; e.lunge = 0.55; e.lungeDist = e.x - 150;
    later(0.2, () => {
      if (B.bar.t > 0) { floater(95, 110, 'Blocked!', '#7cc8ff'); B.fx.push({ k: 'ring', x: 95, y: 178, t: 0, life: 0.5, c: '#7cc8ff' }); }
      else for (const h of aliveH()) hurt(h, d.charge.dmg * e.dmgMult);
    });
    e.chargeT = d.charge.every;
    e.cd = Math.max(d.cd, 1.6);
    return;
  }
  e.cd = d.cd;
  if (d.tgt === 'front') {
    const t = frontHero();
    if (!t) return;
    e.lungeDur = 0.35; e.lunge = 0.35; e.lungeDist = Math.max(10, e.x - t.x - 36);
    later(0.15, () => hurt(t, d.dmg * e.dmgMult));
  } else {
    const back = aliveH().filter(h => h.id !== 'bren');
    const t = (back.length ? back : aliveH())[Math.floor(Math.random() * (back.length || aliveH().length))];
    if (!t) return;
    B.fx.push({ k: 'proj', x0: e.x - 10, y0: e.y - 28, x1: t.x, y1: t.y - 28, t: 0, dur: 0.45, kind: 'seed', cb: () => hurt(t, d.dmg * e.dmgMult) });
  }
}

function endBattle(result) {
  if (!B || B.over) return;
  B.over = true; B.result = result;
  B.endT = B.t + (result === 'retreat' ? 0 : 0.9);
  if (result === 'retreat') { if (run && run.wins) showRunSummary(); else closeBattle(); }
}

/* ------------------------- repeat fights (manual) ------------------------- */
// "∞ Repeat" keeps fighting the same stage by hand: after each win the rewards are paid and the next fight starts by itself.
// It stops on a defeat, on Retreat / switching it off, and after a first clear, a relit watchtower or a new area (those get the full screen).
let repeatOn = false, run = null;                     // run = what this streak of fights has earned
const newRun = () => ({ wins: 0, gold: 0, lumber: 0, drops: [] });
function addRun(r) {
  if (!run) run = newRun();
  run.wins++; run.gold += r.gold; run.lumber += r.lumber;
  if (r.drop) run.drops.push([r.drop, r.dropGrade]);
}
function dropsText(list) {
  const m = {};
  for (const [w, g] of list) m[g + ':' + w] = (m[g + ':' + w] || 0) + 1;
  return Object.entries(m).map(([k, n]) => { const [g, w] = k.split(':'); return (Number(g) ? GRADES[g].name + ' ' : '') + WEAPONS[w].name + (n > 1 ? ` ×${n}` : ''); }).join(', ');
}
function runLogHtml(now) {
  const t = run;
  return `${now ? `<div class="rl-now">${now}</div>` : ''}<div class="rl-tot"><b>${t.wins}</b> win${t.wins > 1 ? 's' : ''} so far ${resChip('gold', t.gold)}${resChip('lumber', t.lumber)}${t.drops.length ? `<span class="fl-find">Found: ${dropsText(t.drops)}</span>` : ''}</div>`;
}
function repeatUi() {
  const b = $('#repeat-btn'), L = $('#runlog');
  if (b) {
    b.hidden = !(B && B.spec.repeatable);
    b.classList.toggle('on', repeatOn);
    b.textContent = repeatOn ? '∞ Repeat on' : '∞ Repeat';
    b.setAttribute('aria-pressed', String(repeatOn));
  }
  if (L) { L.hidden = !(B && B.spec.repeatable && run && run.wins); if (!L.hidden) L.innerHTML = runLogHtml(B.nowMsg); }
}
function restartBattle() { const s = B.spec; clearTimeout(B.autoT); cancelAnimationFrame(B.raf); B = null; startBattle(s); }
/* The end-of-run screen (Retreat, or Repeat switched off while waiting for the next fight). */
function showRunSummary() {
  if (!B) return;
  clearTimeout(B.autoT);
  if (B.result === 'win' && !B.resolved) addRun(B.spec.onWin());          // a win that was still counting down is paid, not lost
  B.resolved = true; B.over = true; repeatOn = false;
  const t = run || newRun(), r = $('#result');
  r.innerHTML = `<div class="box rescard win"><div class="rhead"><h2 class="rtitle">Repeat run</h2><p class="rsub2">${B.spec.title} · ${t.wins} fight${t.wins === 1 ? '' : 's'} won</p></div>
    <div class="rbody"><div class="rtiles"><div class="rtile"><i class="ico gold"></i><b class="count" data-to="${t.gold}">+0</b><small>Gold</small></div>
      <div class="rtile"><i class="ico lumber"></i><b class="count" data-to="${t.lumber}">+0</b><small>Lumber</small></div></div>
      ${t.drops.length ? `<div class="unlockbar"><i class="ico m swords"></i><span><b>Weapons found:</b> ${dropsText(t.drops)}</span></div>` : '<p class="note">No weapons dropped this run.</p>'}
      <div class="rbtns"><button class="btn primary" data-act="__close">Back to the village</button><button class="btn alt" data-act="__again"><i class="ico m swords"></i>Fight again</button></div></div></div>`;
  r.hidden = false; repeatUi(); animateCounts(r);
}
const runSumHtml = (min = 2) => (run && run.wins >= min ? `<div class="runsum"><small>Repeat run</small>${runLogHtml()}</div>` : '');

/* ------------------------------ farm log ------------------------------ */
const fmtDur = m => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
/* Keeps the last 30 trips; returns false when there was nothing to log. */
function logFarm(e) {
  if (!(e.gold || e.lumber || e.found.length)) return false;
  save.farmLog = [e].concat(save.farmLog || []).slice(0, 30);
  return true;
}
function farmLogCard() {
  const L = save.farmLog || [];
  if (!L.length) return '';
  const tot = L.reduce((a, e) => (a.gold += e.gold, a.lumber += e.lumber, a.n += e.found.length, a), { gold: 0, lumber: 0, n: 0 });
  const rows = L.map(e => {
    const s = STAGE[e.stage] || { name: e.stage };
    const when = new Date(e.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<li><div class="fl-top"><b>${s.name}</b><small>${when} · out ${fmtDur(e.mins)}</small></div>
      <div class="fl-got">${resChip('gold', e.gold)}${resChip('lumber', e.lumber)}${e.found.length ? `<span class="fl-find">Found: ${dropNames(e.found, e.grade)}</span>` : ''}</div></li>`;
  }).join('');
  return `<details class="card farmlog" data-key="farmlog" ${uiOpen.has('farmlog') ? 'open' : ''}><summary><span>Farm log</span><em>${L.length} trip${L.length > 1 ? 's' : ''}</em></summary>
    <p class="sub">All trips in this log: ${resChip('gold', tot.gold)}${resChip('lumber', tot.lumber)}${tot.n ? `<span class="fl-find">${tot.n} weapon${tot.n > 1 ? 's' : ''}</span>` : ''}</p><ul class="fl-list">${rows}</ul></details>`;
}
function closeFarmReport() { const d = document.getElementById('farm-report'); if (d) d.remove(); }
function showFarmReport(e) {
  closeFarmReport();
  const d = document.createElement('div');
  d.className = 'result dialog'; d.id = 'farm-report';
  d.innerHTML = `<div class="box"><h2>Farm report</h2><p class="note">${STAGE[e.stage].name} · out for ${fmtDur(e.mins)}</p>
    <div class="rtiles"><div class="rtile"><i class="ico gold"></i><b>+${fmt(e.gold)}</b><small>Gold</small></div><div class="rtile"><i class="ico lumber"></i><b>+${fmt(e.lumber)}</b><small>Lumber</small></div></div>
    ${e.found.length ? `<div class="unlockbar"><i class="ico m swords"></i><span><b>Weapons found:</b> ${dropNames(e.found, e.grade)}</span></div>` : '<p class="note">No weapons this time. Long trips have a better chance, and fighting by hand has the best.</p>'}
    <div class="stack"><button class="btn primary" data-act="farmreportok">Nice!</button></div></div>`;
  d.addEventListener('click', ev => { if (ev.target === d) closeFarmReport(); });
  document.body.appendChild(d);
}

/* ------------------------------ result screens ------------------------------ */
const STAR_RATINGS = ['', 'Narrow win', 'Well fought', 'Flawless'];
function starRating() {
  const hs = B.heroes, fallen = hs.filter(h => h.dead).length;
  const ratio = hs.reduce((a, h) => a + h.hp, 0) / hs.reduce((a, h) => a + h.maxHp, 0);
  return fallen ? 1 : ratio >= 0.6 ? 3 : 2;
}
function heroesRow() {
  return `<div class="vheroes">${B.heroes.map(h => {
    const pct = Math.round(100 * h.hp / h.maxHp);
    return `<div class="vhero ${h.dead ? 'down' : ''}"><canvas class="vport" data-hero="${h.id}" data-scale="1.05" width="112" height="122"></canvas>
      <div class="vbar"><i class="${pct < 35 ? 'low' : ''}" style="width:${pct}%"></i></div></div>`;
  }).join('')}</div>`;
}
function dropCardHtml(w, g) {
  const W = WEAPONS[w], n = save.items[w][g], ready = g < GRADES.length - 1 && n >= MERGE_N, next = GRADES[g + 1] && GRADES[g + 1].name;
  const pips = Array.from({ length: MERGE_N }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  return `<div class="dropcard" style="--g:${GRADES[g].color}">
    <div class="vport big">${itemIcon(w)}</div>
    <div class="dinfo2"><small>New weapon!</small><b>${W.name}</b>
      <div class="dline">${gradeTag(g)}<span class="pips">${pips}</span></div>
      <p>${next ? (ready ? `You have ${n} ${GRADES[g].name} copies: merge them into a ${next} ${W.name}.` : `${n} of ${MERGE_N} copies toward a ${next} ${W.name}.`) : `A ${GRADES[g].name} ${W.name}!`}</p>
      ${ready ? '<button class="btn good small" data-act="__forge">Open Forge</button>' : ''}</div></div>`;
}
function winHtml(r) {
  const stars = starRating();
  const tiles = [['gold', 'Gold', r.gold], ['lumber', 'Lumber', r.lumber]].filter(t => t[2] > 0)
    .map(([k, label, n]) => `<div class="rtile"><i class="ico ${k}"></i><b class="count" data-to="${n}">+0</b><small>${label}</small></div>`).join('');
  return `<div class="box rescard win">
    <div class="rhead"><h2 class="rtitle">Victory!</h2><p class="rsub2">${r.title} · ${r.sub}</p>
      <div class="stars">${[1, 2, 3].map(i => `<i class="${i <= stars ? 'on' : ''}"></i>`).join('')}</div>
      <p class="rrating">${STAR_RATINGS[stars]}</p></div>
    <div class="rbody">
      ${heroesRow()}
      ${tiles ? `<div class="rtiles">${tiles}</div>` : ''}
      ${r.drop ? dropCardHtml(r.drop, r.dropGrade) : ''}
      ${r.tower ? `<div class="unlockbar"><i class="ico m flame"></i><span><b>The ${r.regionName} watchtower is relit!</b> ${r.unlock ? '' : "That's every watchtower: more areas will open in a later version."}</span></div>` : ''}
      ${r.unlock ? `<div class="unlockbar"><i class="ico m unlock"></i><span><b>New area open:</b> ${r.unlock}</span></div>` : ''}
      ${runSumHtml()}
      <div class="rbtns"><button class="btn primary" data-act="__close">Back to the village</button>${r.again ? '<button class="btn alt" data-act="__again"><i class="ico m swords"></i>Fight again</button>' : ''}${r.again && B.spec.repeatable ? '<button class="btn alt" data-act="__repeat">∞ Repeat</button>' : ''}</div>
    </div></div>`;
}
function defeatTips() {
  const tips = [];
  if (B.spec.enemies.includes('boar')) tips.push({ t: 'The Thornback Boar scrapes the ground before it charges. Raise the barrier the moment you see the warning.' });
  const unhired = HERO_ORDER.filter(id => !inParty(id)).sort((a, b) => HERO[a].hire - HERO[b].hire)[0];
  const lvlId = party().find(id => save.gold >= lvlCost(save.heroes[id].lvl));
  const mergeReady = Object.keys(WEAPONS).some(w => save.items[w].some((n, g) => g < GRADES.length - 1 && n >= MERGE_N));
  if (unhired && save.gold >= HERO[unhired].hire) tips.push({ t: `You have enough gold to hire ${HERO[unhired].name}. A bigger party hits harder.`, btn: ['Open Party', '__party'] });
  else if (lvlId) tips.push({ t: `You can afford to level up ${HERO[lvlId].name}.`, btn: ['Open Party', '__party'] });
  else if (mergeReady) tips.push({ t: 'Some of your weapons can be merged into a stronger grade.', btn: ['Open Forge', '__forge'] });
  if (!tips.length) tips.push({ t: 'Heroes recover fully in the village. Raise the barrier sooner, or farm some gold and level up.' });
  return tips.slice(0, 2);
}
function loseHtml() {
  const tips = defeatTips();
  return `<div class="box rescard lose">
    <div class="rhead"><h2 class="rtitle">Your party fell back</h2><p class="rsub2">${B.spec.title}</p></div>
    <div class="rbody">
      ${heroesRow()}
      ${runSumHtml(1)}
      <div class="tipcard">${tips.map(x => `<p>${x.t}${x.btn ? ` <button class="btn alt small" data-act="${x.btn[1]}">${x.btn[0]}</button>` : ''}</p>`).join('')}</div>
      <div class="rbtns"><button class="btn primary" data-act="__again"><i class="ico m swords"></i>Try again</button><button class="btn alt" data-act="__close">Back to the village</button></div>
    </div></div>`;
}
/* Numbers count up from 0 so rewards feel earned (instantly for people who prefer reduced motion). */
function animateCounts(root) {
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('.count').forEach((el, i) => {
    const to = Number(el.dataset.to), t0 = performance.now() + 350 + i * 150, dur = 700;
    if (still) { el.textContent = '+' + fmt(to); return; }
    const tick = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / dur));
      el.textContent = '+' + fmt(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && el.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function showResult() {
  const r = $('#result');
  if (!r.hidden || !B || B.resolved) return;
  B.resolved = true;
  if (B.result === 'win') {
    const w = B.spec.onWin();
    B.lastR = w;
    if (repeatOn && B.spec.repeatable) {
      addRun(w);
      if (!(w.first || w.tower || w.unlock)) {                       // a plain win: pay it, show a line in the log and go again
        B.nowMsg = `Victory! +${fmt(w.gold)} gold, +${fmt(w.lumber)} lumber${w.drop ? ` · Found ${dropsText([[w.drop, w.dropGrade]])}` : ''}. Next fight starting…`;
        repeatUi();
        const cur = B;
        B.autoT = setTimeout(() => { if (B === cur && repeatOn) restartBattle(); }, 1500);
        return;
      }
      repeatOn = false;                                              // a first clear, a watchtower or a new area gets the full screen
    }
    r.innerHTML = winHtml(w);
  } else { repeatOn = false; r.innerHTML = loseHtml(); }
  repeatUi();
  r.hidden = false;
  paintPortraits();
  animateCounts(r);
}
actions.__party = () => { closeBattle(); actions.tab('party'); };
actions.__forge = () => { closeBattle(); actions.tab('forge'); };
actions.__close = () => closeBattle();
actions.__again = () => { if (!repeatOn) run = null; restartBattle(); };
actions.__repeat = () => { run = newRun(); if (B.lastR) addRun(B.lastR); repeatOn = true; restartBattle(); };
actions.repeat = () => {
  if (!B || !B.spec.repeatable) return;
  repeatOn = !repeatOn;
  if (!repeatOn) { clearTimeout(B.autoT); if (B.resolved && B.result === 'win' && $('#result').hidden) { showRunSummary(); return; } }
  repeatUi();
};
actions.farmreportok = closeFarmReport;

function closeBattle() {
  if (B) { cancelAnimationFrame(B.raf); clearTimeout(B.autoT); }
  repeatOn = false; run = null;
  B = null;
  $('#battle').hidden = true;
  $('#result').hidden = true;
  document.body.style.overflow = '';
  render();
}

function barrierUi() {
  const btn = $('#barrier'), fill = $('#barrier-fill'), lab = $('#barrier-label');
  const w = $('#warn');
  if (B.bar.t > 0) {
    btn.classList.remove('cool'); fill.style.transform = `scaleX(${B.bar.t / BAR_DUR})`; lab.textContent = 'Barrier up!';
  } else if (B.bar.cd > 0) {
    btn.classList.add('cool'); fill.style.transform = `scaleX(${1 - B.bar.cd / BAR_CD})`; lab.textContent = `Recharging ${B.bar.cd.toFixed(1)}s`;
  } else {
    btn.classList.remove('cool'); fill.style.transform = 'scaleX(1)'; lab.textContent = 'Raise barrier';
  }
  const warn = B.enemies.some(e => !e.dead && e.state === 'wind' && e.kind === 'charge');
  w.textContent = warn ? '⚠ The boar is scraping the ground – raise the barrier!' : '';
  w.classList.toggle('on', warn);
}
cv.addEventListener('pointerdown', () => { if (B) raiseBarrier(); });

/* ===================================================================
   DRAWING
   =================================================================== */
const ell = (c, x, y, rx, ry, rot) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); };
const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };

/* drawSword, drawHero, drawMon and drawBackground live in art.js (loaded first). */

function drawBar(c, x, y, w, frac, col) {
  c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  c.fillStyle = col; c.fillRect(x - w / 2, y, w * Math.max(0, frac), 4);
}

/* Height of a unit above its feet, so bars and numbers clear the head (sprites.js taller than the vector art). */
const unitTop = (id, fallback) => (typeof spriteHeight === 'function' && spriteHeight(id)) || fallback;

/* Health bars, effects and the barrier use art.js hooks when present; the plain versions below are fallbacks. */
function hpBar(c, x, y, w, frac, kind) {
  if (typeof drawHpBar === 'function') drawHpBar(c, x, y, w, frac, kind);
  else drawBar(c, x, y, w, frac, kind === 'enemy' ? '#e0624a' : '#6cc37c');
}

function draw() {
  const c = ctx;
  c.setTransform(cv.width / 400, 0, 0, cv.height / 260, 0, 0);
  c.filter = 'none'; c.globalAlpha = 1;
  drawBackground(c);

  const warn = B.enemies.some(e => !e.dead && e.state === 'wind' && e.kind === 'charge');
  const items = [];
  for (const h of B.heroes) items.push({ y: h.y, f: () => {
    const w = save.heroes[h.id].weapon;
    drawHero(c, h.id, h.x, h.y, { weapon: w, t: B.t, swing: h.swing, lean: h.draw > 0 ? 1 - h.draw / 0.25 : 0, dead: h.dead, hit: h.hit,
      brace: h.id === 'bren' && B.bar.t > 0 });
    if (!h.dead) hpBar(c, h.x, h.y - unitTop(h.id, 70) - 8, 34, h.hp / h.maxHp, 'hero');
  } });
  for (const e of B.enemies) items.push({ y: e.y, f: () => {
    if (e.dead && e.fade > 0.7) return;
    const wf = e.state === 'wind' ? Math.min(1, e.wt / e.wd) : 0;
    const lf = e.lunge > 0 ? 1 - e.lunge / e.lungeDur : 0;
    const off = e.lunge > 0 ? e.lungeDist * Math.sin(Math.PI * lf) : 0;
    const scrape = e.state === 'wind' && e.kind === 'charge' ? wf : 0;
    // art.js paints its own charge lane, cracks and dust (artBattleGround); this is only the fallback.
    if (scrape && typeof artBattleGround !== 'function') {
      c.fillStyle = 'rgba(200,170,120,.35)';
      for (let i = 0; i < 4; i++) { const k = (B.t * 3 + i * 0.25) % 1; ell(c, e.x - 56 - k * 22, e.y - 2 - k * 18, 4 + k * 4, 3 + k * 2); c.fill(); }
      c.strokeStyle = `rgba(255,90,60,${0.25 + 0.25 * Math.sin(B.t * 18)})`; c.lineWidth = 3;
      c.beginPath(); c.moveTo(e.x - 60, e.y + 4); c.lineTo(150, e.y + 4); c.stroke();
    }
    drawMon(c, e.type, e.x, e.y, { t: B.t, wind: e.kind === 'charge' ? 0 : wf, scrape, lunge: off, flash: e.flash, dead: e.dead, fade: e.fade });
    if (!e.dead) {
      const sc = MON[e.type].scale;
      hpBar(c, e.x, e.y - unitTop(e.type, 62 * sc) - 6, 36 * Math.min(1.6, sc), e.hp / e.maxHp, 'enemy');
      if (e.state === 'wind') {
        const pulse = 0.6 + 0.4 * Math.sin(B.t * 20);
        c.fillStyle = e.kind === 'charge' ? `rgba(255,70,50,${pulse})` : `rgba(255,210,90,${pulse})`;
        c.font = `bold ${e.kind === 'charge' ? 26 : 16}px sans-serif`; c.textAlign = 'center';
        c.fillText('!', e.x, e.y - unitTop(e.type, 62 * sc) - 14);
      }
    }
  } });
  items.sort((a, b) => a.y - b.y).forEach(i => i.f());

  if (B.bar.t > 0 && typeof drawBarrier === 'function') {
    drawBarrier(c, B.t, B.bar.t / BAR_DUR);
  } else if (B.bar.t > 0) {
    const f = B.bar.t / BAR_DUR, p = 0.5 + 0.5 * Math.sin(B.t * 14);
    const g = c.createRadialGradient(95, 170, 20, 95, 170, 105);
    g.addColorStop(0, 'rgba(124,200,255,0)'); g.addColorStop(1, `rgba(124,200,255,${0.2 + 0.15 * p})`);
    c.fillStyle = g; ell(c, 95, 168, 100 * (0.9 + 0.1 * f), 82); c.fill();
    c.strokeStyle = `rgba(160,220,255,${0.6 + 0.3 * p})`; c.lineWidth = 3; ell(c, 95, 168, 100 * (0.9 + 0.1 * f), 82); c.stroke();
  }

  for (const f of B.fx) {
    if (typeof drawFx === 'function' && drawFx(c, f, B.t)) continue;
    const k = f.t / (f.life || f.dur || 1);
    if (f.k === 'txt') {
      c.globalAlpha = 1 - k * k; c.fillStyle = f.c; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 3;
      c.font = 'bold 15px sans-serif'; c.textAlign = 'center';
      c.strokeText(f.text, f.x, f.y - k * 24); c.fillText(f.text, f.x, f.y - k * 24); c.globalAlpha = 1;
    } else if (f.k === 'proj') {
      const q = Math.min(1, f.t / f.dur), x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q - Math.sin(q * Math.PI) * 14;
      if (f.kind === 'arrow') {
        const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
        c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = '#f4ead0'; c.fillRect(-9, -1, 16, 2); c.fillStyle = '#cfd8e3'; poly(c, [7, -3, 12, 0, 7, 3]); c.fill(); c.restore();
      } else if (f.kind === 'bolt') {
        c.fillStyle = 'rgba(210,190,255,.4)'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
        c.fillStyle = '#e6d8ff'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
      } else {
        c.fillStyle = '#d9c16a'; ell(c, x, y, 5, 3, q * 12); c.fill();
      }
    } else if (f.k === 'ring') {
      c.globalAlpha = 1 - k; c.strokeStyle = f.c; c.lineWidth = 4; c.beginPath(); c.arc(f.x, f.y, 20 + k * 90, 0, 7); c.stroke(); c.globalAlpha = 1;
    } else if (f.k === 'petals') {
      c.globalAlpha = 1 - k * 0.7;
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + k * 3, r = 14 + k * 16;
        c.fillStyle = i % 2 ? '#ff9ec4' : '#f4ead0'; ell(c, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.55, 4, 2.3, a); c.fill();
      }
      c.globalAlpha = 1;
    }
  }
  if (warn) { c.fillStyle = `rgba(255,60,40,${0.06 + 0.05 * Math.sin(B.t * 16)})`; c.fillRect(0, 0, 400, 260); }
}

/* ----------------------------- boot --------------------------------- */
(function boot() {
  // Welcome back message if the party has been out a while.
  const g = farmGain();
  render();
  if (g && g.mins >= 1) toast(`Your party gathered ${gainText(g)} while you were away.`);
  window.__wl = { get save() { return save; }, persist, render, actions, startBattle, get B() { return B; } };
})();
