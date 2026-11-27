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

  /* ---- voices ---- */
  const jit = () => 1 + (Math.random() - 0.5) * 0.06;     // a little random pitch so repeated hits do not sound identical
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
    out.connect(master);
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
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }
  /* a run of notes: [freq, start, duration] */
  const notes = (list, type, vol, lp) => list.forEach(([f, at, dur]) => tone({ f, at, dur, type: type || 'triangle', vol: vol == null ? 0.2 : vol, lp, nojit: true }));
  const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880, B5 = 987.77, C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;

  const SOUNDS = {
    /* interface */
    tap: () => tone({ f: 900, to: 640, dur: 0.05, vol: 0.12, type: 'triangle' }),
    tick: () => tone({ f: 1200, to: 1000, dur: 0.03, vol: 0.07, type: 'square', lp: 3000 }),
    tab: () => { tone({ f: C5, dur: 0.07, vol: 0.14, type: 'triangle' }); tone({ f: E5, at: 0.05, dur: 0.09, vol: 0.14, type: 'triangle' }); },
    toggle: () => { tone({ f: 600, dur: 0.05, vol: 0.14, type: 'square', lp: 2500 }); tone({ f: 900, at: 0.05, dur: 0.07, vol: 0.14, type: 'square', lp: 2500 }); },
    nope: () => { tone({ f: 200, to: 140, dur: 0.12, vol: 0.18, type: 'square', lp: 900 }); },
    coins: () => { tone({ f: G6, dur: 0.1, vol: 0.16, type: 'triangle', nojit: true }); tone({ f: C7, at: 0.07, dur: 0.2, vol: 0.14, type: 'triangle', nojit: true }); noise({ type: 'highpass', f: 6000, dur: 0.12, vol: 0.05, at: 0.05 }); },
    levelup: () => { notes([[C5, 0, 0.12], [E5, 0.09, 0.12], [G5, 0.18, 0.12], [C6, 0.27, 0.35]], 'triangle', 0.2); tone({ f: E6, at: 0.3, dur: 0.4, vol: 0.08, type: 'sine', nojit: true }); },
    upgrade: () => { noise({ type: 'highpass', f: 3000, dur: 0.05, vol: 0.16 }); tone({ f: 1500, to: 1480, dur: 0.18, vol: 0.14, type: 'square', lp: 4000, nojit: true }); notes([[G5, 0.12, 0.1], [C6, 0.2, 0.25]], 'triangle', 0.17); },
    hire: () => { notes([[G5 / 2, 0, 0.12], [C5, 0.1, 0.12], [E5, 0.2, 0.3]], 'triangle', 0.2); SOUNDS.coins(); },
    equip: () => { noise({ type: 'highpass', f: 4500, to: 7000, dur: 0.12, vol: 0.14 }); tone({ f: 1800, to: 2400, dur: 0.1, vol: 0.1, type: 'triangle' }); tone({ f: 600, to: 400, dur: 0.08, vol: 0.12, type: 'square', lp: 1200 }); },
    merge: () => {
      [0, 0.2].forEach((at, i) => { noise({ type: 'highpass', f: 2500, dur: 0.06, vol: 0.2, at }); [880, 1320, 1900, 2750].forEach((f, k) => tone({ f: f * (i ? 1.12 : 1), at, dur: 0.35 - k * 0.04, vol: 0.1, type: 'sine', nojit: true })); });
      notes([[C6, 0.45, 0.12], [E6, 0.54, 0.12], [G6, 0.63, 0.4]], 'triangle', 0.16);
    },
    farm: () => { [0, 0.11, 0.22].forEach(at => noise({ type: 'lowpass', f: 500, dur: 0.07, vol: 0.2, at })); notes([[E5, 0.34, 0.1], [G5, 0.42, 0.2]], 'triangle', 0.14); },
    retreat: () => { noise({ type: 'bandpass', f: 1800, to: 300, q: 1.2, dur: 0.35, vol: 0.2 }); tone({ f: 330, to: 140, dur: 0.3, vol: 0.14, type: 'triangle' }); },
    /* fights */
    horn: () => { tone({ f: 196, dur: 0.32, vol: 0.14, type: 'sawtooth', lp: 800, nojit: true }); tone({ f: 294, dur: 0.32, vol: 0.12, type: 'sawtooth', lp: 900, nojit: true }); tone({ f: 392, at: 0.26, dur: 0.45, vol: 0.14, type: 'sawtooth', lp: 1100, nojit: true }); tone({ f: 587, at: 0.26, dur: 0.45, vol: 0.09, type: 'sawtooth', lp: 1300, nojit: true }); },
    slash: () => { noise({ type: 'bandpass', f: 3200, to: 700, q: 0.9, dur: 0.14, vol: 0.2 }); tone({ f: 320, to: 120, dur: 0.1, vol: 0.08, type: 'sawtooth', lp: 1200 }); },
    arrow: () => { noise({ type: 'highpass', f: 2500, to: 5500, dur: 0.1, vol: 0.14 }); tone({ f: 500, to: 900, dur: 0.08, vol: 0.08, type: 'triangle' }); },
    bolt: () => { tone({ f: 380, to: 1100, dur: 0.18, vol: 0.12, type: 'sawtooth', lp: 2400 }); tone({ f: 1500, to: 2400, dur: 0.14, vol: 0.06, type: 'sine' }); },
    hit: () => { noise({ type: 'lowpass', f: 1400, to: 300, dur: 0.11, vol: 0.28 }); tone({ f: 170, to: 55, dur: 0.12, vol: 0.28, type: 'sine' }); },
    crit: () => { noise({ type: 'lowpass', f: 2200, to: 300, dur: 0.14, vol: 0.32 }); tone({ f: 200, to: 50, dur: 0.16, vol: 0.3, type: 'sine' }); tone({ f: 1760, to: 1500, dur: 0.18, vol: 0.14, type: 'square', lp: 5000 }); tone({ f: 2637, at: 0.03, dur: 0.22, vol: 0.09, type: 'triangle' }); },
    pop: () => { tone({ f: 520, to: 110, dur: 0.14, vol: 0.2, type: 'sine' }); noise({ type: 'bandpass', f: 1500, to: 400, dur: 0.1, vol: 0.1 }); },
    hurt: () => { tone({ f: 210, to: 80, dur: 0.16, vol: 0.2, type: 'sawtooth', lp: 900 }); noise({ type: 'lowpass', f: 900, dur: 0.1, vol: 0.18 }); },
    hurtcrit: () => { SOUNDS.hurt(); tone({ f: 120, to: 40, dur: 0.25, vol: 0.28, type: 'sine' }); noise({ type: 'highpass', f: 3000, dur: 0.08, vol: 0.12 }); },
    block: () => { noise({ type: 'highpass', f: 3500, dur: 0.05, vol: 0.2 }); [740, 1110, 1660, 2300].forEach((f, k) => tone({ f, dur: 0.32 - k * 0.05, vol: 0.12, type: 'sine', nojit: true })); },
    barrier: () => { noise({ type: 'bandpass', f: 400, to: 2200, q: 1.1, dur: 0.28, vol: 0.18 }); tone({ f: 330, to: 700, dur: 0.28, vol: 0.14, type: 'triangle' }); tone({ f: 990, at: 0.18, dur: 0.2, vol: 0.07, type: 'sine' }); },
    heal: () => notes([[E5, 0, 0.14], [G5, 0.07, 0.14], [B5, 0.14, 0.3]], 'sine', 0.16),
    warn: () => { [0, 0.22].forEach(at => tone({ f: 880, to: 700, at, dur: 0.18, vol: 0.14, type: 'square', lp: 1800, nojit: true })); tone({ f: 70, dur: 0.6, vol: 0.2, type: 'sine', a: 0.1, nojit: true }); },
    /* results */
    victory: () => { notes([[C5, 0, 0.14], [E5, 0.11, 0.14], [G5, 0.22, 0.14], [C6, 0.33, 0.3]], 'triangle', 0.2); notes([[C5, 0.33, 0.7], [E5, 0.33, 0.7], [G5, 0.33, 0.7]], 'sawtooth', 0.07, 1400); tone({ f: E6, at: 0.5, dur: 0.5, vol: 0.09, type: 'sine', nojit: true }); },
    defeat: () => notes([[392, 0, 0.32], [349, 0.3, 0.32], [311, 0.6, 0.32], [262, 0.9, 0.6]], 'sawtooth', 0.12, 900),
    star: () => { tone({ f: C6, dur: 0.14, vol: 0.13, type: 'triangle', nojit: true }); tone({ f: C7, at: 0.03, dur: 0.22, vol: 0.09, type: 'sine', nojit: true }); },
    drop: () => { notes([[C6, 0, 0.1], [E6, 0.07, 0.1], [G6, 0.14, 0.1], [C7, 0.21, 0.3]], 'triangle', 0.14); noise({ type: 'highpass', f: 7000, dur: 0.4, vol: 0.05, at: 0.1 }); },
    fanfare: () => {
      notes([[C5, 0, 0.18], [C5, 0.2, 0.12], [C5, 0.34, 0.12], [G5, 0.48, 0.4], [E5, 0.94, 0.14], [G5, 1.08, 0.14], [C6, 1.22, 0.7]], 'sawtooth', 0.11, 1800);
      notes([[C6, 1.22, 0.8], [E6, 1.22, 0.8], [G6, 1.22, 0.8]], 'triangle', 0.08);
      noise({ type: 'highpass', f: 6000, dur: 0.6, vol: 0.05, at: 1.22 });
    },
  };
  /* sounds that tend to come in bursts: at most one per this many milliseconds */
  const GAP = { hit: 45, crit: 80, slash: 70, arrow: 70, bolt: 70, pop: 60, hurt: 70, hurtcrit: 90, block: 90, heal: 200, tap: 40, tick: 30, star: 120, coins: 80, warn: 400 };
  const last = {};

  function play(name) {
    if (!enabled || !ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
    const now = performance.now(), gap = GAP[name] || 25;
    if (last[name] && now - last[name] < gap) return;
    last[name] = now;
    try { SOUNDS[name](); } catch (e) { /* a sound must never break the game */ }
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
