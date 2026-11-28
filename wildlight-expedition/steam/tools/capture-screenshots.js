// Captures the Steam screenshots (1920x1080) from the running game with headless Chrome / Edge over the DevTools protocol.
// Usage:  node steam/tools/capture-screenshots.js [shot numbers, e.g. 1 3 5] [--base http://localhost:8123/] [--out steam/screenshots]
// It starts a throw-away browser profile (your own saves are never touched), builds a save for every shot with window.__wl
// (see steam/screenshots.md), waits for the game to be ready and saves a PNG. Needs Node 22+ (global fetch and WebSocket).
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const BASE = opt('base', 'http://localhost:8123/');
const OUT = path.resolve(opt('out', path.join(__dirname, '..', 'screenshots')));
const only = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--base' && args[i - 1] !== '--out').map(Number);
const W = 1920, H = 1080, PORT = 9333;
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));
if (!CHROME) throw new Error('No Chrome or Edge found');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---- save builder, runs inside the page (all names are the game's own globals) ---- */
const BUILD = `(cfg => {
  resetGame();                                   // a brand-new save, so nothing is left over from the previous shot
  const s = __wl.save;
  // clear stages up to and including cfg.upTo (lighting watchtowers on the way), unlock the next one
  let on = true;
  for (const st of STAGES) {
    if (!on) break;
    if (cfg.upTo !== 'none') { s.cleared[st.id] = true; if (st.first && st.first.tower) s.towers[st.id] = true; }
    if (st.id === cfg.upTo) on = false;
  }
  if (cfg.notCleared) for (const id of cfg.notCleared) { delete s.cleared[id]; delete s.towers[id]; }
  s.gold = cfg.gold || 0; s.lumber = cfg.lumber || 0;
  s.hired = cfg.hired || cfg.party; s.party = cfg.party;
  for (const id of s.hired) s.heroes[id].lvl = (cfg.lvl && cfg.lvl[id]) || cfg.level || 1;
  for (const [w, g, n] of cfg.items || []) s.items[w][g] = n;
  for (const [a, g, n] of cfg.armors || []) s.armors[a][g] = n;
  for (const [id, w] of Object.entries(cfg.weapons || {})) s.heroes[id].weapon = w;
  for (const [id, a, g] of cfg.wear || []) { s.heroes[id].armor = a; s.heroes[id].armorG = g; if (s.armors[a][g] < 1) s.armors[a][g] = 1; }
  if (cfg.farm) s.farm = { stage: cfg.farm.stage, since: Date.now() - cfg.farm.hours * 3600e3 };
  s.tab = cfg.tab || 'map';
  __wl.persist(true);
  return true;
})`;

/* ---- the shots ---- */
const ALL_HEROES = ['milo', 'bren', 'tavi', 'iona', 'rook', 'elric', 'maren', 'tobin'];
const gearUp = { items: [['sword', 3, 1], ['great', 3, 1], ['twin', 2, 3], ['longbow', 3, 1], ['bow', 2, 3], ['heartwood', 3, 1], ['staff', 2, 3], ['spear', 3, 1], ['halberd', 2, 2], ['grimoire', 3, 1], ['dagger', 2, 3], ['twindaggers', 3, 1], ['gauntlets', 3, 1]] };
const midParty = { party: ['bren', 'tavi', 'iona', 'maren'], hired: ALL_HEROES, level: 24, lvl: { bren: 25, tavi: 24, iona: 24, maren: 24, milo: 12, rook: 18, elric: 20, tobin: 14 }, weapons: { bren: 'sword', tavi: 'longbow', iona: 'heartwood', maren: 'spear' },
  wear: [['bren', 'platearmor', 3], ['maren', 'chainmail', 3], ['tavi', 'leatherarmor', 3], ['iona', 'leatherarmor', 2], ['rook', 'chainmail', 2], ['elric', 'leatherarmor', 2]], ...gearUp };
const latePartyFx = { party: ['bren', 'maren', 'elric', 'tavi'], hired: ALL_HEROES, level: 42, weapons: { bren: 'great', maren: 'halberd', elric: 'grimoire', tavi: 'longbow' },
  wear: [['bren', 'platearmor', 4], ['maren', 'platearmor', 4], ['tavi', 'chainmail', 4], ['elric', 'chainmail', 4], ['iona', 'platearmor', 3], ['rook', 'platearmor', 3]], ...gearUp, gold: 1245300, lumber: 88210 };
const SHOTS = [
  { n: 1, name: '01-map-danger-meter', cfg: { upTo: 'magmagate', ...midParty, gold: 48210, lumber: 3640, farm: { stage: 'quarry', hours: 3 } }, run: async (c) => { await sleep(1500); } },
  { n: 2, name: '02-boss-fight-skills', cfg: { upTo: 'magmagate', ...midParty, level: 27, lvl: { bren: 27, tavi: 27, iona: 27, maren: 27 }, gold: 48210 }, run: async (c) => { await bossFight(c); } },
  { n: 3, name: '03-boss-telegraph', cfg: { upTo: 'warcamp', ...latePartyFx }, run: async (c) => { await telegraphShot(c); } },
  { n: 4, name: '04-hero-sheet-armor', cfg: { upTo: 'magmagate', ...midParty, gold: 48210, lumber: 3640, tab: 'party' }, run: async (c) => { await c.eval("__wl.actions.heroopen('maren')"); await sleep(1200); } },
  { n: 5, name: '05-forge-merge', cfg: { upTo: 'magmagate', ...midParty, gold: 48210, lumber: 3640, tab: 'forge', items: [...gearUp.items, ['falchion', 2, 3], ['rapier', 1, 3], ['saber', 1, 2], ['crossbow', 2, 3], ['stormstaff', 1, 3], ['woodaxe', 0, 3], ['buckler', 1, 1]], armors: [['platearmor', 2, 3], ['chainmail', 1, 3], ['leatherarmor', 1, 4]] }, run: async (c) => { await sleep(600); await c.eval("__wl.actions.forgeopen('platearmor')"); await sleep(1000); } },
  { n: 6, name: '06-goblin-mines-fight', cfg: { upTo: 'scrapheap', party: ['bren', 'rook', 'iona', 'elric'], hired: ALL_HEROES, level: 32, weapons: { bren: 'twin', rook: 'twindaggers', iona: 'stormstaff', elric: 'grimoire' },
    wear: [['bren', 'platearmor', 3], ['rook', 'chainmail', 3], ['iona', 'chainmail', 3], ['elric', 'leatherarmor', 3]], ...gearUp }, run: async (c) => { await startFight(c, 'gobmines'); await sleep(5000); } },
  { n: 7, name: '07-new-region-orc-highlands', cfg: { upTo: 'kinghall', ...latePartyFx, level: 36, gold: 310500, lumber: 22100 }, run: async (c) => { await c.eval("__wl.actions.region('highlands')"); await sleep(3500); await c.eval("window.scrollTo({top:0,behavior:'instant'})"); await sleep(500); } },
  { n: 8, name: '08-farm-report', cfg: { upTo: 'magmagate', ...midParty, gold: 48210, lumber: 3640, farm: { stage: 'quarry', hours: 24 } }, run: async (c) => { await sleep(1000); await c.eval("__wl.actions.claim()"); await sleep(1200); } },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-shots-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--force-device-scale-factor=1', BASE], { stdio: 'ignore' });
  try {
    let list;
    for (let i = 0; i < 50; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.some(t => t.type === 'page')) break; } catch (e) { /* not yet */ } await sleep(200); }
    const page = list.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0; const pending = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const c = {
      send,
      async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description)); return r.result.value; },
      async shot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, file), Buffer.from(r.data, 'base64')); console.log('saved', file); },
      async load() { await send('Page.navigate', { url: BASE }); await sleep(1500); for (let i = 0; i < 60; i++) { if (await c.eval(`!!(window.__wl && window.spriteState && spriteState.units === 'ready')`)) break; await sleep(500); } },
      async clean() { await c.eval(`(()=>{const st=document.createElement('style');st.textContent='.testtools,.pwa-card,.ver,#toast,#account-btn{display:none!important}';document.head.appendChild(st);window.scrollTo(0,0)})()`); },
      async click(sel) { const ok = await c.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true})()`); if (!ok) throw new Error('no element ' + sel); },
    };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    for (const shot of SHOTS) {
      if (only.length && !only.includes(shot.n)) continue;
      await c.load();
      const cfg = shot.cfg || SHOTS.find(s => s.n === shot.same).cfg;
      await c.eval(`${BUILD}(${JSON.stringify(cfg)})`);
      await c.load();                                   // reload so the game reads the save like a real start
      await c.clean();
      await shot.run(c);
      await c.shot(shot.name + '.png');
    }
    ws.close();
  } finally { proc.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* ignore */ } }
}

async function startFight(c, stage) {
  await c.eval(`(()=>{ window.scrollTo(0,0); __wl.actions.fight(${JSON.stringify(stage)}); })()`);
  for (let i = 0; i < 80; i++) { if (await c.eval('!!(__wl.B && __wl.B.t > __wl.B.intro + 0.3)')) break; await sleep(250); }
  await c.clean();
}
const warning = c => c.eval(`__wl.B ? __wl.B.enemies.some(e => !e.dead && e.state === 'wind' && e.kind === 'charge') : false`);
async function bossFight(c) {
  await startFight(c, 'skyreach');
  await c.eval('setAutoSkill(false)');
  await sleep(9000);
  await c.eval("castSkill('storm')");
  await sleep(600);
}
async function telegraphShot(c) {
  await startFight(c, 'throne');
  await c.eval('setAutoSkill(true)');
  for (let i = 0; i < 400; i++) { if (await warning(c)) break; await sleep(100); }
  await sleep(300);
}
main().catch(e => { console.error(e); process.exit(1); });
