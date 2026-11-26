'use strict';
/* =====================================================================
   Wildlight Expedition – first playable version
   Heroes: Bren, Tavi, Iona · Stages: Pinewood Path, Ironroot Hollow,
   Thornback Crossing · Weapons: standard sword, twin swords, greatsword,
   hunting bow, wooden staff.
   ===================================================================== */

/* ---------------------------- data ---------------------------------- */
const HERO = {
  bren: { name: 'Bren Alder', role: 'Guardian · Front line', family: 'sword', hp: 120, atk: 8, x: 135, y: 184,
          blurb: 'Stands in front and takes most melee hits. Braces low when the party barrier goes up.' },
  tavi: { name: 'Tavi Reed', role: 'Archer · Ranged damage', family: 'bow', hp: 70, atk: 7, x: 72, y: 152,
          blurb: 'Fires from behind Bren. A quick backward lean before each shot.' },
  iona: { name: 'Iona Moss', role: 'Herbalist · Healing', family: 'staff', hp: 70, atk: 4, x: 62, y: 214,
          blurb: 'Casts bolts from the back and heals the weakest ally. A ring of petals shows who was healed.' },
};
const HERO_ORDER = ['bren', 'tavi', 'iona'];
const FAMILY = { sword: 'Sword', bow: 'Bow', staff: 'Staff' };

const WEAPONS = {
  sword: { name: 'Standard sword', fam: 'sword', hits: [1], int: 1.0, starter: true,
           desc: 'Steady attacks with balanced speed and damage.' },
  twin:  { name: 'Twin swords', fam: 'sword', hits: [0.55, 0.55], int: 0.85, recipe: 'path', cost: { gold: 100, iron: 15 },
           desc: 'Two quick strikes per attack against one monster.' },
  great: { name: 'Greatsword', fam: 'sword', hits: [1.7], int: 1.9, splash: 0.6, recipe: 'hollow', cost: { gold: 250, iron: 40 },
           desc: 'Slow, heavy swings that also hit nearby monsters.' },
  bow:   { name: 'Hunting bow', fam: 'bow', hits: [1], int: 1.0, ranged: true, starter: true,
           desc: 'Steady ranged attacks against one monster.' },
  staff: { name: 'Wooden staff', fam: 'staff', hits: [1], int: 1.2, ranged: true, heal: true, starter: true,
           desc: 'Casts bolts and periodically heals the weakest ally.' },
};

const MON = {
  brushfang: { name: 'Brushfang', role: 'Pack melee', hp: 28, armor: 0, cd: 2.2, wind: 0.6, dmg: 6, tgt: 'front', scale: 1 },
  beetle:    { name: 'Rustshell Beetle', role: 'Armored melee', hp: 80, armor: 3, cd: 2.4, wind: 0.5, dmg: 9, tgt: 'front', scale: 1 },
  spitter:   { name: 'Pinecap Spitter', role: 'Ranged attacker', hp: 45, armor: 0, cd: 3.0, wind: 0.8, dmg: 10, tgt: 'back', scale: 1 },
  boar:      { name: 'Thornback Boar', role: 'Stage boss', hp: 650, armor: 0, cd: 2.6, wind: 0.4, dmg: 7, tgt: 'front', scale: 1.5,
               charge: { first: 6, every: 8, wind: 1.4, dmg: 55 } },
};

const STAGES = [
  { id: 'path', name: 'Pinewood Path', req: null, enemies: ['brushfang', 'brushfang', 'brushfang', 'brushfang'],
    blurb: 'A pack of Brushfangs. Best for farming gold.', farm: { gold: 4, iron: 0.3 }, best: 'Gold',
    first: { gold: 60, iron: 5, recipe: 'twin' }, repeat: { gold: 12, iron: 0 }, sky: ['#2d5a45', '#14301f'] },
  { id: 'hollow', name: 'Ironroot Hollow', req: 'path', enemies: ['beetle', 'beetle', 'spitter'],
    blurb: 'Rustshell Beetles screen a Pinecap Spitter. Best for farming iron.', farm: { gold: 1.5, iron: 1.5 }, best: 'Iron',
    first: { gold: 120, iron: 10, recipe: 'great' }, repeat: { gold: 15, iron: 1 }, sky: ['#27495a', '#102430'] },
  { id: 'crossing', name: 'Thornback Crossing', req: 'hollow', enemies: ['boar'], boss: true,
    blurb: 'The Thornback Boar fights alone. Defeat it to relight the watchtower and open the next road.',
    farm: { gold: 6, iron: 2.5 }, best: 'Gold + iron',
    first: { gold: 300, iron: 20, tower: true }, repeat: { gold: 40, iron: 3 }, sky: ['#5a4a3a', '#2a1f17'] },
];
const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));

const LAYOUT = {
  1: [[290, 192]],
  2: [[270, 172], [275, 214]],
  3: [[255, 170], [262, 214], [352, 190]],
  4: [[250, 190], [295, 160], [300, 216], [348, 186]],
};

const BAR_DUR = 1.6, BAR_CD = 8;
const FARM_CAP_MIN = 24 * 60;

/* ---------------------------- save ---------------------------------- */
const SAVE_KEY = 'wildlight-expedition-v1';
function newSave() {
  return {
    gold: 0, iron: 0, cleared: {}, recipes: {}, crafted: {}, towers: {},
    heroes: {
      bren: { lvl: 1, up: 0, weapon: 'sword' },
      tavi: { lvl: 1, up: 0, weapon: 'bow' },
      iona: { lvl: 1, up: 0, weapon: 'staff' },
    },
    farm: null, daily: { date: '', done: false }, tab: 'map',
  };
}
let save = (() => {
  const base = newSave();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (raw) {
      Object.assign(base, raw);
      for (const id of HERO_ORDER) base.heroes[id] = Object.assign(newSave().heroes[id], (raw.heroes || {})[id]);
    }
  } catch (e) { /* start fresh */ }
  return base;
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }

/* --------------------------- helpers -------------------------------- */
const $ = s => document.querySelector(s);
const fmt = n => Math.floor(n).toLocaleString();
const today = () => new Date().toLocaleDateString('sv');
const isUnlocked = s => !s.req || !!save.cleared[s.req];
const sumLevels = () => HERO_ORDER.reduce((a, id) => a + save.heroes[id].lvl, 0);
const lvlCost = l => 40 * l;
const upCost = u => ({ gold: 80 * (u + 1), iron: 6 * (u + 1) });
const canAfford = c => save.gold >= (c.gold || 0) && save.iron >= (c.iron || 0);
const pay = c => { save.gold -= c.gold || 0; save.iron -= c.iron || 0; };
const owned = w => WEAPONS[w].starter || save.crafted[w];

function heroStats(id) {
  const s = save.heroes[id], d = HERO[id];
  const lm = 1 + 0.12 * (s.lvl - 1), um = 1 + 0.15 * s.up;
  return { maxHp: Math.round(d.hp * lm), atk: d.atk * lm * um, heal: 14 * lm * um };
}

/* ---------------------------- farming ------------------------------- */
const farmMult = () => 1 + 0.06 * (sumLevels() - 3);
function farmGain() {
  if (!save.farm) return null;
  const st = STAGE[save.farm.stage];
  const mins = Math.max(0, Math.min(FARM_CAP_MIN, (Date.now() - save.farm.since) / 60000));
  const m = farmMult();
  return { mins, full: mins >= FARM_CAP_MIN, gold: Math.floor(mins * st.farm.gold * m), iron: Math.floor(mins * st.farm.iron * m) };
}
function claimFarm(quiet) {
  const g = farmGain();
  if (!g) return;
  save.gold += g.gold; save.iron += g.iron;
  save.farm.since = Date.now();
  persist(); hud();
  if (!quiet) toast(`Collected ${fmt(g.gold)} gold and ${fmt(g.iron)} iron.`);
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
function dailyReward(m) { return m === 'boar' ? { gold: 150, iron: 25 } : m === 'beetle' || m === 'spitter' ? { gold: 60, iron: 15 } : { gold: 50, iron: 8 }; }

/* ---------------------------- UI shell ------------------------------ */
function hud() {
  $('#gold').textContent = fmt(save.gold);
  $('#iron').textContent = fmt(save.iron);
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
  if (c.gold) parts.push(`<b class="${save.gold >= c.gold ? '' : 'short'}">🪙 ${fmt(c.gold)}</b>`);
  if (c.iron) parts.push(`<b class="${save.iron >= c.iron ? '' : 'short'}">⛏️ ${fmt(c.iron)}</b>`);
  return parts.join(' ');
};
const gainText = g => [g.gold ? `${fmt(g.gold)} gold` : '', g.iron ? `${fmt(g.iron)} iron` : ''].filter(Boolean).join(' · ') || 'nothing yet';

function render() {
  hud();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.arg === save.tab));
  $('#view').innerHTML = ({ map: renderMap, party: renderParty, forge: renderForge })[save.tab]();
  paintPortraits();
  tickFarm();
  startMapLoop();
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

function renderMap() {
  const fg = farmGain();
  const cur = save.farm ? STAGE[save.farm.stage] : null;
  // art.js paints the map on a canvas (animated); the SVG is the fallback when drawMap is missing.
  let h = typeof drawMap === 'function'
    ? `<canvas id="map-canvas" class="map" width="1080" height="450" role="img" aria-label="Village map"></canvas>`
    : mapSvg();

  h += `<div class="card"><h2>Your party is ${cur ? `farming at ${cur.name}` : 'resting in the village'}</h2>`;
  if (cur) {
    h += `<p class="sub">They keep gathering while you're away, for up to 24 hours.</p>
      <div class="big" id="farm-gain">${gainText(fg)}</div>
      <div class="bar"><i id="farm-bar" style="width:${(fg.mins / FARM_CAP_MIN * 100).toFixed(1)}%"></i></div>
      <p class="note" id="farm-time"></p>
      <button class="btn good" data-act="claim" id="claim-btn">Claim</button>`;
  } else {
    h += `<p class="sub">Clear a stage, then send the party to farm it.</p>`;
  }
  h += `</div>`;

  const dm = dailyMonster(), dr = dailyReward(dm), done = dailyDone();
  h += `<div class="card"><div class="row between"><h2>Today's bonus hunt</h2>${done ? '<span class="tag ok">Done today</span>' : '<span class="tag farm">Bonus</span>'}</div>
    <p class="sub">${MON[dm].name} · ${MON[dm].role}. Beat it once for extra materials: ${gainText(dr)}.</p>
    <button class="btn" data-act="bonus" ${done ? 'disabled' : ''}>${done ? 'Come back tomorrow' : 'Hunt'}</button></div>`;

  for (const s of STAGES) {
    const open = isUnlocked(s), cleared = !!save.cleared[s.id], farming = save.farm && save.farm.stage === s.id;
    h += `<div class="card stage-card ${open ? '' : 'locked'}">
      <div class="row between"><h3>${s.name}</h3>${
        !open ? '<span class="tag lock">Locked</span>' : cleared ? '<span class="tag ok">Cleared</span>' : '<span class="tag">New</span>'}</div>
      <p class="sub">${s.blurb}</p>
      <div class="meta">${[...new Set(s.enemies)].map(m => `<span class="tag">${MON[m].name}${s.enemies.filter(x => x === m).length > 1 ? ' ×' + s.enemies.filter(x => x === m).length : ''}</span>`).join('')}
        ${cleared ? `<span class="tag farm">Farm: ${s.best}</span>` : ''}${s.first.recipe && !cleared ? `<span class="tag">First clear: ${WEAPONS[s.first.recipe].name} recipe</span>` : ''}</div>
      <div class="row">
        <button class="btn" data-act="fight" data-arg="${s.id}" ${open ? '' : 'disabled'}>${s.boss ? 'Challenge boss' : 'Fight'}</button>
        <button class="btn alt" data-act="farm" data-arg="${s.id}" ${cleared && !farming ? '' : 'disabled'}>${farming ? 'Farming here' : cleared ? 'Send party to farm' : 'Clear to farm'}</button>
      </div></div>`;
  }
  h += `<p class="note">${save.cleared.crossing ? 'The watchtower is lit. The next road will open in a later version.' : 'Beat the boss at Thornback Crossing to relight the watchtower.'}</p>`;
  return h;
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
      drawMap(c, { cleared: save.cleared, farming: save.farm ? save.farm.stage : null }, (now - t0) / 1000);
    }
    mapRaf = requestAnimationFrame(frame);
  };
  mapRaf = requestAnimationFrame(frame);
}

function tickFarm() {
  const g = farmGain();
  if (!g || save.tab !== 'map') return;
  const a = $('#farm-gain'); if (!a) return;
  a.textContent = gainText(g);
  $('#farm-bar').style.width = (g.mins / FARM_CAP_MIN * 100).toFixed(1) + '%';
  const m = Math.floor(g.mins), hh = Math.floor(m / 60);
  $('#farm-time').textContent = g.full ? 'Your party has gathered all it can carry – claim it!' : `Out for ${hh}h ${m % 60}m of 24h.`;
}
setInterval(tickFarm, 1000);

/* ------------------------------ party ------------------------------- */
function renderParty() {
  let h = `<p class="note">Spend gold to level heroes. Upgrading a weapon family improves every variant for that hero.</p>`;
  for (const id of HERO_ORDER) {
    const d = HERO[id], s = save.heroes[id], st = heroStats(id);
    const lc = { gold: lvlCost(s.lvl) }, uc = upCost(s.up);
    const ws = Object.keys(WEAPONS).filter(w => WEAPONS[w].fam === d.family && owned(w));
    h += `<div class="card"><div class="hero-card"><canvas data-hero="${id}" width="180" height="200"></canvas>
      <div class="info"><h3>${d.name}</h3><p class="sub">${d.role}</p>
      <p class="note">Level ${s.lvl} · ${st.maxHp} HP · ${FAMILY[d.family]} +${s.up}</p>
      <p class="note">${d.blurb}</p></div></div>
      <div class="row" style="margin-top:10px">
        <button class="btn" data-act="lvl" data-arg="${id}" ${canAfford(lc) ? '' : 'disabled'}>Level up <span class="cost">${costHtml(lc)}</span></button>
        <button class="btn alt" data-act="up" data-arg="${id}" ${canAfford(uc) ? '' : 'disabled'}>Upgrade ${FAMILY[d.family].toLowerCase()}s <span class="cost">${costHtml(uc)}</span></button>
      </div>
      <div class="weapons">${ws.map(w => `<button class="weapon ${s.weapon === w ? 'on' : ''}" data-act="equip" data-arg="${id}:${w}">
        <span><b>${WEAPONS[w].name}</b><small>${WEAPONS[w].desc}</small></span></button>`).join('')}</div></div>`;
  }
  return h;
}
function paintPortraits() {
  document.querySelectorAll('canvas[data-hero]').forEach(cv => {
    const id = cv.dataset.hero, c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.save(); c.scale(2, 2);
    drawHero(c, id, 40, 92, { weapon: save.heroes[id].weapon, t: 0 });
    c.restore();
  });
}

/* ------------------------------ forge ------------------------------- */
function renderForge() {
  let h = `<p class="note">Clear stages to unlock recipes, then craft each variant once. Swap crafted weapons freely between fights from the Party tab.</p>`;
  for (const w of Object.keys(WEAPONS).filter(k => WEAPONS[k].recipe)) {
    const W = WEAPONS[w], unlocked = save.recipes[w], crafted = save.crafted[w];
    h += `<div class="card"><div class="row between"><h3>${W.name}</h3>${
      crafted ? '<span class="tag ok">Crafted</span>' : unlocked ? '<span class="tag farm">Recipe known</span>' : '<span class="tag lock">Locked</span>'}</div>
      <p class="sub">${FAMILY[W.fam]} · ${W.desc}</p>
      ${crafted ? '<p class="note">Equip it from the Party tab.</p>' :
        `<div class="row"><button class="btn" data-act="craft" data-arg="${w}" ${unlocked && canAfford(W.cost) ? '' : 'disabled'}>Craft</button>
         <span class="cost">${costHtml(W.cost)}</span></div>
         ${unlocked ? '' : `<p class="note">Clear ${STAGE[W.recipe].name} to unlock this recipe.</p>`}`}</div>`;
  }
  h += `<div class="card"><h3>More recipes</h3><p class="sub">Bow and staff variants, plus the sword and shield, saber, rapier and falchion, unlock in later areas.</p></div>`;
  return h;
}

/* ----------------------------- actions ------------------------------ */
const actions = {
  tab(t) { save.tab = t; persist(); render(); },
  claim() { claimFarm(false); render(); },
  farm(id) {
    if (!save.cleared[id]) return;
    if (save.farm) claimFarm(true);
    save.farm = { stage: id, since: Date.now() };
    persist(); toast(`Party sent to ${STAGE[id].name}.`); render();
  },
  lvl(id) {
    const c = { gold: lvlCost(save.heroes[id].lvl) };
    if (!canAfford(c)) return;
    pay(c); save.heroes[id].lvl++; persist(); render();
  },
  up(id) {
    const c = upCost(save.heroes[id].up);
    if (!canAfford(c)) return;
    pay(c); save.heroes[id].up++; persist(); render();
  },
  equip(arg) {
    const [id, w] = arg.split(':');
    if (owned(w) && WEAPONS[w].fam === HERO[id].family) { save.heroes[id].weapon = w; persist(); render(); }
  },
  craft(w) {
    const W = WEAPONS[w];
    if (!save.recipes[w] || save.crafted[w] || !canAfford(W.cost)) return;
    pay(W.cost); save.crafted[w] = true; persist(); toast(`Crafted ${W.name}!`); render();
  },
  fight(id) {
    const s = STAGE[id];
    if (!isUnlocked(s)) return;
    startBattle({ title: s.name, sky: s.sky, enemies: s.enemies, onWin: () => stageWin(s) });
  },
  bonus() {
    if (dailyDone()) return;
    const m = dailyMonster(), s = STAGES.filter(isUnlocked).find(x => x.enemies.includes(m));
    startBattle({ title: `Bonus hunt: ${MON[m].name}`, sky: s.sky, enemies: [m], hpMult: m === 'boar' ? 1 : 1.5, onWin: () => bonusWin(m) });
  },
  barrier() { raiseBarrier(); },
  retreat() { if (B) endBattle('retreat'); },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || !actions[b.dataset.act]) return;
  actions[b.dataset.act](b.dataset.arg);
});
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && B) { e.preventDefault(); raiseBarrier(); }
});

function stageWin(s) {
  const lines = [];
  if (!save.cleared[s.id]) {
    save.cleared[s.id] = true;
    save.gold += s.first.gold; save.iron += s.first.iron;
    lines.push(`First clear bonus: ${gainText(s.first)}`);
    if (s.first.recipe) { save.recipes[s.first.recipe] = true; lines.push(`Recipe unlocked: ${WEAPONS[s.first.recipe].name}`); }
    if (s.first.tower) { save.towers[s.id] = true; lines.push('The watchtower is relit and the next road is opening!'); }
    const nxt = STAGES.find(x => x.req === s.id);
    if (nxt) lines.push(`New area open: ${nxt.name}`);
  } else {
    save.gold += s.repeat.gold; save.iron += s.repeat.iron;
    lines.push(`Loot: ${gainText(s.repeat)}`);
  }
  persist();
  return lines;
}
function bonusWin(m) {
  const r = dailyReward(m);
  save.gold += r.gold; save.iron += r.iron;
  save.daily = { date: today(), done: true };
  persist();
  return [`Bonus hunt loot: ${gainText(r)}`];
}

/* ===================================================================
   BATTLE
   =================================================================== */
let B = null;
const cv = $('#stage'), ctx = cv.getContext('2d');

function startBattle(spec) {
  const slots = LAYOUT[spec.enemies.length] || LAYOUT[4];
  B = { spec, t: 0, over: false, result: null, endT: 0, heroes: [], enemies: [], fx: [], later: [], bar: { t: 0, cd: 0 }, last: 0, raf: 0 };
  HERO_ORDER.forEach(id => {
    const st = heroStats(id);
    B.heroes.push({ id, hp: st.maxHp, maxHp: st.maxHp, cd: 0.4 + Math.random() * 0.4, draw: 0, swing: 0, heal: 2.5, dead: false, hit: 0, x: HERO[id].x, y: HERO[id].y });
  });
  spec.enemies.forEach((type, i) => {
    const d = MON[type], hp = Math.round(d.hp * (spec.hpMult || 1));
    B.enemies.push({ type, hp, maxHp: hp, x: slots[i][0], y: slots[i][1], cd: d.cd * (0.35 + 0.5 * Math.random() + i * 0.08),
      state: 'idle', kind: null, wt: 0, wd: 0, lunge: 0, lungeDur: 0.35, lungeDist: 0, flash: 0, dead: false, fade: 0,
      chargeT: d.charge ? d.charge.first : 0 });
  });
  $('#battle-title').textContent = spec.title;
  $('#result').hidden = true;
  $('#battle').hidden = false;
  document.body.style.overflow = 'hidden';
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
  const d = Math.max(1, Math.round(raw - MON[e.type].armor));
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
      else for (const h of aliveH()) hurt(h, d.charge.dmg);
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
    later(0.15, () => hurt(t, d.dmg));
  } else {
    const back = aliveH().filter(h => h.id !== 'bren');
    const t = (back.length ? back : aliveH())[Math.floor(Math.random() * (back.length || aliveH().length))];
    if (!t) return;
    B.fx.push({ k: 'proj', x0: e.x - 10, y0: e.y - 28, x1: t.x, y1: t.y - 28, t: 0, dur: 0.45, kind: 'seed', cb: () => hurt(t, d.dmg) });
  }
}

function endBattle(result) {
  if (!B || B.over) return;
  B.over = true; B.result = result;
  B.endT = B.t + (result === 'retreat' ? 0 : 0.9);
  if (result === 'retreat') { closeBattle(); }
}

function showResult() {
  const r = $('#result');
  if (!r.hidden || !B) return;
  let html;
  if (B.result === 'win') {
    const lines = B.spec.onWin();
    html = `<div class="box"><h2>Victory!</h2><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>
      <button class="btn good" data-act="__close">Back to the village</button></div>`;
  } else {
    html = `<div class="box"><h2>Your party fell back</h2><p class="note">Heroes recover fully in the village. Level up, craft a new weapon, or try raising the barrier sooner.</p>
      <div class="row" style="justify-content:center"><button class="btn" data-act="__again">Try again</button><button class="btn alt" data-act="__close">Village</button></div></div>`;
  }
  r.innerHTML = html; r.hidden = false;
}
actions.__close = () => closeBattle();
actions.__again = () => { const s = B.spec; cancelAnimationFrame(B.raf); B = null; startBattle(s); };

function closeBattle() {
  if (B) cancelAnimationFrame(B.raf);
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
