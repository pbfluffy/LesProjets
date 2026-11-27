// Builds the game's recorded sound pack from the free (CC0) source packs: trims every clip to its useful part, peak-normalises it and writes
//   assets/sfx/pack.bin    all clips, mono 16-bit little-endian PCM at 22050 Hz, one after another (the game turns them straight into AudioBuffers)
//   assets/sfx/index.json  { rate, groups: { name: [[offsetInSamples, lengthInSamples], ...] } }
//   assets/sfx/CREDITS.md  where every sound came from and its licence
// usage: node tools/build-sfx.js <folder with the unpacked source packs> [out folder]      (needs ffmpeg on the PATH; see CREDITS.md for the packs)
const fs = require('fs'), path = require('path');
const { decode, SR } = require('./sfx-analyze.js');
const SRC = process.argv[2] || 'C:/Temp/audio-src/dl', OUT = process.argv[3] || path.join(__dirname, '..', 'assets', 'sfx');

/* ---- the source files, by pack ---- */
const n = (prefix, list, suffix) => list.map(i => prefix + i + (suffix || ''));
const SW = 'swishes/x/swishes/swish-', SWORD = 'sword/x/sword - StarNinjas/sword.', CLASH = 'clash/x/sword_clash.', IMP = 'impact/x/impact.', WP = 'weapons/x/sfx/', TINY = 'tiny/x/sfx-cc0/';
const RP = 'rpgpack/x/RPG Sound Pack/', R80 = 'rpg80/x/', MON = 'monsters/x/Monster-Sounds-Volume-2/', BRK = 'breaking/x/bfh1_';
/* group: [max length in ms after the onset, how many variants to keep, files] */
const GROUPS = {
  /* weapon movement */
  swing_light: [150, 5, n(SW, [12, 13, 11, 2, 10], '.wav')],
  swing_mid: [190, 5, n(SW, [1, 5, 6, 3, 4, 8], '.wav')],
  swing_heavy: [280, 4, [...n(SW, [7, 9], '.wav'), TINY + 'tube-plastic-whoosh-01.wav', TINY + 'tube-plastic-whoosh-02.wav']],
  whoosh: [320, 4, [TINY + 'tin-whistle-whoosh-01.wav', TINY + 'tin-whistle-whoosh-02.wav', TINY + 'tube-plastic-whoosh-01.wav', TINY + 'tube-plastic-whoosh-02.wav']],
  hiss: [380, 2, [TINY + 'compressed-air-spray-01.wav', TINY + 'compressed-air-spray-02.wav']],
  /* contact: steel and bodies */
  blade_hit: [240, 5, n(SWORD, [3, 4, 6, 7, 1, 2], '.ogg')],
  clash: [330, 5, n(CLASH, [2, 4, 5, 7, 8, 3], '.ogg')],
  clash_knife: [210, 5, n(WP + 'sword-knife-clash-', ['01', '02', '03', '04', '05', '06', '07', '08'], '.wav')],
  body_thud: [190, 5, n(IMP, [2, 10, 6, 7, 8, 1], '.ogg')],
  glass_hit: [220, 2, [BRK + 'glass_hit_01.ogg', BRK + 'glass_hit_02.ogg']],
  /* target materials */
  mat_slime: [150, 5, n(RP + 'NPC/slime/slime', [1, 2, 3, 4, 5, 6], '.wav')],
  mat_armored: [190, 5, [...n(R80 + 'metal_0', [1, 2, 3], '.ogg'), ...n(RP + 'inventory/metal-small', [1, 2, 3], '.wav')]],
  mat_stone: [230, 5, [...n(R80 + 'stones_0', [1, 2, 3, 4], '.ogg'), ...n(R80 + 'item_stone_0', [1, 2], '.ogg')]],
  mat_wood: [170, 5, [TINY + 'wood-twigs-break-01.wav', TINY + 'wood-twigs-break-02.wav', ...n(R80 + 'item_wood_0', [1, 2, 3], '.ogg')]],
  /* monsters */
  beast_voice: [430, 5, n(RP + 'NPC/gutteral beast/mnstr', [1, 2, 3, 4, 5, 6, 7, 8], '.wav')],
  giant_voice: [650, 5, [...n(RP + 'NPC/giant/giant', [1, 2, 3], '.wav'), ...n(RP + 'NPC/ogre/ogre', [1, 2], '.wav')]],
  roar: [820, 3, n(R80 + 'creature_roar_0', [1, 2, 3], '.ogg')],
  spirit_voice: [460, 5, n(RP + 'NPC/shade/shade', [1, 2, 3, 4, 5, 6, 7, 8], '.wav')],
  slime_voice: [330, 5, [...n(RP + 'NPC/slime/slime', [7, 8, 9, 10], '.wav'), ...n(R80 + 'creature_slime_0', [1, 2], '.ogg')]],
  bite: [230, 3, n(RP + 'NPC/beetle/bite-small', ['', 2, 3], '.wav')],
  creature_die: [620, 4, [R80 + 'creature_die_01.ogg', R80 + 'creature_hurt_01.ogg', R80 + 'creature_hurt_02.ogg', RP + 'NPC/misc/wolfman.wav']],
  creature_misc: [360, 5, n(R80 + 'creature_misc_0', [1, 2, 3, 4, 5, 6, 7, 8], '.ogg')],
  monster_voice: [520, 5, n(MON + 'Monster-', [1, 2, 3, 4, 5, 6], '.wav')],
  crumble: [650, 4, [...n(BRK + 'breaking_0', [1, 2, 3], '.ogg'), BRK + 'falling_02.ogg']],
  /* magic */
  magic_nature: [620, 4, [RP + 'battle/spell.wav', RP + 'battle/magic1.wav', R80 + 'spell_01.ogg', R80 + 'spell_02.ogg']],
  magic_fire: [620, 5, n(R80 + 'spell_fire_0', [1, 2, 3, 4, 5, 6, 7], '.ogg')],
  magic_frost: [820, 1, ['magic1/freeze.wav']],
  magic_storm: [520, 2, [TINY + 'paralyzer-discharge-01.wav', TINY + 'paralyzer-discharge-02.wav']],
  magic_heal: [720, 5, n('cure/x/Cure', [1, 2, 3, 4, 5, 6, 7, 8], '.wav')],
  magic_tele: [720, 1, ['magic1/teleport.wav']],
  magic_btn: [620, 1, ['magic1/fantasy_magic_button_1.mp3']],
  /* interface and items */
  coins: [420, 5, [RP + 'inventory/coin.wav', RP + 'inventory/coin2.wav', RP + 'inventory/coin3.wav', ...n(R80 + 'item_coins_0', [1, 2], '.ogg')]],
  gems: [520, 4, n(R80 + 'item_gem_0', [1, 2, 3, 4], '.ogg')],
  ui_click: [210, 5, n(RP + 'interface/interface', [1, 2, 3, 4, 5, 6], '.wav')],
  lock: [260, 3, n(R80 + 'lock_0', [1, 2, 3], '.ogg')],
  unsheathe: [460, 4, [RP + 'battle/sword-unsheathe.wav', ...n(RP + 'battle/sword-unsheathe', [2, 3, 4], '.wav'), TINY + 'knife-unsheathe-02.wav']],
  cloth: [360, 5, [RP + 'inventory/cloth.wav', RP + 'inventory/cloth-heavy.wav', RP + 'inventory/armor-light.wav', RP + 'inventory/chainmail1.wav', RP + 'inventory/chainmail2.wav']],
  anvil: [520, 4, [TINY + 'metal-hammer-hit-01.wav', TINY + 'metal-hammer-hit-02.wav', RP + 'inventory/metal-ringing.wav', R80 + 'metal_01.ogg']],
  steps: [260, 5, [...n(TINY + 'mud-steps-0', [1, 2, 3], '.wav'), TINY + 'soil-steps-01.wav', TINY + 'boots-leather-step-01.wav']],
  book: [320, 4, n(R80 + 'book_0', [1, 2, 3, 4], '.ogg')],
  bubble: [260, 3, n(RP + 'inventory/bubble', ['', 2, 3], '.wav')],
  chain: [360, 3, n(R80 + 'chain_0', [1, 2, 3], '.ogg')],
};

function prepare(file, maxMs) {
  const x = decode(path.join(SRC, file));
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
  if (!(peak > 0)) throw new Error('silent ' + file);
  const thr = peak * 0.08; let on = 0; while (on < x.length && Math.abs(x[on]) < thr) on++;
  const start = Math.max(0, on - Math.round(SR * 0.002)), end = Math.min(x.length, on + Math.round(SR * maxMs / 1000));
  const len = end - start, out = new Int16Array(len);
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(x[start + i]));
  const g = 0.8 / pk, fin = Math.round(SR * 0.003), fout = Math.min(Math.round(SR * 0.03), len >> 1);
  for (let i = 0; i < len; i++) {
    let v = x[start + i] * g;
    if (i < fin) v *= i / fin;
    if (i > len - fout) v *= (len - i) / fout;
    out[i] = Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
  }
  return out;
}

fs.mkdirSync(OUT, { recursive: true });
const chunks = [], groups = {}, used = {}; let off = 0, count = 0;
for (const [name, [maxMs, take, files]] of Object.entries(GROUPS)) {
  groups[name] = [];
  const step = files.length > take ? files.length / take : 1;
  for (let k = 0; k < Math.min(take, files.length); k++) {
    const f = files[Math.floor(k * step)];
    if (!fs.existsSync(path.join(SRC, f))) throw new Error('missing source file: ' + f);
    const pcm = prepare(f, maxMs);
    chunks.push(Buffer.from(pcm.buffer)); groups[name].push([off, pcm.length]); off += pcm.length; count++;
    used[f.split('/')[0]] = (used[f.split('/')[0]] || 0) + 1;
  }
}
fs.writeFileSync(path.join(OUT, 'pack.bin'), Buffer.concat(chunks));
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ rate: SR, groups }) + '\n');
console.log(`${count} clips in ${Object.keys(groups).length} groups, ${(off * 2 / 1e6).toFixed(2)} MB, ${(off / SR).toFixed(1)} s`);
console.log('sources used:', JSON.stringify(used));
