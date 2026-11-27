/* Wildlight Expedition – sound effects.
 * Every sound is synthesised with the Web Audio API (oscillators + filtered noise): no audio files to download, they work offline.
 * window.sfx.play('name') plays one; sfx.toggle() mutes / unmutes (remembered in localStorage 'wl-sound'); the header button #sound-btn shows the state.
 * Browsers only allow audio after a tap or key press, so the audio engine starts on the first one; before that play() does nothing. */
(function () {
  'use strict';
  const KEY = 'wl-sound';
  let ctx = null, master = null, analyser = null, noiseBuf = null, enabled = true;
  const VOLUME = 0.7;
  /* mode: 'all' = music + effects, 'fx' = effects only, 'off' = silent. `enabled` means "effects are on". */
  let mode = 'all';
  try { const v = localStorage.getItem(KEY); mode = (v === '0' || v === 'off') ? 'off' : v === 'fx' ? 'fx' : 'all'; } catch (e) { /* ignore */ }
  enabled = mode !== 'off';
  const syncMusic = () => { try { if (window.music) window.music.sync(); } catch (e) { /* ignore */ } };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();          // keeps a busy fight (many hits at once) from clipping
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.18;
    master = ctx.createGain(); master.gain.value = VOLUME;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256;
    master.connect(comp); comp.connect(analyser); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended' && enabled && !document.hidden) c.resume().then(syncMusic, () => { /* ignore */ });
    else syncMusic();
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, unlock, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {   // silent in the background
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (enabled) ctx.resume().then(syncMusic, () => { /* ignore */ });
  });

  /* ---- voices ----
   * The palette matches the painted storybook look of the game: wooden taps, plucked harp and lute strings, glass and bronze bells,
   * steel and leather for gear and fights, a taiko drum and a brass horn for drama, a breathy flute for the sad and the quiet. */
  const jit = () => 1 + (Math.random() - 0.5) * 0.05;     // a little random pitch so repeated hits do not sound identical
  /* "punch": a soft-clipping saturator the impacts go through, so they hit hard instead of just being loud */
  let driveNode = null;
  function drive() {
    if (driveNode) return driveNode;
    const ws = ctx.createWaveShaper(), n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(3.2 * x) / Math.tanh(3.2); }
    ws.curve = curve; ws.oversample = '2x';
    const out = ctx.createGain(); out.gain.value = 0.85;
    ws.connect(out); out.connect(master);
    driveNode = ws;
    return ws;
  }
  function tone(o) {
    const t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.15, v = o.vol == null ? 0.22 : o.vol, j = o.nojit ? 1 : jit();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f * j, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * j), t0 + dur);
    const a = o.a || 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out = g; osc.connect(g);
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
    out.connect(o.punch ? drive() : master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(o) {
    const t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.1, v = o.vol == null ? 0.2 : o.vol;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t0 + dur);
    const a = o.a || 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.punch ? drive() : master);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }
  /* additive voices: a set of sine partials [ratio, loudness, decay factor], each fading at its own speed (strings, bells, metal) */
  function partials(f, list, o) {
    const t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.6, v = o.vol == null ? 0.2 : o.vol, j = o.nojit ? 1 : jit();
    list.forEach(([r, a, dk]) => {
      const osc = ctx.createOscillator(), g = ctx.createGain(), d = Math.max(0.04, dur * (dk || 1));
      osc.type = 'sine'; osc.frequency.value = f * r * j;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * a), t0 + (o.a || 0.003));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + d + 0.05);
    });
  }
  const PLUCK = [[1, 1, 1], [2, 0.45, 0.6], [3, 0.25, 0.4], [4, 0.14, 0.28], [5, 0.08, 0.2]];                 // harp / lute string
  const BELL = [[1, 1, 1], [2.76, 0.55, 0.7], [5.4, 0.3, 0.45], [8.93, 0.18, 0.3]];                            // bronze bell
  const GLASS = [[1, 1, 1], [2.32, 0.4, 0.6], [4.25, 0.25, 0.4], [6.63, 0.14, 0.3]];                           // crystal chime
  const METAL = [[1, 1, 1], [2.4, 0.7, 0.8], [3.9, 0.5, 0.6], [5.6, 0.35, 0.45], [7.8, 0.2, 0.3]];            // steel / anvil
  const pluck = (f, at, vol, dur) => partials(f, PLUCK, { at, vol, dur: dur || 0.55 });
  const bell = (f, at, vol, dur) => partials(f, BELL, { at, vol, dur: dur || 1.1, a: 0.002 });
  const chime = (f, at, vol, dur) => partials(f, GLASS, { at, vol, dur: dur || 0.8, a: 0.002 });
  const steel = (f, at, vol, dur) => partials(f, METAL, { at, vol, dur: dur || 0.5, a: 0.001 });
  const wood = (f, at, vol) => { tone({ f, to: f * 0.62, at, dur: 0.07, vol: vol || 0.16, type: 'sine', a: 0.002 }); noise({ at, type: 'bandpass', f: f * 2.2, q: 2, dur: 0.035, vol: (vol || 0.16) * 0.7, a: 0.001 }); };
  const taiko = (at, vol) => { tone({ f: 118, to: 48, at, dur: 0.5, vol: vol || 0.35, type: 'sine', a: 0.003, nojit: true }); noise({ at, type: 'lowpass', f: 600, to: 120, dur: 0.22, vol: (vol || 0.35) * 0.7 }); };
  const swish = (at, f0, f1, dur, vol, type) => noise({ at, type: type || 'bandpass', f: f0, to: f1, q: 0.8, dur, vol });
  const horn = (f, at, dur, vol) => { tone({ f, at, dur, vol, type: 'sawtooth', lp: 1500, a: 0.04, nojit: true }); tone({ f: f * 1.003, at, dur, vol: vol * 0.7, type: 'sawtooth', lp: 1200, a: 0.05, nojit: true }); };
  const flute = (f, at, dur, vol) => { tone({ f, at, dur, vol, type: 'sine', a: 0.07, nojit: true }); tone({ f: f * 2, at, dur, vol: vol * 0.16, type: 'sine', a: 0.09, nojit: true }); noise({ at, type: 'bandpass', f: f * 2, q: 5, dur, vol: vol * 0.22, a: 0.07 }); };
  /* fight primitives: a sharp transient, a low body, a gritty crunch, a growl */
  const crack = (at, vol, f) => noise({ at, type: 'highpass', f: f || 3500, dur: 0.035, vol, a: 0.0005, punch: true });
  const thump = (at, f, vol, dur) => tone({ f, to: f * 0.3, at, dur: dur || 0.16, vol, type: 'sine', a: 0.002, punch: true });
  const crunch = (at, vol, f0, f1, dur) => noise({ at, type: 'bandpass', f: f0 || 1400, to: f1 || 350, q: 1.1, dur: dur || 0.12, vol, a: 0.001, punch: true });
  function growl(f, at, dur, vol) {
    const t0 = ctx.currentTime + (at || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, t0); osc.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.7), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    lfo.frequency.value = 24; lg.gain.value = vol * 0.45; lfo.connect(lg); lg.connect(g.gain);                  // the rattle in the throat
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1000, t0); lp.frequency.exponentialRampToValueAtTime(320, t0 + dur);
    osc.connect(g); g.connect(lp); lp.connect(drive());
    osc.start(t0); lfo.start(t0); osc.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    noise({ at, type: 'bandpass', f: f * 3.2, q: 3, dur, vol: vol * 0.45, punch: true });
  }
  /* C major pentatonic, the same scale as the village music */
  const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, D6 = 1174.7, E6 = 1318.5, G6 = 1568, C7 = 2093;
  const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392, A4 = 440;

  const SOUNDS = {
    /* interface: wood and strings */
    tap: () => wood(520, 0, 0.24),
    tick: () => wood(950, 0, 0.13),
    tab: () => { pluck(G5, 0, 0.16, 0.4); pluck(C6, 0.06, 0.13, 0.4); },
    toggle: () => { wood(620, 0, 0.15); wood(820, 0.07, 0.15); },
    nope: () => { wood(230, 0, 0.22); tone({ f: 170, to: 120, at: 0.02, dur: 0.14, vol: 0.12, type: 'sine' }); },
    coins: () => { steel(2500, 0, 0.07, 0.16); steel(3200, 0.07, 0.06, 0.22); chime(C7, 0.1, 0.07, 0.55); noise({ at: 0.04, type: 'highpass', f: 7000, dur: 0.14, vol: 0.04 }); },
    levelup: () => { [C5, E5, G5, C6, E6].forEach((f, i) => pluck(f, i * 0.07, 0.15, 0.6)); bell(C6, 0.3, 0.12, 1.3); noise({ at: 0.28, type: 'highpass', f: 7500, dur: 0.5, vol: 0.04 }); },
    upgrade: () => { noise({ type: 'highpass', f: 3000, dur: 0.05, vol: 0.16 }); steel(1400, 0, 0.14, 0.55); pluck(G5, 0.14, 0.13, 0.5); pluck(C6, 0.21, 0.14, 0.6); },
    hire: () => { pluck(C5, 0, 0.15, 0.6); pluck(E5, 0.03, 0.14, 0.6); pluck(G5, 0.06, 0.14, 0.6); chime(C6, 0.14, 0.1, 0.8); SOUNDS.coins(); },
    equip: () => { noise({ type: 'bandpass', f: 900, to: 420, dur: 0.1, vol: 0.16 }); swish(0.05, 4200, 7500, 0.1, 0.13, 'highpass'); steel(2100, 0.06, 0.09, 0.32); },
    merge: () => {
      [0, 0.24].forEach((at, i) => { taiko(at, 0.16); noise({ at, type: 'highpass', f: 2600, dur: 0.06, vol: 0.14 }); steel(i ? 600 : 520, at, 0.11, 1.1); steel(i ? 930 : 780, at + 0.01, 0.06, 0.9); });
      bell(C6, 0.5, 0.11, 1.3); chime(E6, 0.58, 0.09, 0.9); chime(G6, 0.66, 0.09, 1.1);
    },
    farm: () => { [0, 0.12, 0.24].forEach(at => noise({ at, type: 'lowpass', f: 480, dur: 0.08, vol: 0.24 })); noise({ at: 0.02, type: 'bandpass', f: 3000, q: 1.5, dur: 0.3, vol: 0.035 }); flute(E5, 0.36, 0.3, 0.11); flute(G5, 0.46, 0.4, 0.11); },
    retreat: () => { swish(0, 1700, 260, 0.35, 0.18); taiko(0.02, 0.18); },
    /* fights: steel, leather, drums, magic */
    horn: () => { taiko(0, 0.32); horn(196, 0.02, 0.5, 0.11); horn(294, 0.02, 0.5, 0.09); horn(392, 0.3, 0.5, 0.11); horn(587, 0.3, 0.5, 0.06); },
    slash: () => { swish(0, 1500, 5200, 0.06, 0.26); swish(0.05, 5200, 700, 0.13, 0.3); steel(4300, 0.045, 0.06, 0.2); crack(0.025, 0.1, 5000); },
    arrow: () => { pluck(135, 0, 0.34, 0.32); swish(0.005, 2400, 6800, 0.1, 0.18, 'highpass'); tone({ f: 1700, to: 2700, at: 0.01, dur: 0.12, vol: 0.05, type: 'sine' }); crack(0, 0.08, 4500); },
    bolt: () => { swish(0, 3000, 9000, 0.16, 0.14, 'highpass'); [0.02, 0.06, 0.09, 0.13].forEach(at => crack(at, 0.09, 3000 + Math.random() * 3000)); tone({ f: 300, to: 1500, dur: 0.18, vol: 0.09, type: 'sawtooth', lp: 3200, punch: true }); chime(C6, 0.02, 0.09, 0.5); chime(G6, 0.08, 0.08, 0.6); },
    hit: () => { crack(0, 0.32); thump(0, 170, 0.5, 0.17); crunch(0, 0.32, 1700, 320, 0.13); tone({ f: 62, to: 40, dur: 0.2, vol: 0.2, type: 'sine', punch: true }); steel(2900, 0.005, 0.05, 0.16); },
    hitarrow: () => { crack(0, 0.26, 5000); thump(0, 240, 0.4, 0.1); wood(360, 0, 0.3); crunch(0, 0.18, 2000, 500, 0.08); },
    hitmagic: () => { swish(0, 2500, 8500, 0.12, 0.16, 'highpass'); tone({ f: 900, to: 170, dur: 0.14, vol: 0.2, type: 'sine', punch: true }); thump(0, 115, 0.4, 0.15); crack(0.005, 0.18, 4000); chime(G6, 0.02, 0.06, 0.3); },
    growl: (size) => { growl(165 / (size || 1), 0, 0.3, 0.16); },
    /* the critical hit: a hard whack, then a bright steel "shing" with a ringing ting that echoes away, in the spirit of classic MMORPG crits */
    crit: () => {
      crack(0, 0.4, 3200); thump(0, 135, 0.5, 0.2); thump(0, 60, 0.4, 0.32); crunch(0, 0.32, 2200, 300, 0.14);
      swish(0, 2500, 9500, 0.09, 0.22, 'highpass');
      tone({ f: 1400, to: 3600, dur: 0.08, vol: 0.1, type: 'sawtooth', lp: 5000, punch: true });
      steel(2700, 0.015, 0.16, 0.5); steel(4100, 0.02, 0.09, 0.42); bell(C7, 0.03, 0.07, 0.8);
      [[0.1, 0.1, 2500], [0.2, 0.06, 2350], [0.3, 0.035, 2200]].forEach(([at, v, f]) => steel(f, at, v, 0.3));          // the echoes of the ting
    },
    pop: (size) => { const z = size || 1; thump(0, 150 / z, 0.5, 0.22); tone({ f: 280 / z, to: 70 / z, dur: 0.32, vol: 0.18, type: 'sawtooth', lp: 700, punch: true }); noise({ type: 'lowpass', f: 2000, to: 260, dur: 0.2, vol: 0.18 }); crack(0, 0.18); },
    hurt: () => { crack(0, 0.26); crunch(0, 0.36, 1100, 280, 0.13); thump(0, 150, 0.45, 0.16); tone({ f: 230, to: 95, dur: 0.14, vol: 0.2, type: 'sine' }); },
    hurtcrit: () => { crack(0, 0.4, 3000); crunch(0, 0.45, 1300, 220, 0.2); thump(0, 140, 0.6, 0.22); thump(0, 52, 0.6, 0.45); steel(420, 0, 0.1, 0.55); },
    block: () => { thump(0, 130, 0.45, 0.17); crack(0, 0.2, 4500); steel(1500, 0, 0.08, 0.45); chime(1760, 0.01, 0.13, 0.7); chime(1175, 0.03, 0.1, 0.8); },
    barrier: () => { thump(0, 95, 0.28, 0.3); [C5, G5, C6, E6].forEach((f, i) => tone({ f, at: i * 0.045, dur: 0.5, vol: 0.075, type: 'sine', a: 0.12, nojit: true })); swish(0, 300, 2300, 0.3, 0.14); },
    heal: () => { pluck(E5, 0, 0.12, 0.5); pluck(G5, 0.07, 0.12, 0.5); pluck(C6, 0.14, 0.12, 0.6); chime(E6, 0.2, 0.07, 0.7); },
    warn: () => { growl(58, 0, 0.85, 0.34); growl(92, 0.05, 0.75, 0.22); taiko(0, 0.36); taiko(0.3, 0.42); tone({ f: 87, dur: 0.8, vol: 0.12, type: 'sawtooth', lp: 320, a: 0.2, nojit: true }); },
    /* results */
    victory: () => {
      horn(C5, 0, 0.14, 0.12); horn(E5, 0.13, 0.14, 0.12); horn(G5, 0.26, 0.14, 0.12); horn(C6, 0.4, 0.7, 0.13); taiko(0.4, 0.28);
      [C6, E6, G6, C7].forEach((f, i) => pluck(f, 0.5 + i * 0.07, 0.12, 0.7)); bell(C7, 0.55, 0.1, 1.5);
    },
    defeat: () => { taiko(0, 0.2); [G4, E4, D4, C4].forEach((f, i) => flute(f, 0.08 + i * 0.36, 0.5, 0.15)); },
    star: () => { chime(G6, 0, 0.12, 0.6); bell(C7, 0.03, 0.07, 0.85); },
    drop: () => { [C6, E6, G6, C7].forEach((f, i) => chime(f, i * 0.06, 0.11, 0.6)); bell(C7, 0.22, 0.1, 1.3); noise({ at: 0.1, type: 'highpass', f: 7000, dur: 0.4, vol: 0.04 }); },
    fanfare: () => {
      [[C5, 0, 0.18], [C5, 0.2, 0.12], [C5, 0.34, 0.12], [G5, 0.48, 0.4], [E5, 0.94, 0.14], [G5, 1.08, 0.14], [C6, 1.22, 0.8]].forEach(([f, at, d]) => horn(f, at, d, 0.11));
      [C6, E6, G6].forEach(f => horn(f, 1.22, 0.8, 0.06));
      taiko(0, 0.3); taiko(0.48, 0.3); taiko(1.22, 0.36);
      [C6, E6, G6, C7].forEach((f, i) => pluck(f, 1.3 + i * 0.07, 0.12, 0.8)); bell(C7, 1.36, 0.11, 1.8);
    },
  };

  /* sounds that tend to come in bursts: at most one per this many milliseconds */
  const GAP = { growl: 260, hitarrow: 45, hitmagic: 45, hit: 45, crit: 80, slash: 70, arrow: 70, bolt: 70, pop: 60, hurt: 70, hurtcrit: 90, block: 90, heal: 200, tap: 40, tick: 30, star: 120, coins: 80, warn: 400 };
  const last = {};

  function play(name, arg) {
    if (!enabled || !ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
    const now = performance.now(), gap = GAP[name] || 25;
    if (last[name] && now - last[name] < gap) return;
    last[name] = now;
    try { SOUNDS[name](arg); } catch (e) { /* a sound must never break the game */ }
  }

  /* ---- mute button ---- */
  const MODE_TEXT = { all: 'Music and sound effects', fx: 'Sound effects only', off: 'Sound off' };
  const NEXT = { all: 'fx', fx: 'off', off: 'all' };
  function paint() {
    const b = document.getElementById('sound-btn');
    if (!b) return;
    b.classList.toggle('muted', mode === 'off');
    b.classList.toggle('fx', mode === 'fx');
    b.dataset.mode = mode;
    b.setAttribute('aria-label', `${MODE_TEXT[mode]}: tap to change`);
    b.title = MODE_TEXT[mode];
  }
  function setMode(m) {
    mode = MODE_TEXT[m] ? m : 'all';
    enabled = mode !== 'off';
    try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ }
    if (enabled) { const c = ensure(); if (c && c.state === 'suspended' && !document.hidden) c.resume().then(syncMusic, () => { /* ignore */ }); }
    paint();
    syncMusic();                                    // starts or fades out the music
    if (enabled) play('toggle');
  }
  document.addEventListener('DOMContentLoaded', paint);
  paint();

  /* level() is for tests: the loudness (0..1) of what is playing right now */
  function level() {
    if (!analyser) return 0;
    const d = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(d);
    let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i] - 128) / 128);
    return m;
  }
  window.sfx = {
    play, setMode, toggle: () => { setMode(NEXT[mode]); return mode; }, mode: () => mode, modeText: () => MODE_TEXT[mode],
    isEnabled: () => enabled, musicOn: () => mode === 'all',
    audio: () => (ensure() ? { ctx, out: master, noiseBuf } : null),         // the shared audio graph, used by music.js
    names: () => Object.keys(SOUNDS), level, state: () => (ctx ? ctx.state : 'none'),
  };
})();
