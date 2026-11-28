'use strict';
/* Sound effects live in sfx.js (synthesised, no files). snd() never throws and does nothing until the first tap. */
/* what a monster is, for its sounds (growl, strike, death) */
const MON_CAT = { brushfang: 'beast', frostwolf: 'beast', barkbear: 'beast', boar: 'giant', snowyeti: 'giant', frostgiant: 'giant', stormdrake: 'dragon',
  hornet: 'insect', beetle: 'insect', bogtoad: 'frog', bogking: 'frog', mireadder: 'snake', mossturtle: 'crab', magmacrab: 'crab',
  icegolem: 'golem', sentinel: 'golem', cinderbat: 'bat', spitter: 'plant', reedwisp: 'spirit', mistheg: 'hag', rimesprite: 'ice', emberimp: 'fire' };
const monCat = type => MON_CAT[type] || 'beast';
/* what a monster is made of, for the sound of the weapon landing on it */
const MON_MAT = { hornet: 'armored', beetle: 'armored', mossturtle: 'armored', magmacrab: 'armored', stormdrake: 'armored', bogtoad: 'slime', bogking: 'slime',
  icegolem: 'golem', sentinel: 'golem', spitter: 'plant', reedwisp: 'ghost', mistheg: 'ghost', rimesprite: 'ghost', emberimp: 'ghost' };
const monMat = type => MON_MAT[type] || 'beast';
const HEAVY_WEAPONS = ['great', 'falchion', 'longbow', 'crossbow', 'buckler'];
const snd = (n, a) => { try { if (window.sfx) window.sfx.play(n, a); } catch (e) { /* ignore */ } };
/* =====================================================================
   Wildlight Expedition – first playable version
   Heroes: Milo (the starter), Bren, Tavi, Iona, Rook, Elric, Maren, Tobin · Stages: Pinewood Path, Ironroot Hollow,
   Thornback Crossing · Weapons: standard sword, twin swords, greatsword,
   hunting bow, wooden staff.
   ===================================================================== */

/* ---------------------------- data ---------------------------------- */
const HERO = {
  milo: { hire: 0, name: 'Milo Dunn', role: 'Villager · Beginner', family: 'tool', start: 'pitchfork', row: 'front', hp: 70, atk: 5.5,
          blurb: 'A farmhand with a pitchfork and a lot of heart. Not strong yet, but he grows with every level.' },
  bren: { hire: 200, name: 'Bren Alder', role: 'Guardian · Front line', family: 'sword', start: 'sword', row: 'front', tank: true, hp: 120, atk: 8,
          blurb: 'Stands in front and takes most melee hits.' },
  tavi: { hire: 500, name: 'Tavi Reed', role: 'Archer · Ranged damage', family: 'bow', start: 'bow', row: 'back', draws: true, hp: 70, atk: 7,
          blurb: 'Fires from behind the front line. A quick backward lean before each shot.' },
  iona: { hire: 1200, name: 'Iona Moss', role: 'Herbalist · Healing', family: 'staff', start: 'staff', row: 'back', hp: 70, atk: 4,
          blurb: 'Casts bolts from the back and heals the weakest ally. A ring of petals shows who was healed.' },
  rook: { hire: 3000, name: 'Rook', role: 'Rogue · Quick crits', family: 'dagger', start: 'dagger', row: 'front', hp: 80, atk: 8.5,
          blurb: 'Fast hands and a sharp eye for weak spots: he crits a lot, but a few hits will put him down.' },
  elric: { hire: 8000, name: 'Elric Vane', role: 'Mage · Spell damage', family: 'tome', start: 'tome', row: 'back', hp: 60, atk: 9,
          blurb: 'A scholar who burns monsters from the back line. Fragile, but his spells hit hard.' },
  maren: { hire: 20000, name: 'Maren Ashe', role: 'Lancer · Long reach', family: 'spear', start: 'spear', row: 'front', tank: true, hp: 115, atk: 9,
          blurb: 'Her spear reaches past the first monster. Steady and hard to move.' },
  tobin: { hire: 50000, name: 'Brother Tobin', role: 'Monk · Sturdy brawler', family: 'fist', start: 'wraps', row: 'front', hp: 150, atk: 8,
          blurb: 'Takes a beating and hits back with both fists.' },
};
const HERO_ORDER = ['milo', 'bren', 'tavi', 'iona', 'rook', 'elric', 'maren', 'tobin'];
const MAX_PARTY = 4;                                             // heroes in a fight; the others rest in camp
const SLOTS = [[138, 186], [102, 214], [72, 152], [58, 196]];    // where the party stands, front hero first
const FAMILY = { tool: 'Tool', sword: 'Sword', dagger: 'Dagger', spear: 'Spear', fist: 'Fist', bow: 'Bow', staff: 'Staff', tome: 'Tome' };
const FAMILY_PLURAL = { tool: 'Tools', sword: 'Swords', dagger: 'Daggers', spear: 'Spears', fist: 'Fists', bow: 'Bows', staff: 'Staves', tome: 'Tomes' };
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
  // Weapons that only drop. pose = which hero picture is drawn in battle; pierce = share of armor ignored; shield = damage the wielder avoids;
  // healMult = stronger heals; splash on a ranged weapon hits every other monster for that share.
  falchion:   { name: 'Falchion', fam: 'sword', hits: [1.3], int: 1.1, pose: 'sword',
                desc: 'A heavy curved blade. Hits harder than the standard sword, a little slower.' },
  saber:      { name: 'Saber', fam: 'sword', hits: [0.4, 0.4, 0.4], int: 1.0, pose: 'twin',
                desc: 'Three fast slashes per attack. Great against unarmored monsters.' },
  rapier:     { name: 'Rapier', fam: 'sword', hits: [0.9], int: 0.9, pierce: 0.6, pose: 'sword',
                desc: 'A quick thrusting blade that slips past 60% of a monster\'s armor.' },
  buckler:    { name: 'Sword & shield', fam: 'sword', hits: [0.85], int: 1.0, shield: 0.25, pose: 'sword',
                desc: 'Less damage, but the wielder takes 25% less damage from every hit.' },
  shortbow:   { name: 'Hawk bow', fam: 'bow', hits: [0.55], int: 0.55, ranged: true,
                desc: 'A light bow that fires very fast, weaker arrows.' },
  longbow:    { name: 'Longbow', fam: 'bow', hits: [1.7], int: 1.5, ranged: true,
                desc: 'Slow, powerful shots that hit hard.' },
  crossbow:   { name: 'Crossbow', fam: 'bow', hits: [1.4], int: 1.4, ranged: true, pierce: 0.7,
                desc: 'Heavy bolts that ignore 70% of a monster\'s armor.' },
  heartwood:  { name: 'Heartwood staff', fam: 'staff', hits: [0.7], int: 1.2, ranged: true, heal: true, healMult: 1.5,
                desc: 'Weaker bolts, but its heals are 50% stronger.' },
  stormstaff: { name: 'Storm staff', fam: 'staff', hits: [1], int: 1.5, ranged: true, heal: true, splash: 0.5,
                desc: 'Lightning that also hits every other monster for half damage.' },
  pitchfork:  { name: 'Pitchfork', fam: 'tool', hits: [1], int: 1.1, starter: true,
                desc: 'A farm tool: a plain, steady jab.' },
  woodaxe:    { name: 'Wood axe', fam: 'tool', hits: [1.5], int: 1.7,
                desc: 'Slow, heavy chops.' },
  club:       { name: 'Club', fam: 'tool', hits: [1.2], int: 1.2, pose: 'woodaxe',
                desc: 'A gnarled club that hits a bit harder than a pitchfork.' },
  dagger:     { name: 'Dagger', fam: 'dagger', hits: [0.7], int: 0.6, starter: true,
                desc: 'Very quick stabs.' },
  twindaggers: { name: 'Twin daggers', fam: 'dagger', hits: [0.45, 0.45], int: 0.7,
                desc: 'Two quick cuts per attack.' },
  tome:       { name: 'Apprentice tome', fam: 'tome', hits: [1], int: 1.3, ranged: true, starter: true,
                desc: 'Throws small bursts of fire from its pages.' },
  grimoire:   { name: 'Grimoire', fam: 'tome', hits: [1.6], int: 1.9, ranged: true, splash: 0.4,
                desc: 'Slow fireballs that also scorch the monsters beside the target.' },
  spear:      { name: 'Spear', fam: 'spear', hits: [1.1], int: 1.1, behind: 0.6, starter: true,
                desc: 'Reaches past the first monster: the one behind it takes 60%.' },
  halberd:    { name: 'Halberd', fam: 'spear', hits: [1.6], int: 1.7, splash: 0.5,
                desc: 'A wide sweep that hits every monster for half damage.' },
  wraps:      { name: 'Hand wraps', fam: 'fist', hits: [0.45, 0.45], int: 0.8, starter: true,
                desc: 'Two quick punches.' },
  gauntlets:  { name: 'Iron gauntlets', fam: 'fist', hits: [1.2], int: 1.0, shield: 0.1,
                desc: 'Heavy punches, and 10% less damage taken.' },
  frostwand:  { name: 'Frost wand', fam: 'staff', hits: [0.5], int: 0.6, ranged: true, heal: true,
                desc: 'Quick, light bolts of frost, and it still heals.' },
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
  hornet: { name: 'Thicket Hornet', role: 'Pack melee', hp: 24, armor: 0, cd: 1.8, wind: 0.5, dmg: 6, tgt: 'front', scale: 0.95 },
  barkbear: { name: 'Barkbear', role: 'Armored melee', hp: 88, armor: 3, cd: 2.6, wind: 0.55, dmg: 9, tgt: 'front', scale: 1.1 },
  mireadder: { name: 'Mire Adder', role: 'Pack melee', hp: 52, armor: 0, cd: 2.0, wind: 0.5, dmg: 8, tgt: 'front', scale: 1 },
  mistheg: { name: 'Mist Hag', role: 'Ranged attacker', hp: 44, armor: 0, cd: 3, wind: 0.8, dmg: 9, tgt: 'back', scale: 1 },
  rimesprite: { name: 'Rime Sprite', role: 'Ranged attacker', hp: 34, armor: 0, cd: 2.8, wind: 0.75, dmg: 8, tgt: 'back', scale: 0.95 },
  snowyeti: { name: 'Snow Yeti', role: 'Armored melee', hp: 150, armor: 3, cd: 3.0, wind: 0.65, dmg: 13, tgt: 'front', scale: 1.25 },
  cinderbat: { name: 'Cinder Bat', role: 'Pack melee', hp: 36, armor: 0, cd: 1.9, wind: 0.5, dmg: 10, tgt: 'front', scale: 0.95 },
  sentinel: { name: 'Obsidian Sentinel', role: 'Armored melee', hp: 130, armor: 4, cd: 2.8, wind: 0.65, dmg: 12, tgt: 'front', scale: 1.25 },
  stormdrake: { name: 'Storm Drake', role: 'Stage boss', hp: 1200, armor: 1, cd: 2.4, wind: 0.45, dmg: 16, tgt: 'front', scale: 1.8, boss: true, charge: { first: 6, every: 8, wind: 1.3, dmg: 58 } },
};

/* Critical hits. A weapon's crit chance (plus 1% per grade of the best copy) and the monsters' crit chance are rolled on every hit;
   a crit does x1.7 (hero hits) or x1.5 (monster hits, never the telegraphed boss charge). */
const CRIT = { hero: 1.7, mon: 1.5, perGrade: 0.01 };
const WEAPON_CRIT = { sword: 0.06, twin: 0.08, great: 0.10, falchion: 0.08, saber: 0.10, rapier: 0.15, buckler: 0.04,
  bow: 0.08, shortbow: 0.12, longbow: 0.14, crossbow: 0.18, staff: 0.05, heartwood: 0.04, stormstaff: 0.07, frostwand: 0.10,
  pitchfork: 0.05, woodaxe: 0.08, club: 0.06, dagger: 0.15, twindaggers: 0.18, tome: 0.08, grimoire: 0.10, spear: 0.07, halberd: 0.09, wraps: 0.08, gauntlets: 0.10 };
for (const w of Object.keys(WEAPONS)) WEAPONS[w].crit = WEAPON_CRIT[w] || 0.05;
const MON_CRIT = { brushfang: 0.08, hornet: 0.10, mireadder: 0.08, frostwolf: 0.08, cinderbat: 0.10,
  beetle: 0.04, barkbear: 0.05, mossturtle: 0.04, icegolem: 0.05, snowyeti: 0.06, magmacrab: 0.05, sentinel: 0.05,
  spitter: 0.07, reedwisp: 0.07, mistheg: 0.08, rimesprite: 0.08, emberimp: 0.08,
  boar: 0.08, bogking: 0.08, frostgiant: 0.08, stormdrake: 0.10 };
for (const m of Object.keys(MON)) MON[m].crit = MON_CRIT[m] || 0.05;

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
   (a party with that level, a weapon grade that fits the region, and its skills win comfortably). */
const STAGES = [
  { id: 'path', name: 'Pinewood Path', region: 'vale', req: null, enemies: ['brushfang', 'brushfang', 'hornet', 'hornet'],
    waves: { 1: ['brushfang', 'brushfang'], 2: ['brushfang', 'brushfang', 'brushfang'] },      // fewer monsters for a party of 1 or 2
    blurb: 'A pack of Brushfangs. Best for farming gold.', farm: { gold: 4, lumber: 0.3 }, best: 'Gold',
    first: { gold: 60, lumber: 5 }, drops: [['sword', 3], ['bow', 3], ['staff', 3], ['twin', 1], ['shortbow', 1], ['falchion', 1], ['pitchfork', 1], ['club', 1], ['dagger', 1], ['wraps', 1]], dropGrade: 0, repeat: { gold: 12, lumber: 0 }, sky: ['#2d5a45', '#14301f'],
    power: { hp: 1, dmg: 1 }, rec: 1 },
  { id: 'hollow', name: 'Ironroot Hollow', region: 'vale', req: 'path', enemies: ['beetle', 'barkbear', 'spitter'],
    waves: { 1: ['beetle', 'spitter'] },
    blurb: 'Rustshell Beetles screen a Pinecap Spitter. Best for farming lumber.', farm: { gold: 1.5, lumber: 1.5 }, best: 'Lumber',
    first: { gold: 120, lumber: 10 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 1.5], ['heartwood', 1], ['saber', 1], ['longbow', 1], ['woodaxe', 1], ['tome', 1], ['spear', 1]], dropGrade: 0, repeat: { gold: 15, lumber: 1 }, sky: ['#27495a', '#102430'],
    power: { hp: 1, dmg: 1 }, rec: 2 },
  { id: 'crossing', name: 'Thornback Crossing', region: 'vale', req: 'hollow', enemies: ['boar'], boss: true,
    blurb: 'The Thornback Boar fights alone. Defeat it to relight the watchtower and open the next road.',
    farm: { gold: 6, lumber: 2.5 }, best: 'Gold + lumber',
    first: { gold: 300, lumber: 20, tower: true }, drops: [['twin', 2], ['great', 2], ['sword', 1], ['bow', 1], ['staff', 1], ['buckler', 1.5], ['rapier', 1], ['twindaggers', 1], ['halberd', 0.5]], dropGrade: 0, repeat: { gold: 40, lumber: 3 }, sky: ['#5a4a3a', '#2a1f17'],
    power: { hp: 1, dmg: 1 }, rec: 4 },
  { id: 'mirewood', name: 'Mirewood Edge', region: 'mire', req: 'crossing', enemies: ['bogtoad', 'mireadder', 'mireadder', 'reedwisp'],
    blurb: 'Bog Toads lurk in the reeds while a Reed Wisp lights their way.', farm: { gold: 7, lumber: 4.4 }, best: 'Lumber',
    first: { gold: 465, lumber: 30 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 1.5], ['falchion', 1.5], ['shortbow', 1.5], ['heartwood', 1.5], ['pitchfork', 1.5], ['dagger', 1.5], ['wraps', 1.5], ['tome', 1.5]], dropGrade: 1, repeat: { gold: 60, lumber: 4 }, sky: ['#2f5a48','#12281f'],
    power: { hp: 3.18, dmg: 2.3, arm: 1.55 }, rec: 6 },
  { id: 'causeway', name: 'Sunken Causeway', region: 'mire', req: 'mirewood', enemies: ['mossturtle', 'mossturtle', 'reedwisp', 'mistheg'],
    blurb: 'Moss-shell Turtles guard a drowned stone road, with Reed Wisps drifting above it.', farm: { gold: 15.8, lumber: 3.9 }, best: 'Gold',
    first: { gold: 721, lumber: 45 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 2], ['saber', 1.5], ['longbow', 1.5], ['stormstaff', 1], ['club', 1.5], ['spear', 1.5], ['woodaxe', 1.5]], dropGrade: 1, repeat: { gold: 90, lumber: 6 }, sky: ['#31584a','#14291f'],
    power: { hp: 3.27, dmg: 2.1, arm: 2.01 }, rec: 8 },
  { id: 'toadking', name: 'Toadking\'s Hollow', region: 'mire', req: 'causeway', enemies: ['bogking'], boss: true,
    blurb: 'The Bog King squats on his root throne. Defeat him to relight the Mirewood watchtower.', farm: { gold: 18.3, lumber: 6.9 }, best: 'Gold + lumber',
    first: { gold: 2234, lumber: 135, tower: true }, drops: [['sword', 1], ['bow', 1.5], ['staff', 1.5], ['twin', 2], ['great', 2.5], ['buckler', 2], ['crossbow', 1.5], ['rapier', 1.5], ['twindaggers', 2], ['grimoire', 1.5], ['gauntlets', 1.5], ['halberd', 1.5]], dropGrade: 1, repeat: { gold: 135, lumber: 8 }, sky: ['#3a4a2c','#17200f'],
    power: { hp: 3.63, dmg: 2.08, arm: 2.27 }, rec: 10 },
  { id: 'frostfall', name: 'Frostfall Pass', region: 'frost', req: 'toadking', enemies: ['frostwolf', 'frostwolf', 'frostwolf', 'rimesprite'],
    blurb: 'A Frost Wolf pack hunts through the snowy mountain pass.', farm: { gold: 33.2, lumber: 7.7 }, best: 'Gold',
    first: { gold: 1732, lumber: 101 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2], ['great', 2], ['saber', 1.5], ['shortbow', 1.5], ['frostwand', 2], ['dagger', 2], ['tome', 2], ['wraps', 2], ['spear', 2]], dropGrade: 2, repeat: { gold: 203, lumber: 12 }, sky: ['#3f5f86','#16243a'],
    power: { hp: 9.37, dmg: 4.45, arm: 3.41 }, rec: 12 },
  { id: 'glimmer', name: 'Glimmer Cavern', region: 'frost', req: 'frostfall', enemies: ['icegolem', 'snowyeti', 'frostwolf'],
    blurb: 'Ice Golems stand guard among glowing crystals, with a Frost Wolf at their heels.', farm: { gold: 30.8, lumber: 16.8 }, best: 'Lumber',
    first: { gold: 2684, lumber: 152 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2.5], ['great', 2], ['rapier', 1.5], ['crossbow', 1.5], ['frostwand', 2], ['stormstaff', 1.5], ['woodaxe', 2], ['twindaggers', 2], ['halberd', 1.5]], dropGrade: 2, repeat: { gold: 304, lumber: 16 }, sky: ['#2c4e86','#101a3a'],
    power: { hp: 6.62, dmg: 3.15, arm: 3.77 }, rec: 14 },
  { id: 'rimecrown', name: 'Rimecrown Summit', region: 'frost', req: 'glimmer', enemies: ['frostgiant'], boss: true,
    blurb: 'The Frost Giant rules the frozen peak. Defeat him to relight the Frostpeak watchtower.', farm: { gold: 55.8, lumber: 18.8 }, best: 'Gold + lumber',
    first: { gold: 8320, lumber: 456, tower: true }, drops: [['sword', 1], ['bow', 1.5], ['staff', 1.5], ['twin', 2], ['great', 3], ['buckler', 2], ['longbow', 2], ['stormstaff', 2], ['heartwood', 1.5], ['grimoire', 2], ['gauntlets', 2], ['halberd', 2], ['twindaggers', 2]], dropGrade: 2, repeat: { gold: 456, lumber: 23 }, sky: ['#4a5f86','#1a2038'],
    power: { hp: 5.07, dmg: 2.8, arm: 4.55 }, rec: 16 },
  { id: 'cinder', name: 'Cinder Fields', region: 'ember', req: 'rimecrown', enemies: ['cinderbat', 'cinderbat', 'emberimp', 'magmacrab'],
    blurb: 'Ember Imps hurl fire across the ashen plain while a Magma Crab blocks the road.', farm: { gold: 101.1, lumber: 21.1 }, best: 'Gold',
    first: { gold: 6448, lumber: 342 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2.5], ['great', 2], ['falchion', 2], ['crossbow', 1.5], ['stormstaff', 2], ['pitchfork', 2], ['club', 2], ['dagger', 2], ['tome', 2], ['spear', 2], ['wraps', 2]], dropGrade: 3, repeat: { gold: 683, lumber: 32 }, sky: ['#6a3a2c','#241210'],
    power: { hp: 18.04, dmg: 6.26, arm: 6.13 }, rec: 18 },
  { id: 'quarry', name: 'Ashen Quarry', region: 'ember', req: 'cinder', enemies: ['magmacrab', 'sentinel', 'emberimp', 'emberimp'],
    blurb: 'Magma Crabs have claimed the old obsidian quarry, guarded by Ember Imps.', farm: { gold: 93.8, lumber: 46.1 }, best: 'Lumber',
    first: { gold: 9995, lumber: 513 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 2.5], ['great', 2.5], ['buckler', 2], ['longbow', 2], ['heartwood', 2], ['rapier', 1.5], ['woodaxe', 2], ['twindaggers', 2], ['gauntlets', 2], ['halberd', 2]], dropGrade: 3, repeat: { gold: 1025, lumber: 44 }, sky: ['#5a3830','#1c1012'],
    power: { hp: 13.84, dmg: 4.4, arm: 7.23 }, rec: 20 },
  { id: 'magmagate', name: 'Magma Gate', region: 'ember', req: 'quarry', enemies: ['sentinel', 'magmacrab', 'magmacrab', 'emberimp'],
    blurb: 'A claw-clacking pack of Magma Crabs holds the ancient gate over the lava.', farm: { gold: 212.5, lumber: 41.3 }, best: 'Gold',
    first: { gold: 15492, lumber: 769 }, drops: [['sword', 2], ['bow', 2], ['staff', 2], ['twin', 3], ['great', 3], ['saber', 2], ['crossbow', 2], ['frostwand', 2], ['falchion', 2], ['grimoire', 2], ['halberd', 2], ['gauntlets', 2], ['twindaggers', 2], ['woodaxe', 2]], dropGrade: 3, repeat: { gold: 1538, lumber: 62 }, sky: ['#7a3a22','#26100a'],
    power: { hp: 14.86, dmg: 4.72, arm: 7.76 }, rec: 22 },
  { id: 'skyreach', name: 'Skyreach Spire', region: 'ember', req: 'magmagate', enemies: ['stormdrake'], boss: true,
    blurb: 'The Storm Drake circles the last spire. Defeat it to light the final watchtower.', farm: { gold: 246.5, lumber: 72.3 }, best: 'Gold + lumber',
    first: { gold: 48025, lumber: 2307, tower: true }, drops: [['sword', 1], ['bow', 1.5], ['staff', 1.5], ['twin', 3], ['great', 3.5], ['rapier', 2], ['buckler', 2.5], ['longbow', 2.5], ['stormstaff', 2.5], ['heartwood', 2], ['grimoire', 3], ['halberd', 3], ['gauntlets', 3], ['twindaggers', 3]], dropGrade: 3, repeat: { gold: 2307, lumber: 87 }, sky: ['#3a3f5a','#14162a'],
    power: { hp: 10.22, dmg: 3.88, arm: 9.29 }, rec: 25 },
];
/* Armor drops from the same table as weapons (about a third of all drops): the early areas give leather, the middle ones chainmail, the last ones plate. */
const ARMOR_DROPS = {
  path: [['leatherarmor', 4]], hollow: [['leatherarmor', 5]], crossing: [['leatherarmor', 6]],
  mirewood: [['leatherarmor', 4], ['chainmail', 2]], causeway: [['leatherarmor', 3], ['chainmail', 3]], toadking: [['leatherarmor', 2], ['chainmail', 5]],
  frostfall: [['leatherarmor', 2], ['chainmail', 5]], glimmer: [['chainmail', 6], ['platearmor', 1.5]], rimecrown: [['chainmail', 5], ['platearmor', 3]],
  cinder: [['chainmail', 4], ['platearmor', 4]], quarry: [['chainmail', 3], ['platearmor', 5]], magmagate: [['chainmail', 3], ['platearmor', 6]], skyreach: [['chainmail', 2], ['platearmor', 8]],
};
for (const s of STAGES) s.drops = (s.drops || []).concat(ARMOR_DROPS[s.id] || []);
const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));
const REGION = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const regionOf = s => REGION[s.region];

const LAYOUT = {
  1: [[290, 192]],
  2: [[262, 176], [318, 206]],
  3: [[255, 170], [262, 214], [352, 190]],
  4: [[250, 190], [295, 160], [300, 216], [348, 186]],
};

/* Weapons are items. Craft copies, then merge MERGE_N copies of the same weapon or armor and grade into one of the next grade. */
const GRADES = [
  { name: 'Common',    mult: 1.00, color: '#c9d3c3' },
  { name: 'Fine',      mult: 1.20, color: '#7fd18a' },
  { name: 'Rare',      mult: 1.45, color: '#6db4f2' },
  { name: 'Epic',      mult: 1.80, color: '#c08af0' },
  { name: 'Legendary', mult: 2.30, color: '#f6bf4f' },
];
const MERGE_N = 3;

/* Armor: one piece per hero (the hero's outfit changes with it, see sprites.js). It drops like a weapon (the same stage tables, the same grade) and merges in the Forge.
   Any hero can wear any armor, but a copy is worn by one hero at a time. hp / dr are the bonus of a Common copy (more health, less damage taken);
   better grades multiply them by GRADES[g].mult. 'garb' is the plain outfit every hero starts with (no bonus, never runs out). */
const ARMORS = {
  garb:         { name: "Traveler's garb", tier: 0, hp: 0, dr: 0, starter: true, desc: 'Plain travelling clothes. Every hero starts with them.' },
  leatherarmor: { name: 'Leather armor', tier: 1, hp: 0.15, dr: 0.04, desc: 'Light and quiet: a little more health and a little less damage.' },
  chainmail:    { name: 'Chainmail', tier: 2, hp: 0.30, dr: 0.09, desc: 'Steel rings over the chest: much tougher than leather.' },
  platearmor:   { name: 'Plate armor', tier: 3, hp: 0.50, dr: 0.15, desc: 'Heavy plates and pauldrons: the best protection there is.' },
};
const ARMOR_IDS = Object.keys(ARMORS).filter(a => !ARMORS[a].starter);          // the pieces that drop and merge
const isArmor = id => !!ARMORS[id];
const itemInfo = id => WEAPONS[id] || ARMORS[id];                               // a weapon or an armor (drops are either)
const pct0 = x => Math.round(x * 100);

/* Weapons and armor cannot be bought: they only drop (each drop is one copy of a weapon or an armor from the stage's table, at the stage's grade).
   Winning a fight by hand is the best way to get one; auto-farming rolls once per hour away.
   manual: chance per won fight (pity: extra chance added per won fight without a drop, bad-luck protection);
   autoPerHour: chance per hour of farming, rolled when you claim. */
const DROP = { manual: 0.13, pity: 0.15, autoPerHour: 0.12 };

const CHARGE_SOFT = 0.15;                              // a boss charge hits the whole party for this share of its damage (no barrier any more; simulated: the Bog King is beaten at the recommended level with about 75% health left)
const FARM_CAP_MIN = 24 * 60;

/* ---------------------------- save ---------------------------------- */
const SAVE_KEY = 'wildlight-expedition-v1';
function newSave() {
  const heroes = {}, items = {};
  for (const id of HERO_ORDER) heroes[id] = { lvl: 1, up: 0, weapon: HERO[id].start, armor: 'garb', armorG: 0 };
  for (const w of Object.keys(WEAPONS)) items[w] = [0, 0, 0, 0, 0];       // items[weapon][grade] = how many copies you own
  const armors = {};
  for (const a of ARMOR_IDS) armors[a] = [0, 0, 0, 0, 0];                  // armors[armor][grade] = how many copies you own (worn ones included)
  items.pitchfork[0] = 1;                                                  // Milo starts with his pitchfork; every hero gets their basic weapon when hired
  return {
    gold: 0, lumber: 0, cleared: {}, towers: {}, pity: {}, party: ['milo'], hired: ['milo'],
    items, armors, heroes, farm: null, daily: { date: '', done: false }, tab: 'map',
  };
}
/* Every hero wears a piece they own, and nobody wears a copy somebody else already wears (a missing piece becomes the plain garb). */
function sanitizeArmor(sv) {
  const used = {};
  for (const id of HERO_ORDER) {
    const h = sv.heroes[id], a = h.armor, g = Math.max(0, Math.min(GRADES.length - 1, Number(h.armorG) || 0)), key = a + ':' + g;
    if (a !== 'garb' && (!ARMORS[a] || (used[key] || 0) >= ((sv.armors[a] || [])[g] || 0))) { h.armor = 'garb'; h.armorG = 0; continue; }
    h.armorG = a === 'garb' ? 0 : g;
    if (a !== 'garb') used[key] = (used[key] || 0) + 1;
  }
}
function hydrate(raw) {
  const base = newSave();
  if (raw && typeof raw === 'object') {
    Object.assign(base, raw);
    const legacy = ['bren', 'tavi', 'iona'];                                // saves from before the roster: the heroes of the party were hired
    const oldParty = Array.isArray(raw.party) ? raw.party : legacy;
    base.hired = HERO_ORDER.filter(id => (Array.isArray(raw.hired) ? raw.hired : oldParty).includes(id));
    if (!base.hired.length) base.hired = ['bren'];
    base.party = HERO_ORDER.filter(id => base.hired.includes(id) && oldParty.includes(id)).slice(0, MAX_PARTY);
    if (!base.party.length) base.party = [base.hired[0]];
    for (const id of HERO_ORDER) base.heroes[id] = Object.assign(newSave().heroes[id], (raw.heroes || {})[id]);
    base.items = Object.assign(newSave().items, raw.items || {});
    base.armors = Object.assign(newSave().armors, raw.armors || {});
    if (!raw.items) {                       // older save: each crafted weapon becomes one Common copy
      base.items = newSave().items;
      for (const w of Object.keys(raw.crafted || {})) if (raw.crafted[w] && WEAPONS[w]) base.items[w] = [1, 0, 0, 0, 0];
    }
    for (const w of Object.keys(raw.recipes || {})) {             // recipes no longer exist: keep the weapon as a copy
      if (WEAPONS[w] && !(base.items[w] || []).some(n => n > 0)) base.items[w] = [1, 0, 0, 0, 0];
    }
    for (const id of base.hired) {                                // a hired hero always has something to wield
      const hw = base.heroes[id].weapon;
      if (!(base.items[hw] || []).some(n => n > 0)) { base.heroes[id].weapon = HERO[id].start; if (!base.items[HERO[id].start].some(n => n > 0)) base.items[HERO[id].start][0] = 1; }
    }
    delete base.crafted; delete base.recipes;
    if (raw.lumber == null && raw.iron != null) base.lumber = raw.iron;       // Iron was renamed Lumber
    delete base.iron;
  }
  base.lumber = base.lumber || 0;
  for (const w of Object.keys(WEAPONS)) if (!base.items[w]) base.items[w] = [0, 0, 0, 0, 0];
  base.pity = base.pity || {};
  for (const a of ARMOR_IDS) if (!Array.isArray(base.armors[a])) base.armors[a] = [0, 0, 0, 0, 0];
  sanitizeArmor(base);
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
const hired = () => HERO_ORDER.filter(id => save.hired.includes(id));
const isHired = id => save.hired.includes(id);
/* the heroes in a fight, front row first (the first one takes the monsters' blows) */
const party = () => HERO_ORDER.filter(id => save.party.includes(id)).sort((a, b) => (HERO[a].row === 'front' ? 0 : 1) - (HERO[b].row === 'front' ? 0 : 1));
const inParty = id => save.party.includes(id);
const partySize = () => save.party.length;
const sumLevels = () => party().reduce((a, id) => a + save.heroes[id].lvl, 0);
/* Monsters are weaker (and packs smaller) for a smaller party, so the first fights are fair with one hero. */
const partyScale = () => [1, 0.55, 0.8, 1, 1.7][partySize()] || 1;
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

/* What the hero's armor gives: hp = extra health share, dr = share of damage not taken (capped). */
function armorBonus(id) {
  const s = save.heroes[id], A = ARMORS[s.armor] || ARMORS.garb, m = A.tier ? GRADES[s.armorG || 0].mult : 1;
  return { hp: A.hp * m, dr: Math.min(0.5, A.dr * m) };
}
const wearers = (a, g) => HERO_ORDER.filter(id => save.heroes[id].armor === a && save.heroes[id].armorG === g);
const freeArmor = (a, g) => ((save.armors[a] || [])[g] || 0) - wearers(a, g).length;
const armorTotal = a => (save.armors[a] || []).reduce((x, y) => x + y, 0);
function heroStats(id) {
  const s = save.heroes[id], d = HERO[id];
  const lm = 1 + 0.12 * (s.lvl - 1), um = (1 + 0.15 * s.up) * GRADES[heroGrade(id)].mult;
  return { maxHp: Math.round(d.hp * lm * (1 + armorBonus(id).hp)), atk: d.atk * lm * um, heal: 14 * lm * um, crit: Math.min(0.6, WEAPONS[s.weapon].crit + CRIT.perGrade * heroGrade(id)) };
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
/* Pick one item (a weapon or an armor) from a stage's weighted drop table and add a copy of it at the stage's grade. */
function dropWeapon(s) {
  const table = s.drops || [], total = table.reduce((a, [, wt]) => a + wt, 0);
  let r = Math.random() * total, pick = table[table.length - 1][0];
  for (const [w, wt] of table) { if ((r -= wt) < 0) { pick = w; break; } }
  (isArmor(pick) ? save.armors : save.items)[pick][s.dropGrade || 0]++;
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
  .map(([w, n]) => (grade ? GRADES[grade].name + ' ' : '') + itemInfo(w).name + (n > 1 ? ` ×${n}` : '')).join(', ');

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
  document.body.classList.toggle('sheet-open', save.tab === 'forge' && !!uiForge.open);        // the Forge detail sheet is open: do not scroll the page behind it
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
    return `<div class="dropchip ${tier}">${itemIcon(w, 'sm')}<div><b>${itemInfo(w).name}${s.dropGrade ? ' ' + gradeTag(s.dropGrade) : ''}</b><small>${isArmor(w) ? 'Armor' : FAMILY[WEAPONS[w].fam]} · about ${pctText(chance)} per win</small></div></div>`;
  }).join('');
  return `<details class="drops" data-key="${key}" ${uiOpen.has(key) ? 'open' : ''}><summary><span>Possible weapon and armor drops</span><em>${s.drops.length}</em></summary>
    <div class="dropgrid">${chips}</div>
    <p class="fine">Chances are per fight you win, on average (every win without a drop makes the next one more likely). Farming rolls a weapon or an armor once for every full hour away, ${pctText(DROP.autoPerHour)} each (up to 24 hours).</p></details>`;
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
/* The weapon rolls a farming trip has earned so far: one per full hour away, DROP.autoPerHour each, rolled when the loot is claimed. */
function farmRollText(g) {
  const rolls = Math.min(24, Math.floor(g.mins / 60)), pct = pctText(DROP.autoPerHour);
  if (g.full) return `Gear rolls: ${rolls} ready (${pct} each). Claim them!`;
  const next = Math.max(1, Math.ceil(60 - (g.mins % 60)));
  return `Gear roll each hour (${pct}) · ${rolls} earned · next in ${next} min`;
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
    <p class="fine" id="farm-roll">${farmRollText(g)}</p>
    <p class="fine">Gathers for up to 24 hours. Weapons and armor are rolled when you claim; fighting by hand has the best chance.</p></div>`;
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
  const fr = $('#farm-roll'); if (fr) { const t = farmRollText(g); if (fr.textContent !== t) fr.textContent = t; }
  const cb = $('#claim-btn');
  if (cb) { const any = g.gold > 0 || g.lumber > 0; cb.disabled = !any; cb.classList.toggle('ready', any); }
}
setInterval(tickFarm, 1000);

/* ------------------------------ party ------------------------------- */
// The party starts with one hero (Milo). The others are hired with gold from the Recruit section; up to four fight at a time and the rest rest in camp.
const HERO_ACCENT = { milo: '#c9b27a', bren: '#c98a2b', tavi: '#4c9a5c', iona: '#b69ce0', rook: '#4fa6a0', elric: '#7078d8', maren: '#c8504a', tobin: '#e08a2c' };
const heroDps = id => {
  const w = WEAPONS[save.heroes[id].weapon], st = heroStats(id);
  return st.atk * w.hits.reduce((a, b) => a + b, 0) / w.int;
};

function partyStrip() {
  const act = party(), slots = Array.from({ length: MAX_PARTY }, (_, i) => act[i]
    ? `<span class="slot full" title="${HERO[act[i]].name}">${HERO[act[i]].name[0]}</span>` : '<span class="slot" title="Free place">+</span>').join('');
  const next = HERO_ORDER.filter(id => !isHired(id)).sort((a, b) => HERO[a].hire - HERO[b].hire)[0], camp = hired().length - act.length;
  return `<div class="strip idle pstrip"><div class="slots">${slots}</div>
    <div><b>Your party · ${act.length} of ${MAX_PARTY}</b>
    <span>${next ? `Hire more heroes with gold: ${HERO[next].name} costs ${fmt(HERO[next].hire)}.` : 'Everyone has joined you.'}${camp > 0 ? ` ${camp} resting in camp.` : ''}</span></div></div>`;
}
/* send a hired hero to the party or to camp */
function campRow(id) {
  if (inParty(id)) return save.party.length > 1 ? `<div class="campbar"><button class="btn alt small" data-act="torest" data-arg="${id}">Rest in camp</button></div>` : '';
  const full = save.party.length >= MAX_PARTY;
  return `<div class="campbar"><span class="tag lock">In camp</span><button class="btn alt small" data-act="toparty" data-arg="${id}" ${full ? 'disabled' : ''}>Join the party</button>${full ? `<span class="hint">The party is full (${MAX_PARTY}): rest someone first.</span>` : ''}</div>`;
}

/* The folded "Change armor" list of a hero card: the plain garb, and every copy you own that is free (or that this hero wears). */
function armorPicker(id) {
  const s = save.heroes[id], key = 'armor-' + id, rows = [];
  const row = (a, g, note) => {
    const A = ARMORS[a], m = A.tier ? GRADES[g].mult : 1, on = s.armor === a && s.armorG === g;
    rows.push(`<button class="weapon ${on ? 'on' : ''}" data-act="equiparmor" data-arg="${id}:${a}:${g}">${itemIcon(a, 'sm')}<span><b>${A.name}</b><small>${A.tier ? `HP +${pct0(A.hp * m)}% · -${pct0(Math.min(0.5, A.dr * m))}% damage.` : A.desc}</small></span>
      <span class="wmeta">${A.tier ? gradeTag(g) : ''}<small>${note}</small></span></button>`);
  };
  row('garb', 0, s.armor === 'garb' ? 'worn' : '');
  for (const a of ARMOR_IDS) for (let g = GRADES.length - 1; g >= 0; g--) {
    const mine = s.armor === a && s.armorG === g, free = freeArmor(a, g), other = wearers(a, g).filter(x => x !== id);
    if (!((save.armors[a] || [])[g] > 0)) continue;
    if (mine) row(a, g, 'worn');
    else if (free > 0) row(a, g, free > 1 ? free + ' free' : '');
    else row(a, g, 'worn by ' + HERO[other[0]].name);
  }
  const count = rows.length - 1;
  return `<details class="drops" data-key="${key}" ${uiOpen.has(key) ? 'open' : ''}><summary><span>Change armor</span><em>${count}</em></summary>
    <div class="weapons">${rows.join('')}</div>
    <p class="fine">Armor comes from fights and farming. Each copy can be worn by one hero; the hero's outfit changes with it.</p></details>`;
}

function heroCard(id) {
  const d = HERO[id], s = save.heroes[id], st = heroStats(id), w = WEAPONS[s.weapon];
  const lc = { gold: lvlCost(s.lvl) }, uc = upCost(s.up);
  const key = 'weapons-' + id, owned_ = Object.keys(WEAPONS).filter(x => WEAPONS[x].fam === d.family && owned(x));
  const stats = [['HP', st.maxHp], ['Damage/s', heroDps(id).toFixed(1)]];
  if (w.heal) stats.push(['Heal', Math.round(st.heal * (w.healMult || 1))]);
  stats.push(['Crit', Math.round(st.crit * 100) + '%']);
  if (w.pierce) stats.push(['Pierce', Math.round(w.pierce * 100) + '%']);
  if (w.shield) stats.push(['Guard', '-' + Math.round(w.shield * 100) + '%']);
  const ab = armorBonus(id), A = ARMORS[s.armor] || ARMORS.garb;
  if (ab.dr > 0) stats.push(['Armor', '-' + pct0(ab.dr) + '%']);
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
    <div class="wnow"><span class="wlabel">Armor</span><b>${A.name}</b>${A.tier ? gradeTag(s.armorG) : ''}<span class="wup">${A.tier ? `HP +${pct0(ab.hp)}% · -${pct0(ab.dr)}% damage` : 'No bonus'}</span></div>
    <div class="hactions">
      <button class="btn primary sm" data-act="lvl" data-arg="${id}" ${canAfford(lc) ? '' : 'disabled'}>Level up <span class="cost">${costHtml(lc)}</span></button>
      <button class="btn alt" data-act="up" data-arg="${id}" ${canAfford(uc) ? '' : 'disabled'}>Upgrade ${FAMILY_PLURAL[d.family].toLowerCase()} <span class="cost">${costHtml(uc)}</span></button>
    </div>
    ${campRow(id)}
    ${typeof skillsCardHtml === 'function' ? skillsCardHtml(id) : ''}
    <details class="drops" data-key="${key}" ${uiOpen.has(key) ? 'open' : ''}><summary><span>Change weapon</span><em>${owned_.length}</em></summary>
      <div class="weapons">${owned_.map(x => {
        const n = save.items[x].reduce((a, b) => a + b, 0);
        return `<button class="weapon ${s.weapon === x ? 'on' : ''}" data-act="equip" data-arg="${id}:${x}">
          ${itemIcon(x, 'sm')}<span><b>${WEAPONS[x].name}</b><small>${WEAPONS[x].desc} Crit ${Math.round(WEAPONS[x].crit * 100)}%.</small></span>
          <span class="wmeta">${gradeTag(bestGrade(x))}<small>${n > 1 ? `${n} owned` : ''}</small></span></button>`;
      }).join('')}</div>
      <p class="fine">A hero always wields the best grade they own. Merge copies in the Forge.</p></details>
    ${armorPicker(id)}
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
  const act = party(), camp = hired().filter(id => !inParty(id));
  let h = partyStrip();
  h += `<h2 class="sec">Party <small>${act.length} of ${MAX_PARTY}</small></h2><div class="cgrid">` + act.map(heroCard).join('') + '</div>';
  if (camp.length) h += `<h2 class="sec">In camp <small>resting: they level up and keep their weapons</small></h2><div class="cgrid">` + camp.map(heroCard).join('') + '</div>';
  const rec = HERO_ORDER.filter(id => !isHired(id)).sort((a, b) => HERO[a].hire - HERO[b].hire);
  if (rec.length) h += `<h2 class="sec">Recruit <small>pay with gold</small></h2><div class="cgrid">` + rec.map(recruitCard).join('') + '</div>';
  return h;
}

/* Draws every portrait canvas: the hero with the given weapon (data-weapon, default: what they wield). data-scale sizes the hero. */
function paintPortraits() {
  if (artState('units') === 'loading') return;      // wait for the illustrated heroes instead of flashing the drawn ones
  document.querySelectorAll('canvas[data-hero]').forEach(cv => {
    const id = cv.dataset.hero, c = cv.getContext('2d'), k = Number(cv.dataset.scale || 2);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save(); c.scale(k, k);
    drawHero(c, id, cv.width / (2 * k), (cv.height - 10) / k, { weapon: cv.dataset.weapon || save.heroes[id].weapon, armor: save.heroes[id].armor, t: 0 });
    c.restore();
  });
}

/* ------------------------------ forge ------------------------------- */
// Weapons cannot be bought. The Forge lists every weapon, groups them by hero, and merges copies into higher grades.
const WIELDER = Object.fromEntries(HERO_ORDER.map(id => [HERO[id].family, id]));

/* Every stage where a weapon can drop, with the grade it drops at and the real chance per won fight (folded). */
function weaponDropsHtml(w) {                      // (also used by armor cards: it only reads the stage drop tables)
  const rows = [], rate = dropRatePerWin();
  for (const r of REGIONS) {
    const list = r.stages.map(id => STAGE[id]).filter(s => (s.drops || []).some(([x]) => x === w));
    if (!list.length) continue;
    rows.push(`<div class="wdregion">${r.name}</div>` + list.map(s => {
      const total = s.drops.reduce((a, [, wt]) => a + wt, 0), wt = s.drops.find(([x]) => x === w)[1];
      const label = `<span>${s.name}${s.boss ? ' <em>boss</em>' : ''}</span>${gradeTag(s.dropGrade || 0)}<b>${pctText(rate * wt / total)}</b>`;
      return isUnlocked(s)                                   // a stage you can already reach: tap to fight there
        ? `<button type="button" class="wdrow go" data-act="fight" data-arg="${s.id}" title="Fight at ${s.name}">${label}<i class="wdgo">Fight ›</i></button>`
        : `<div class="wdrow locked" title="Clear ${s.req && STAGE[s.req] ? STAGE[s.req].name : 'the stage before'} first">${label.replace('<span>', '<span><i class="ico m lock sm"></i> ')}</div>`;
    }).join(''));
  }
  const n = STAGES.filter(s => (s.drops || []).some(([x]) => x === w)).length, key = 'wdrop-' + w;
  return `<details class="drops wdrops" data-key="${key}" ${uiOpen.has(key) ? 'open' : ''}><summary><span>Where it drops</span><em>${n} stage${n === 1 ? '' : 's'}</em></summary>
    <div class="wdlist">${rows.join('')}</div><p class="fine">Chance per fight you win, on average. Later regions drop better grades. Tap a stage you have reached to fight there.</p></details>`;
}
function weaponCard(w) {
  const W = WEAPONS[w], items = save.items[w], total = items.reduce((a, b) => a + b, 0), who = WIELDER[W.fam], hero = HERO[who];
  if (!total) {
    const where = STAGES.filter(s => (s.drops || []).some(([x]) => x === w)).map(s => s.name);
    return `<article class="weaponcard locked"><div class="wport">${itemIcon(w)}</div>
      <div class="winfo"><div class="wtop"><h4>${W.name}</h4><span class="pill lock"><i class="ico m lock sm"></i>Not found</span></div>
        <p class="wdesc">${W.desc} <span class="wcrit">Crit ${Math.round(W.crit * 100)}%</span></p><p class="fine">Drops at ${where.join(', ')}.</p>${weaponDropsHtml(w)}</div></article>`;
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
  const equipped = save.heroes[who].weapon === w, hired = isHired(who);
  const foot = !hired ? `<span class="hint">${hero.name} isn't in your party yet.</span>`
    : equipped ? `<span class="pill ok"><i class="ico m check sm"></i>${hero.name} wields this</span>`
    : `<button class="btn alt small" data-act="equip" data-arg="${who}:${w}">Equip on ${hero.name}</button>`;
  return `<article class="weaponcard ${ready ? 'ready' : ''}" style="--g:${GRADES[best].color}">
    <div class="wport">${itemIcon(w)}</div>
    <div class="winfo"><div class="wtop"><h4>${W.name}</h4>${gradeTag(best)}</div>
      <p class="wdesc">${W.desc} <span class="wcrit">Crit ${Math.round(W.crit * 100)}%</span></p>
      <div class="mergelist">${rows.join('')}</div>
      ${weaponDropsHtml(w)}
      <div class="wfoot">${foot}</div></div></article>`;
}

/* An armor in the Forge: grades owned with merge buttons, who wears each copy, and where it drops. Equipping is done on the Party tab. */
function armorCard(a) {
  const A = ARMORS[a], items = save.armors[a], total = armorTotal(a);
  const stat = (g) => `HP +${pct0(A.hp * GRADES[g].mult)}% · -${pct0(Math.min(0.5, A.dr * GRADES[g].mult))}% damage`;
  if (!total) {
    const where = STAGES.filter(s => (s.drops || []).some(([x]) => x === a)).map(s => s.name);
    return `<article class="weaponcard locked"><div class="wport">${itemIcon(a)}</div>
      <div class="winfo"><div class="wtop"><h4>${A.name}</h4><span class="pill lock"><i class="ico m lock sm"></i>Not found</span></div>
        <p class="wdesc">${A.desc} <span class="wcrit">${stat(0)}</span></p><p class="fine">Drops at ${where.join(', ')}.</p>${weaponDropsHtml(a)}</div></article>`;
  }
  const best = items.reduce((b, n, g) => (n > 0 ? g : b), 0), ready = items.some((n, g) => g < GRADES.length - 1 && freeArmor(a, g) >= MERGE_N);
  const rows = [];
  for (let gr = 0; gr < GRADES.length; gr++) {
    const n = items[gr] || 0;
    if (!n) continue;
    const last = gr === GRADES.length - 1, can = !last && freeArmor(a, gr) >= MERGE_N, who = wearers(a, gr);
    const pips = last ? '' : `<span class="pips" aria-label="${Math.min(n, MERGE_N)} of ${MERGE_N}">${Array.from({ length: MERGE_N }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
    rows.push(`<div class="mergerow ${can ? 'can' : ''}"><span class="mleft">${gradeTag(gr)}<b>×${n}</b><small>${stat(gr)}</small></span>${
      last ? '<small>Max grade</small>' : `${pips}<button class="btn ${can ? 'good' : 'alt'} small" data-act="merge" data-arg="${a}:${gr}" ${can ? '' : 'disabled'}>Merge → ${GRADES[gr + 1].name}</button>`}</div>${
      who.length ? `<p class="fine">Worn by ${who.map(id => HERO[id].name).join(', ')}.</p>` : ''}`);
  }
  return `<article class="weaponcard ${ready ? 'ready' : ''}" style="--g:${GRADES[best].color}">
    <div class="wport">${itemIcon(a)}</div>
    <div class="winfo"><div class="wtop"><h4>${A.name}</h4>${gradeTag(best)}</div>
      <p class="wdesc">${A.desc}</p>
      <div class="mergelist">${rows.join('')}</div>
      ${weaponDropsHtml(a)}</div></article>`;
}
/* The Forge shows every weapon and armor as a small tile (filter chips on top: Ready to merge, All, Armor, one per hero); a tap opens the full card (grades, merge,
   equip, where it drops) in a sheet. uiForge is only screen state (not saved). */
let uiForge = { filter: 'all', open: null };
const firstName = id => HERO[id].name.replace(/^Brother /, '').split(' ')[0];       // Brother Tobin -> Tobin
function forgeItems() {
  const list = [], top = GRADES.length - 1;
  for (const fam of Object.keys(FAMILY)) for (const w of Object.keys(WEAPONS).filter(x => WEAPONS[x].fam === fam)) {
    const items = save.items[w], who = WIELDER[fam], total = items.reduce((x, y) => x + y, 0);
    list.push({ id: w, armor: false, group: who, total, best: total ? bestGrade(w) : -1, ready: items.some((n, g) => g < top && n >= MERGE_N), used: isHired(who) && save.heroes[who].weapon === w ? 1 : 0 });
  }
  for (const a of ARMOR_IDS) {
    const items = save.armors[a], total = armorTotal(a);
    list.push({ id: a, armor: true, group: 'armor', total, best: total ? items.reduce((b, n, g) => (n > 0 ? g : b), 0) : -1, ready: items.some((n, g) => g < top && freeArmor(a, g) >= MERGE_N),
      used: HERO_ORDER.filter(id => save.heroes[id].armor === a).length });
  }
  return list;
}
const forgeShown = (it, f) => f === 'all' || (f === 'ready' && it.ready) || (f === 'armor' && it.armor) || (!it.armor && it.group === f);
function forgeTile(it) {
  const info = itemInfo(it.id), has = it.total > 0;
  return `<button class="ftile ${has ? '' : 'locked'} ${it.ready ? 'ready' : ''}" style="--g:${has ? GRADES[it.best].color : '#53635a'}" data-act="forgeopen" data-arg="${it.id}" aria-label="${info.name}">
    ${it.ready ? '<i class="fbadge">Merge</i>' : ''}${has && it.total > 1 ? `<i class="fcount">×${it.total}</i>` : ''}
    <span class="ficon">${itemIcon(it.id)}</span><b class="fname">${info.name}</b>
    <span class="fmeta">${has ? gradeTag(it.best) : '<i class="ico m lock sm"></i>Not found'}${it.used ? '<em class="fworn" title="In use">✓</em>' : ''}</span></button>`;
}
/* The armor sheet also lists the heroes, so a piece can be put on from the Forge (the best copy nobody wears). */
function armorWearRow(a) {
  const btns = hired().map(id => {
    const mine = save.heroes[id].armor === a;
    let g = -1;
    for (let k = GRADES.length - 1; k >= 0; k--) if (freeArmor(a, k) > 0) { g = k; break; }
    const label = firstName(id);
    return mine ? `<button class="btn good small" disabled>✓ ${label}</button>`
      : `<button class="btn alt small" data-act="equiparmor" data-arg="${id}:${a}:${g}" ${g < 0 ? 'disabled' : ''}>${label}</button>`;
  }).join('');
  return `<div class="wearrow"><span class="wlabel">Put on</span><div class="wearbtns">${btns}</div></div>`;
}
function forgeSheet(id) {
  const arm = isArmor(id);
  return `<div class="fsheet-wrap"><div class="fsheet-back" data-act="forgeclose"></div>
    <div class="fsheet" role="dialog" aria-label="${itemInfo(id).name}"><button class="fsheet-x" data-act="forgeclose" aria-label="Close">×</button>
      ${arm ? armorCard(id) : weaponCard(id)}${arm && armorTotal(id) ? armorWearRow(id) : ''}</div></div>`;
}
function renderForge() {
  const items = forgeItems(), readyN = items.filter(i => i.ready).length;
  if (uiForge.filter === 'ready' && !readyN) uiForge.filter = 'all';
  const f = uiForge.filter;
  const chip = (key, label, extra, cls, style) => `<button class="fchip ${f === key ? 'on' : ''} ${cls || ''}" data-act="forgefilter" data-arg="${key}" ${style ? `style="${style}"` : ''}>${label}${extra ? `<small>${extra}</small>` : ''}</button>`;
  const owned = list => list.filter(i => i.total > 0).length;
  let h = `<div class="strip idle fstrip"><i class="ico m swords"></i><div><b>${readyN ? `${readyN} merge${readyN > 1 ? 's' : ''} ready!` : 'The Forge'}</b>
    <span>Tap an item for its details. ${MERGE_N} copies of one grade merge into 1 of the next (${GRADES.map(x => x.name).join(' → ')}).</span></div></div>`;
  h += '<div class="fchips">' + (readyN ? chip('ready', 'Ready', readyN, 'ready') : '') + chip('all', 'All', owned(items) + '/' + items.length)
    + chip('armor', 'Armor', owned(items.filter(i => i.armor)) + '/' + ARMOR_IDS.length)
    + HERO_ORDER.map(id => { const l = items.filter(i => !i.armor && i.group === id); return chip(id, `<i class="dot"></i>${firstName(id)}`, owned(l) + '/' + l.length, '', `--hc:${HERO_ACCENT[id]}`); }).join('') + '</div>';
  const groups = [...Object.keys(FAMILY).map(fam => ({ key: WIELDER[fam], title: FAMILY_PLURAL[fam], sub: HERO[WIELDER[fam]].name })), { key: 'armor', title: 'Armor', sub: 'any hero can wear it' }];
  let any = false;
  for (const g of groups) {
    const list = items.filter(i => (g.key === 'armor' ? i.armor : !i.armor && i.group === g.key) && forgeShown(i, f))
      .sort((x, y) => (y.ready - x.ready) || ((y.total > 0) - (x.total > 0)));              // ready to merge first, then what you own, then what is still missing
    if (!list.length) continue;
    any = true;
    h += `<h2 class="sec">${g.title} <small>${g.sub}</small></h2><div class="ftiles">${list.map(forgeTile).join('')}</div>`;
  }
  if (!any) h += '<p class="note">Nothing here yet.</p>';
  h += `<p class="note">Later areas drop better grades of every weapon and armor, so keep merging.</p>`;
  if (uiForge.open && itemInfo(uiForge.open)) h += forgeSheet(uiForge.open);
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
      `Hire more heroes in the Party tab: ${(() => { const n = HERO_ORDER.filter(id => !isHired(id)).sort((a, b) => HERO[a].hire - HERO[b].hire)[0]; return n ? `${HERO[n].name} costs ${fmt(HERO[n].hire)} gold` : 'everyone has joined you'; })()}.`,
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
  tab(t) { save.tab = t; uiForge.open = null; persist(true); render(); },
  forgefilter(f) { uiForge.filter = f; uiForge.open = null; render(); const r = document.querySelector('.fchips .on'); if (r) r.scrollIntoView({ inline: 'center', block: 'nearest' }); },
  forgeopen(id) { if (itemInfo(id)) { uiForge.open = id; render(); } },
  forgeclose() { uiForge.open = null; render(); },
  sound() { if (window.sfx) window.sfx.togglePanel(); },
  claim() { claimFarm(false); render(); },
  farm(id) {
    if (!save.cleared[id]) return;
    const prevGrade = save.farm ? (STAGE[save.farm.stage].dropGrade || 0) : 0;
    const found = save.farm ? claimFarm(true) : [];
    save.farm = { stage: id, since: Date.now() };
    snd('farm');
    persist();
    toast(`${found.length ? `Your party found: ${dropNames(found, prevGrade)}! ` : ''}Party sent to ${STAGE[id].name}.`);
    render();
  },
  hire(id) {
    const d = HERO[id];
    if (!d || isHired(id) || save.gold < d.hire) return;
    save.gold -= d.hire;
    save.hired = HERO_ORDER.filter(x => x === id || isHired(x));
    if (save.party.length < MAX_PARTY) save.party = HERO_ORDER.filter(x => x === id || inParty(x));
    if (!(save.items[d.start] || []).some(n => n > 0)) save.items[d.start][0] = 1;                      // their basic weapon comes with them
    snd('hire'); persist(); toast(inParty(id) ? `${d.name} joins your party!` : `${d.name} waits in camp: your party is full.`); render();
  },
  toparty(id) {
    if (!isHired(id) || inParty(id) || save.party.length >= MAX_PARTY) { snd('nope'); return; }
    save.party = HERO_ORDER.filter(x => x === id || inParty(x)); persist(); render();
  },
  torest(id) {
    if (!inParty(id) || save.party.length <= 1) return;
    save.party = save.party.filter(x => x !== id); persist(); render();
  },
  lvl(id) {
    if (!isHired(id)) return;
    const c = { gold: lvlCost(save.heroes[id].lvl) };
    if (!canAfford(c)) return;
    pay(c); save.heroes[id].lvl++; snd('levelup'); persist(); render();
  },
  up(id) {
    if (!isHired(id)) return;
    const c = upCost(save.heroes[id].up);
    if (!canAfford(c)) return;
    pay(c); save.heroes[id].up++; snd('upgrade'); persist(); render();
  },
  equip(arg) {
    const [id, w] = arg.split(':');
    if (isHired(id) && owned(w) && WEAPONS[w].fam === HERO[id].family) { save.heroes[id].weapon = w; snd('equip'); persist(); render(); }
  },
  merge(arg) {
    const [w, gs] = arg.split(':'), gr = Number(gs), items = (isArmor(w) ? save.armors : save.items)[w];
    if (!items || !(gr >= 0 && gr < GRADES.length - 1) || items[gr] < MERGE_N) return;
    if (isArmor(w) && freeArmor(w, gr) < MERGE_N) { toast('Take the worn ones off first: only copies nobody wears can be merged.'); return; }
    items[gr] -= MERGE_N; items[gr + 1]++;
    snd('merge'); persist(); toast(`Merged into a ${GRADES[gr + 1].name} ${itemInfo(w).name}!`); render();
  },
  equiparmor(arg) {
    const [id, a, gs] = arg.split(':'), g = Number(gs);
    if (!isHired(id) || !ARMORS[a]) return;
    if (a !== 'garb' && (save.heroes[id].armor === a && save.heroes[id].armorG === g ? false : freeArmor(a, g) < 1)) { toast('Somebody else wears that one.'); return; }
    save.heroes[id].armor = a; save.heroes[id].armorG = a === 'garb' ? 0 : g;
    snd('equip'); persist(); render();
  },
  fight(id) {
    const s = STAGE[id];
    if (!isUnlocked(s)) return;
    withRegionArt(s.region, () => startBattle({ title: s.name, sky: s.sky, enemies: encounterFor(s), hpMult: partyScale(), power: s.power, bg: s.id, rec: s.rec, repeatable: true, stageId: s.id, onWin: () => stageWin(s) }));
  },
  bonus() {
    if (dailyDone()) return;
    const m = dailyMonster(), s = STAGES.filter(isUnlocked).find(x => x.enemies.includes(m));
    withRegionArt(s.region, () => startBattle({ title: `Bonus hunt: ${MON[m].name}`, sky: s.sky, enemies: [m], hpMult: (MON[m].boss ? 1 : 1.5) * partyScale(), power: s.power, bg: s.id, rec: s.rec, onWin: () => bonusWin(m) }));
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
  skill(id) { if (typeof castSkill === 'function' && !castSkill(id)) snd('nope'); },
  autoskill() { if (typeof setAutoSkill === 'function') { setAutoSkill(!autoSkillOn()); snd('toggle'); } },
  retreat() {
    if (!B) return;
    snd('retreat');
    if (B.over) { if (run && run.wins && $('#result').hidden) showRunSummary(); return; }       // between two repeated fights
    endBattle('retreat');
  },
};
const OWN_SOUND = new Set(['skill', 'autoskill', 'tab', 'region', 'retreat', 'lvl', 'up', 'hire', 'equip', 'merge', 'claim', 'farm', 'fight', 'bonus', 'repeat', 'sound',
  '__again', '__repeat', '__close', 'pwainstall']);          // these play a sound of their own (or the game does it for them)
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('summary')) snd('tick');                  // folding a list open or closed
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || !actions[b.dataset.act]) return;
  if (!OWN_SOUND.has(b.dataset.act)) snd('tap');
  actions[b.dataset.act](b.dataset.arg);
});
document.addEventListener('keydown', e => {
  if (e.key === 'r' && B && !e.ctrlKey && !e.metaKey && !e.altKey) actions.repeat();
  if (B && /^[1-8]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && typeof castSkillSlot === 'function') castSkillSlot(Number(e.key) - 1);
  if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) { const off = window.sfx && window.sfx.toggleMute(); toast(off ? 'Sound off' : 'Sound on'); }
  if (e.key === 'Escape' && uiForge.open) { actions.forgeclose(); return; }
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

/* Phone in portrait: the battle gets a tall, zoomed view instead of the wide 400 x 260 one. The game still thinks in the 400 x 260 space;
   B.cam = { x, y, w, h } is the window of that space that is shown, and units are spread out for it (camPt). */
const CAM_W = 340, CAM_BOTTOM = 272, CAM_SCALE = 3.6;
function makeCam() {
  const iw = window.innerWidth, ih = window.innerHeight;
  if (!iw || !ih || iw >= 720 || ih < iw * 1.2) return null;
  const sw = Math.min(480, iw - 20), avail = ih - 330, ratio = Math.max(0.86, Math.min(1.35, avail / sw)), h = Math.round(CAM_W * ratio);
  return { x: 0, y: CAM_BOTTOM - h, w: CAM_W, h };
}
const camPt = (x, y, foe) => [foe ? 205 + (x - 250) * 0.8 : 52 + (x - 58), 208 + (y - 195) * 1.8];      // heroes keep their spacing, monsters are packed a little closer
const viewRect = () => (B && B.cam ? [B.cam.x, B.cam.y, B.cam.w, B.cam.h] : [0, 0, 400, 260]);
function camSet(c) {
  const m = B && B.cam;
  if (m) { const k = cv.width / m.w; c.setTransform(k, 0, 0, k, -m.x * k, -m.y * k); }
  else c.setTransform(cv.width / 400, 0, 0, cv.height / 260, 0, 0);
}

function startBattle(spec) {
  const cam = makeCam(), mp = p => (cam ? camPt(p[0], p[1]) : p), mpf = p => (cam ? camPt(p[0], p[1], true) : p);
  const slots = (LAYOUT[spec.enemies.length] || LAYOUT[4]).map(mpf);
  B = { spec, cam, t: 0, over: false, result: null, endT: 0, heroes: [], enemies: [], fx: [], later: [], last: 0, raf: 0 };
  party().forEach((id, i, all) => {
    const st = heroStats(id), spot = mp(all.length === 1 ? [108, 184] : SLOTS[i]);
    B.heroes.push({ id, hp: st.maxHp, maxHp: st.maxHp, cd: 0.4 + Math.random() * 0.4, draw: 0, swing: 0, heal: 2.5, dead: false, hit: 0, x: spot[0], y: spot[1] });
  });
  spec.enemies.forEach((type, i) => {
    const d = MON[type], pw = spec.power || { hp: 1, dmg: 1 }, hp = Math.round(d.hp * (spec.hpMult || 1) * pw.hp * (typeof skillHp === 'function' ? skillHp(spec.rec) : 1));
    B.enemies.push({ type, hp, maxHp: hp, x: slots[i][0], y: slots[i][1], cd: d.cd * (0.35 + 0.5 * Math.random() + i * 0.08),
      state: 'idle', kind: null, wt: 0, wd: 0, lunge: 0, lungeDur: 0.35, lungeDist: 0, flash: 0, dead: false, fade: 0,
      chargeT: d.charge ? d.charge.first : 0, dmgMult: pw.dmg, armMult: pw.arm || pw.dmg });
  });
  B.intro = INTRO; B.introDone = false;
  B.heroes.forEach(h => { h.hx = h.x; });
  B.enemies.forEach(e => { e.hx = e.x; });
  $('#battle-title').textContent = spec.title;
  cv.width = cam ? Math.round(cam.w * CAM_SCALE) : 800; cv.height = cam ? Math.round(cam.h * CAM_SCALE) : 520;
  cv.style.aspectRatio = cam ? cam.w + ' / ' + cam.h : '';
  $('#battle').classList.toggle('cam', !!cam);
  $('#result').hidden = true;
  $('#battle').hidden = false;
  document.body.style.overflow = 'hidden';
  if (typeof initSkills === 'function') initSkills();
  if (window.__wlResume && spec.repeatable) { window.__wlResume = false; repeatOn = true; run = null; }      // picking a repeat run up again after an update
  repeatUi();
  if (window.music) window.music.set(spec.enemies.some(e => MON[e] && MON[e].boss) ? 'boss' : 'fight');
  introUi();
  B.raf = requestAnimationFrame(loop);
}

function loop(ts) {
  if (!B) return;
  const dt = Math.min(0.05, ((ts - B.last) / 1000) || 0);
  B.last = ts;
  B.t += dt;
  if (!B.over) {
    if (B.t < B.intro) introStep(dt);
    else {
      if (!B.introDone) { B.introDone = true; for (const en of B.enemies) en.x = en.hx; for (const h of B.heroes) h.x = h.hx; }
      step(dt);
    }
  } else fxStep(dt);
  if (B.over && B.t > B.endT && $('#result').hidden) showResult();
  draw();
  warnUi();
  if (typeof skillsUi === 'function') skillsUi();
  B.raf = requestAnimationFrame(loop);
}

const aliveH = () => B.heroes.filter(h => !h.dead);
const aliveE = () => B.enemies.filter(e => !e.dead);
const heroById = id => B.heroes.find(h => h.id === id);

function step(dt) {
  if (typeof skillsStep === 'function') skillsStep(dt);                  // skill cooldowns, auto-casting (skills.js)

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
    h.cd -= dt * (B.haste > 0 ? 1.3 : 1);
    if (h.cd <= 0 && aliveE().length) {
      h.cd = w.int;
      if (HERO[h.id].draws && w.ranged) h.draw = 0.25; else fireHero(h, st, w);
    }
  }

  for (const e of B.enemies) {
    const d = MON[e.type];
    if (e.dead) { e.fade += dt; continue; }
    e.flash = Math.max(0, e.flash - dt);
    e.lunge = Math.max(0, e.lunge - dt);
    if (!aliveH().length) continue;
    const sp = e.stun > 0 ? 0 : e.chill > 0 ? 0.55 : 1;                                      // chilled by a frost wand: acts slower
    if (e.state === 'idle') {
      e.cd -= dt * sp;
      if (d.charge) e.chargeT -= dt * sp;
      if (d.charge && e.chargeT <= 0) startWind(e, 'charge');
      else if (e.cd <= 0) startWind(e, 'attack');
    } else {
      e.wt += dt * sp;
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
const floater = (x, y, text, c, big) => B.fx.push({ k: 'txt', x, y, text, c: c || '#fff', t: 0, life: big ? 1.1 : 0.9, big: !!big });

function firstEnemy() { return aliveE()[0]; }

function doHeal(h, st) {
  const cand = aliveH().filter(a => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!cand) return false;
  const amt = Math.round(st.heal * ((WEAPONS[save.heroes[h.id].weapon] || {}).healMult || 1));
  cand.hp = Math.min(cand.maxHp, cand.hp + amt);
  snd('healfx', save.heroes[h.id].weapon);
  floater(cand.x, cand.y - unitTop(cand.id, 70), '+' + amt, '#8ff0a4');
  B.fx.push({ k: 'petals', x: cand.x, y: cand.y - 24, t: 0, life: 0.9 });
  h.swing = 1;
  return true;
}

function fireHero(h, st, w) {
  const t = firstEnemy();
  if (!t) return;
  h.swing = 1;
  const wid = save.heroes[h.id].weapon;
  snd(w.ranged ? (w.fam === 'bow' ? 'release' : 'cast') : 'swing', wid);                      // every weapon has its own swing, shot or cast
  if (!w.ranged) {
    w.hits.forEach((m, i) => {
      later(i * 0.12, () => {
        if (t.dead) return;
        hitEnemy(t, st.atk * m, i, w.pierce, st.crit, wid);
        if (w.behind) { const o = aliveE().find(x => x !== t); if (o) { B.mute = true; hitEnemy(o, st.atk * m * w.behind, i, w.pierce, st.crit, wid); B.mute = false; } }       // a spear reaches past the first monster
        if (w.splash) for (const o of aliveE()) if (o !== t) hitEnemy(o, st.atk * m * w.splash, i, w.pierce, st.crit, wid);
        if (aliveE().length === 0 && B && !B.over) endBattle('win');
      });
    });
  } else {
    const dm = st.atk * w.hits[0];
    B.fx.push({ k: 'proj', x0: h.x + 22, y0: h.y - 30, x1: t.x, y1: t.y - 22, t: 0, dur: w.fam === 'bow' || typeof projDur !== 'function' ? 0.25 : projDur(wid), kind: w.fam === 'bow' ? 'arrow' : (typeof projKind === 'function' ? projKind(wid) : 'bolt'),
      cb: () => {
        const tg = t.dead ? firstEnemy() : t;
        if (!tg) return;
        hitEnemy(tg, dm, 0, w.pierce, st.crit, wid);
        if (w.splash) for (const o of aliveE()) if (o !== tg) hitEnemy(o, dm * w.splash, 0, w.pierce, st.crit, wid);
        if (aliveE().length === 0 && B && !B.over) endBattle('win');
      } });
  }
}

function hitEnemy(e, raw, i, pierce, critChance, wid) {          // wid: the weapon that hit (for the sound)
  const crit = critChance > 0 && Math.random() < critChance;
  if (crit) raw *= CRIT.hero;
  const armor = MON[e.type].armor * (e.armMult || 1) * (1 - (pierce || 0));
  const d = Math.max(1, Math.round(Math.max(raw * 0.25, raw - armor)));       // armor can take at most 3/4 of a hit
  e.hp -= d; e.flash = 0.15;
  const fam = wid && WEAPONS[wid] ? WEAPONS[wid].fam : 'sword';
  if (wid === 'frostwand' && e.hp > 0) e.chill = 3;
  if (typeof fxOnHit === 'function') fxOnHit(e, wid || 'sword', crit);
  if (!B.mute) {                                                    // contact + material; a crit adds one accent on top and softens the contact by about 1.5 dB
    snd('wimpact', { w: wid || 'sword', m: monMat(e.type), g: crit ? 0.84 : 1 });
    if (crit) snd('crit', fam === 'staff' ? 'magic' : HEAVY_WEAPONS.includes(wid) ? 'heavy' : 'light');
  }
  floater(e.x + (i || 0) * 8, e.y - unitTop(e.type, 56 * MON[e.type].scale) - 4, crit ? '-' + d + '!' : '-' + d, crit ? '#ffd24a' : '#fff', crit);
  if (e.hp <= 0) { e.hp = 0; e.dead = true; snd('mdie', { c: monCat(e.type), s: MON[e.type].scale }); }
}

function startWind(e, kind) {
  const d = MON[e.type];
  e.state = 'wind'; e.kind = kind; e.wt = 0;
  if (kind === 'charge') snd('warn');                                  // the boss is about to charge
  else if (d.tgt === 'front') snd('mwind', { c: monCat(e.type), s: d.scale });          // a melee monster winds up in its own way (snarl, buzz, croak, grinding stone...)
  e.wd = kind === 'charge' ? d.charge.wind : d.wind;
}

function frontHero() { return aliveH()[0]; }

function hurt(h, dmg, crit) {
  if (h.dead) return;
  const sh = (WEAPONS[save.heroes[h.id].weapon] || {}).shield || 0;          // Sword & shield
  const d = Math.round(dmg * (1 - sh) * (1 - armorBonus(h.id).dr) * (h.guard > 0 ? 0.6 : 1));          // armor takes its share off every hit          // Iron Guard: 40% less damage
  h.hp -= d; h.hit = 0.25;
  snd(crit ? 'hurtcrit' : 'hurt');
  floater(h.x, h.y - unitTop(h.id, 70) - 4, crit ? '-' + d + '!' : '-' + d, crit ? '#ff5a3c' : '#ff8a7a', crit);
  if (crit) h.hit = 0.4;
  if (h.hp <= 0) { h.hp = 0; h.dead = true; snd('herodown'); }
}

/* A normal monster hit: it may crit (the boss charge below never does). */
function monHit(t, e, d) {
  const crit = Math.random() < (d.crit || 0);
  snd('mhit', { c: monCat(e.type), s: d.scale });                 // the strike itself, in the monster's own way (the hero's reaction follows in hurt())
  hurt(t, d.dmg * e.dmgMult * (crit ? CRIT.mon : 1), crit);
}

function strike(e) {
  const d = MON[e.type];
  const kind = e.kind;
  e.state = 'idle'; e.kind = null;
  if (kind === 'charge') {
    e.lungeDur = 0.55; e.lunge = 0.55; e.lungeDist = e.x - 150;
    later(0.2, () => {
      snd('mhit', { c: monCat(e.type), s: d.scale * 1.4 }); for (const h of aliveH()) hurt(h, d.charge.dmg * e.dmgMult * CHARGE_SOFT);
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
    later(0.15, () => monHit(t, e, d));
  } else {
    const back = aliveH().filter(h => HERO[h.id].row === 'back');
    const t = (back.length ? back : aliveH())[Math.floor(Math.random() * (back.length || aliveH().length))];
    if (!t) return;
    snd('mshot', { c: monCat(e.type) });
    B.fx.push({ k: 'proj', x0: e.x - 10, y0: e.y - 28, x1: t.x, y1: t.y - 28, t: 0, dur: 0.45, kind: 'seed', cb: () => monHit(t, e, d) });
  }
}

function endBattle(result) {
  if (!B || B.over) return;
  B.over = true; B.result = result;
  B.endT = B.t + (result === 'retreat' ? 0 : 0.9);
  if (result === 'win' || result === 'lose') outroUi(result);
  if (result === 'retreat') { if (run && run.wins) showRunSummary(); else closeBattle(); }
}

/* ------------------- fight intro / end graphics (DOM overlay on the arena) ------------------- */
const INTRO = 0.85;                                   // seconds: the units walk in and nobody attacks yet
const arenaFx = () => document.getElementById('arena-fx');
function fxAdd(html, ms) {
  const L = arenaFx(); if (!L) return null;
  const d = document.createElement('div'); d.innerHTML = html;
  const el = d.firstElementChild; L.appendChild(el);
  if (ms) setTimeout(() => el.remove(), ms);
  return el;
}
function fxClear() { const L = arenaFx(); if (L) L.innerHTML = ''; }
function curtain(black, instant) {
  const c = $('#curtain'); if (!c) return;
  if (instant) { c.style.transition = 'none'; c.classList.toggle('black', black); void c.offsetWidth; c.style.transition = ''; }
  else c.classList.toggle('black', black);
}
const sparkHtml = n => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * 6.283 + Math.random() * 0.5, d = 70 + Math.random() * 90;
  return `<i class="spark" style="--dx:${Math.round(Math.cos(a) * d * 1.4)}px;--dy:${Math.round(Math.sin(a) * d * 0.8 - 20)}px;animation-delay:${(Math.random() * 0.12).toFixed(2)}s"></i>`;
}).join('');
/* A new fight: fade in from black, a "Fight N" / "Fight!" banner, the heroes and monsters walk in. */
function introUi() {
  fxClear(); curtain(true, true);
  snd('horn');
  setTimeout(() => curtain(false), 40);
  const n = repeatOn && run ? run.wins + 1 : 0;
  fxAdd(`<div class="ibanner"><b>${n ? 'Fight ' + n : 'Fight!'}</b><small>${B.spec.title}</small></div>`, 1500);
}
function introStep(dt) {
  const k = Math.min(1, B.t / B.intro), e = 1 - Math.pow(1 - k, 3);
  for (const en of B.enemies) en.x = en.hx + 150 * (1 - e);
  for (const h of B.heroes) h.x = h.hx - 70 * (1 - e);
  fxStep(dt);
}
/* The moment a fight is won or lost. */
function outroUi(result) {
  fxClear();
  if (result === 'win') {
    const n = starRating();
    fxAdd(`<div class="vbanner"><b>VICTORY!</b><div class="stars">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div></div>`, 1900);
    fxAdd(`<div class="sparks">${sparkHtml(26)}</div>`, 1300);
    snd('victory');
    if (window.music) window.music.duck(2.6);                                  // let the fanfare be heard
    [350, 620, 890].slice(0, n).forEach(ms => setTimeout(() => { if (B) snd('star'); }, ms));
  } else {
    fxAdd('<div class="vbanner defeat"><b>Defeated</b></div>', 1900);
    snd('defeat');
    if (window.music) window.music.set(null);                                  // the fight music stops
  }
}
/* Repeat mode: what the win paid, as chips over the arena. */
function rewardsUi(w) {
  const chips = [];
  if (w.gold) chips.push(`<div style="animation-delay:0s,0s"><i class="ico gold"></i>+${fmt(w.gold)}</div>`);
  if (w.lumber) chips.push(`<div style="animation-delay:.12s,0s"><i class="ico lumber"></i>+${fmt(w.lumber)}</div>`);
  if (w.drop) chips.push(`<div class="vdrop" style="animation-delay:.25s,0s">${itemIcon(w.drop, 'sm')}<span><small>${isArmor(w.drop) ? 'New armor!' : 'New weapon!'}</small><b>${(w.dropGrade ? GRADES[w.dropGrade].name + ' ' : '') + itemInfo(w.drop).name}</b></span></div>`);
  if (chips.length) fxAdd(`<div class="vrewards">${chips.join('')}</div>`, 1500);
  if (w.gold || w.lumber) snd('coins');
  if (w.drop) setTimeout(() => snd('drop'), 250);
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
  return Object.entries(m).map(([k, n]) => { const [g, w] = k.split(':'); return (Number(g) ? GRADES[g].name + ' ' : '') + itemInfo(w).name + (n > 1 ? ` ×${n}` : ''); }).join(', ');
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
function restartBattle() { const s = B.spec; clearTimeout(B.autoT); clearTimeout(B.fadeT); cancelAnimationFrame(B.raf); B = null; startBattle(s); }
/* The end-of-run screen (Retreat, or Repeat switched off while waiting for the next fight). */
function showRunSummary() {
  if (!B) return;
  clearTimeout(B.autoT); clearTimeout(B.fadeT); fxClear(); curtain(false, true); if (window.music) window.music.set('village');
  if (B.result === 'win' && !B.resolved) addRun(B.spec.onWin());          // a win that was still counting down is paid, not lost
  B.resolved = true; B.resolvedAt = Date.now(); B.over = true; repeatOn = false;
  const t = run || newRun(), r = $('#result');
  r.innerHTML = `<div class="box rescard win"><div class="rhead"><h2 class="rtitle">Repeat run</h2><p class="rsub2">${B.spec.title} · ${t.wins} fight${t.wins === 1 ? '' : 's'} won</p></div>
    <div class="rbody"><div class="rtiles"><div class="rtile"><i class="ico gold"></i><b class="count" data-to="${t.gold}">+0</b><small>Gold</small></div>
      <div class="rtile"><i class="ico lumber"></i><b class="count" data-to="${t.lumber}">+0</b><small>Lumber</small></div></div>
      ${t.drops.length ? `<div class="unlockbar"><i class="ico m swords"></i><span><b>Found:</b> ${dropsText(t.drops)}</span></div>` : '<p class="note">No weapons dropped this run.</p>'}
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
  snd(e.found.length ? 'drop' : 'coins');
  const d = document.createElement('div');
  d.className = 'result dialog'; d.id = 'farm-report';
  d.innerHTML = `<div class="box"><h2>Farm report</h2><p class="note">${STAGE[e.stage].name} · out for ${fmtDur(e.mins)}</p>
    <div class="rtiles"><div class="rtile"><i class="ico gold"></i><b>+${fmt(e.gold)}</b><small>Gold</small></div><div class="rtile"><i class="ico lumber"></i><b>+${fmt(e.lumber)}</b><small>Lumber</small></div></div>
    ${e.found.length ? `<div class="unlockbar"><i class="ico m swords"></i><span><b>Weapons found:</b> ${dropNames(e.found, e.grade)}</span></div>` : `<p class="note">No weapons or armor this time. You get one roll per full hour away (${pctText(DROP.autoPerHour)} each), so long trips pay best, and fighting by hand has the best chance.</p>`}
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
  const W = itemInfo(w), n = (isArmor(w) ? save.armors : save.items)[w][g], ready = g < GRADES.length - 1 && n >= MERGE_N, next = GRADES[g + 1] && GRADES[g + 1].name;
  const pips = Array.from({ length: MERGE_N }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  return `<div class="dropcard" style="--g:${GRADES[g].color}">
    <div class="vport big">${itemIcon(w)}</div>
    <div class="dinfo2"><small>${isArmor(w) ? 'New armor!' : 'New weapon!'}</small><b>${W.name}</b>
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
  if (B.spec.enemies.includes('boar')) tips.push({ t: 'The Thornback Boar scrapes the ground before it charges the whole party. Heal up, or use Iron Guard or Bulwark when you see the warning.' });
  const unhired = HERO_ORDER.filter(id => !isHired(id)).sort((a, b) => HERO[a].hire - HERO[b].hire)[0];
  const lvlId = party().find(id => save.gold >= lvlCost(save.heroes[id].lvl));
  const mergeReady = Object.keys(WEAPONS).some(w => save.items[w].some((n, g) => g < GRADES.length - 1 && n >= MERGE_N)) || ARMOR_IDS.some(a => save.armors[a].some((n, g) => g < GRADES.length - 1 && freeArmor(a, g) >= MERGE_N));
  if (unhired && save.gold >= HERO[unhired].hire) tips.push({ t: `You have enough gold to hire ${HERO[unhired].name}. A bigger party hits harder.`, btn: ['Open Party', '__party'] });
  else if (lvlId) tips.push({ t: `You can afford to level up ${HERO[lvlId].name}.`, btn: ['Open Party', '__party'] });
  else if (mergeReady) tips.push({ t: 'Some of your weapons or armor can be merged into a stronger grade.', btn: ['Open Forge', '__forge'] });
  if (!tips.length) tips.push({ t: 'Heroes recover fully in the village. Use your skills sooner, or farm some gold and level up.' });
  return tips.slice(0, 2);
}
function loseHtml() {
  const tips = defeatTips();
  return `<div class="box rescard lose">
    <div class="rhead"><h2 class="rtitle">Your party fell back</h2><p class="rsub2">${B.spec.title}</p></div>
    <div class="rbody">
      ${heroesRow()}
      ${B.repeatStopped ? '<p class="note repeatstop"><b>∞ Repeat stopped</b> because your party fell.</p>' : ''}
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
  B.resolved = true; B.resolvedAt = Date.now();
  if (B.result === 'win') {
    const w = B.spec.onWin();
    B.lastR = w;
    if (repeatOn && B.spec.repeatable) {
      addRun(w);
      if (!(w.first || w.tower || w.unlock)) {                       // a plain win: pay it, show a line in the log and go again
        B.nowMsg = `Victory! +${fmt(w.gold)} gold, +${fmt(w.lumber)} lumber${w.drop ? ` · Found ${dropsText([[w.drop, w.dropGrade]])}` : ''}. Next fight starting…`;
        repeatUi();
        rewardsUi(w);
        if (window.wlOnSafePoint) window.wlOnSafePoint();                   // a waiting update can be installed now: the win is paid and saved
        const cur = B;
        B.fadeT = setTimeout(() => { if (B === cur && repeatOn) curtain(true); }, 1000);          // fade to black, then the next fight
        B.autoT = setTimeout(() => { if (B === cur && repeatOn) restartBattle(); }, 1380);
        return;
      }
      repeatOn = false;                                              // a first clear, a watchtower or a new area gets the full screen
    }
    fxClear();
    r.innerHTML = winHtml(w);
    if (window.music) window.music.set('village');
    if (w.first || w.tower) { setTimeout(() => snd('fanfare'), 500); if (window.music) window.music.duck(3.6); } else if (w.drop) snd('drop'); else snd('coins');
  } else { B.repeatStopped = repeatOn; repeatOn = false; fxClear(); r.innerHTML = loseHtml(); if (window.music) window.music.set('village'); }          // losing a fight always ends a repeat run
  repeatUi();
  r.hidden = false;
  paintPortraits();
  animateCounts(r);
}
actions.__party = () => { closeBattle(); actions.tab('party'); };
actions.__forge = () => { closeBattle(); actions.tab('forge'); };
actions.__close = () => { snd('tap'); closeBattle(); };
actions.__again = () => { snd('tap'); if (!repeatOn) run = null; restartBattle(); };
actions.__repeat = () => { snd('toggle'); run = newRun(); if (B.lastR) addRun(B.lastR); repeatOn = true; restartBattle(); };
actions.repeat = () => {
  if (!B || !B.spec.repeatable) return;
  snd('toggle');
  repeatOn = !repeatOn;
  if (!repeatOn) { clearTimeout(B.autoT); if (B.resolved && B.result === 'win' && $('#result').hidden) { showRunSummary(); return; } }
  repeatUi();
};
actions.farmreportok = closeFarmReport;

function closeBattle() {
  if (B) { cancelAnimationFrame(B.raf); clearTimeout(B.autoT); clearTimeout(B.fadeT); }
  fxClear(); curtain(false, true);
  if (typeof clearSkillBar === 'function') clearSkillBar();
  if (window.music) window.music.set('village');
  repeatOn = false; run = null;
  B = null;
  $('#battle').hidden = true;
  $('#result').hidden = true;
  document.body.style.overflow = '';
  render();
}

/* the warning line above the skills while a boss is winding up its charge */
function warnUi() {
  const w = $('#warn'), boss = B.enemies.find(e => !e.dead && e.state === 'wind' && e.kind === 'charge');
  w.textContent = boss ? `⚠ ${MON[boss.type].name} is about to charge!` : '';
  w.classList.toggle('on', !!boss);
}

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

/* Health bars and effects use art.js hooks when present; the plain versions below are fallbacks. */
function hpBar(c, x, y, w, frac, kind) {
  if (typeof drawHpBar === 'function') drawHpBar(c, x, y, w, frac, kind);
  else drawBar(c, x, y, w, frac, kind === 'enemy' ? '#e0624a' : '#6cc37c');
}

function draw() {
  const c = ctx;
  camSet(c);
  c.filter = 'none'; c.globalAlpha = 1;
  drawBackground(c);

  const warn = B.enemies.some(e => !e.dead && e.state === 'wind' && e.kind === 'charge');
  const items = [];
  for (const h of B.heroes) items.push({ y: h.y, f: () => {
    const w = save.heroes[h.id].weapon;
    drawHero(c, h.id, h.x, h.y, { weapon: w, armor: save.heroes[h.id].armor, t: B.t, swing: h.swing, lean: h.draw > 0 ? 1 - h.draw / 0.25 : 0, dead: h.dead, hit: h.hit, });
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
    if (e.chill > 0 && !e.dead) {                                           // frozen: a pale blue glow and a few ice crystals
      const sc = MON[e.type].scale, hh = unitTop(e.type, 56 * sc);
      c.save(); c.globalAlpha = Math.min(0.5, e.chill * 0.4); c.fillStyle = '#9fd8ff'; ell(c, e.x, e.y - hh * 0.5, 22 * sc, hh * 0.55); c.fill(); c.restore();
    }
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

  for (const f of B.fx) {
    if (typeof drawMagicFx === 'function' && drawMagicFx(c, f)) continue;     // skills.js: slash arcs, lightning, ice, leaves, novas...
    if (typeof drawFx === 'function' && drawFx(c, f, B.t)) continue;
    const k = f.t / (f.life || f.dur || 1);
    if (f.k === 'txt') {
      c.globalAlpha = 1 - k * k; c.fillStyle = f.c; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 3;
      c.font = (f.big ? 'bold 21px' : 'bold 15px') + ' sans-serif'; c.textAlign = 'center';
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
  if (warn) { c.fillStyle = `rgba(255,60,40,${0.06 + 0.05 * Math.sin(B.t * 16)})`; c.fillRect(...viewRect()); }
}

/* ----------------------------- boot --------------------------------- */
(function boot() {
  // Welcome back message if the party has been out a while.
  const g = farmGain();
  render();
  if (window.music) window.music.set('village');                                          // background music: the village theme (it starts after the first tap)
  if (g && g.mins >= 1) toast(`Your party gathered ${gainText(g)} while you were away.`);
  try {                                                                  // an update reloaded the game in the middle of a repeat run: carry on
    const rid = sessionStorage.getItem('wl-resume');
    if (rid) {
      sessionStorage.removeItem('wl-resume');
      if (STAGE[rid] && isUnlocked(STAGE[rid])) { window.__wlResume = true; setTimeout(() => { actions.fight(rid); toast('Updated. Your repeat run carries on.'); }, 700); }
    }
  } catch (e) { /* ignore */ }
  window.__wl = { get save() { return save; }, persist, render, actions, startBattle, get B() { return B; } };
})();
