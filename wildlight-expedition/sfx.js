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
    hurt: () => { crack(0, 0.26); crunch(0, 0.36, 1100, 280, 0.13); thump(0, 150, 0.45, 0.16); tone({ f: 230, to: 95, dur: 0.14, vol: 0.2, type: 'sine' }); },
    hurtcrit: () => { crack(0, 0.4, 3000); crunch(0, 0.45, 1300, 220, 0.2); thump(0, 140, 0.6, 0.22); thump(0, 52, 0.6, 0.45); steel(420, 0, 0.1, 0.55); },
    block: () => { thump(0, 130, 0.45, 0.17); crack(0, 0.2, 4500); steel(1500, 0, 0.08, 0.45); chime(1760, 0.01, 0.13, 0.7); chime(1175, 0.03, 0.1, 0.8); },
    barrier: () => { thump(0, 95, 0.28, 0.3); [C5, G5, C6, E6].forEach((f, i) => tone({ f, at: i * 0.045, dur: 0.5, vol: 0.075, type: 'sine', a: 0.12, nojit: true })); swish(0, 300, 2300, 0.3, 0.14); },
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

  /* ======================= sound families: every weapon, monster and spell sounds different ======================= */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const crackle = (at, n, f0, f1, vol) => { for (let i = 0; i < n; i++) crack(at + i * 0.03 + Math.random() * 0.015, vol, rnd(f0, f1)); };

  /* ---- blades: how each sword moves through the air (played as the swing starts; the hits come 0.12 s apart for multi-hit weapons) ---- */
  const SWING = {
    sword: () => { swish(0, 1500, 5200, 0.06, 0.24); swish(0.05, 5200, 700, 0.13, 0.28); steel(4300, 0.045, 0.05, 0.2); crack(0.025, 0.08, 5000); },
    twin: () => { [0, 0.12].forEach(at => { swish(at, 2600, 6500, 0.05, 0.17); swish(at + 0.04, 6500, 1300, 0.09, 0.2); steel(4800, at + 0.04, 0.04, 0.15); }); },
    great: () => { swish(0, 500, 2200, 0.12, 0.28); swish(0.1, 2200, 260, 0.26, 0.36); tone({ f: 95, to: 55, dur: 0.32, vol: 0.14, type: 'sine' }); noise({ at: 0.05, type: 'lowpass', f: 700, to: 200, dur: 0.3, vol: 0.14 }); },
    falchion: () => { swish(0, 900, 3600, 0.05, 0.26); swish(0.05, 3600, 450, 0.16, 0.36); tone({ f: 120, to: 70, at: 0.06, dur: 0.2, vol: 0.12, type: 'sine' }); steel(3000, 0.05, 0.04, 0.16); },
    saber: () => { [0, 0.12, 0.24].forEach((at, i) => { swish(at, 3000 + i * 300, 8200, 0.045, 0.17); swish(at + 0.035, 8200, 1800, 0.08, 0.2); steel(5200 + i * 200, at + 0.04, 0.035, 0.14); }); },
    rapier: () => { swish(0, 5200, 9800, 0.075, 0.15, 'highpass'); tone({ f: 3200, to: 5200, dur: 0.09, vol: 0.05, type: 'sine' }); steel(4000, 0.055, 0.045, 0.28); },
    buckler: () => { swish(0, 1300, 4600, 0.06, 0.2); swish(0.05, 4600, 700, 0.12, 0.22); noise({ at: 0.03, type: 'lowpass', f: 420, dur: 0.08, vol: 0.14 }); wood(260, 0.08, 0.12); },
  };
  /* ---- what a weapon does when it lands. arg: { w: weapon id, a: the monster is armored } ---- */
  const slice = (m, bright) => { crack(0, 0.3); thump(0, 165 / m, 0.5 * m, 0.17); crunch(0, 0.3, 1700, 320, 0.13); tone({ f: 62, to: 40, dur: 0.2, vol: 0.2 * m, type: 'sine', punch: true }); steel(bright || 2900, 0.005, 0.05, 0.16); };
  const arrowHit = (armored, m) => {
    if (armored) { crack(0, 0.3, 6000); steel(3600, 0, 0.12, 0.35); thump(0, 260, 0.25 * m, 0.08); }      // the arrow pings off the shell
    else { crack(0, 0.26, 5000); thump(0, 240 / m, 0.4 * m, 0.1); wood(360, 0, 0.3); crunch(0, 0.18, 2000, 500, 0.08); }   // it sinks in with a thwack
  };
  const IMPACT = {
    sword: () => slice(1), falchion: () => slice(1.25, 2400), saber: () => slice(0.8, 3600), twin: () => slice(0.75, 3300),
    great: () => { crack(0, 0.4); thump(0, 105, 0.7, 0.26); thump(0, 52, 0.55, 0.4); crunch(0, 0.45, 1500, 220, 0.2); steel(1800, 0.005, 0.06, 0.3); },
    rapier: () => { crack(0, 0.3, 5500); noise({ type: 'bandpass', f: 2600, to: 1400, dur: 0.05, vol: 0.3, punch: true }); thump(0, 210, 0.3, 0.1); steel(3300, 0.005, 0.06, 0.22); },
    buckler: () => { thump(0, 150, 0.5, 0.18); wood(300, 0, 0.3); steel(950, 0.005, 0.1, 0.5); crack(0, 0.2, 2500); },
    bow: a => arrowHit(a, 1), shortbow: a => arrowHit(a, 0.8), longbow: a => arrowHit(a, 1.25),
    crossbow: a => { crack(0, 0.35, 3500); thump(0, 130, 0.55, 0.16); if (a) steel(3400, 0.005, 0.1, 0.35); else wood(300, 0, 0.25); },
    staff: () => { swish(0, 2500, 8500, 0.12, 0.16, 'highpass'); tone({ f: 900, to: 170, dur: 0.14, vol: 0.2, type: 'sine', punch: true }); thump(0, 115, 0.4, 0.15); crack(0.005, 0.18, 4000); chime(G6, 0.02, 0.06, 0.3); },
    heartwood: () => { thump(0, 100, 0.3, 0.16); chime(E6, 0, 0.1, 0.6); chime(G6, 0.05, 0.08, 0.6); noise({ type: 'bandpass', f: 3500, q: 1.2, dur: 0.2, vol: 0.07, a: 0.02 }); },
    stormstaff: () => { crack(0, 0.55, 6500); crackle(0.01, 5, 3000, 7000, 0.12); tone({ f: 1800, to: 200, dur: 0.15, vol: 0.12, type: 'sawtooth', lp: 3500, punch: true }); thump(0.02, 70, 0.55, 0.4); noise({ at: 0.03, type: 'lowpass', f: 500, to: 120, dur: 0.35, vol: 0.2 }); },
    frostwand: () => { crack(0, 0.4, 7500); [0, 0.03, 0.06, 0.1, 0.15].forEach(at => chime(rnd(2000, 4500), at, 0.05, 0.25)); thump(0, 140, 0.3, 0.12); noise({ type: 'highpass', f: 8000, dur: 0.18, vol: 0.06 }); },
  };
  /* ---- bows and staves: the shot or the cast ---- */
  const RELEASE = {
    bow: () => { pluck(135, 0, 0.34, 0.32); swish(0.005, 2400, 6800, 0.1, 0.18, 'highpass'); tone({ f: 1700, to: 2700, at: 0.01, dur: 0.12, vol: 0.05, type: 'sine' }); crack(0, 0.08, 4500); },
    shortbow: () => { pluck(210, 0, 0.28, 0.22); swish(0, 3200, 8000, 0.07, 0.14, 'highpass'); tone({ f: 2200, to: 3400, dur: 0.08, vol: 0.04, type: 'sine' }); },
    longbow: () => { pluck(92, 0, 0.44, 0.5); pluck(184, 0, 0.12, 0.3); swish(0.01, 2200, 5500, 0.15, 0.16, 'highpass'); tone({ f: 1500, to: 2600, dur: 0.16, vol: 0.05, type: 'sine' }); },
    crossbow: () => { crack(0, 0.18, 1800); wood(760, 0, 0.2); thump(0.02, 110, 0.4, 0.12); pluck(120, 0.02, 0.3, 0.25); swish(0.03, 2400, 6200, 0.09, 0.14, 'highpass'); },
  };
  const CAST = {
    staff: () => { swish(0, 3000, 9000, 0.14, 0.12, 'highpass'); chime(C6, 0.02, 0.09, 0.5); chime(G6, 0.08, 0.08, 0.6); tone({ f: 600, to: 1500, dur: 0.16, vol: 0.05, type: 'sine' }); },
    heartwood: () => { noise({ type: 'bandpass', f: 3200, q: 1.2, dur: 0.25, vol: 0.07, a: 0.05 }); pluck(G5, 0, 0.12, 0.5); pluck(C6, 0.07, 0.11, 0.55); chime(E6, 0.12, 0.07, 0.7); },
    stormstaff: () => { swish(0, 200, 1600, 0.18, 0.18); crackle(0.01, 5, 3500, 7000, 0.1); tone({ f: 180, to: 1900, dur: 0.2, vol: 0.1, type: 'sawtooth', lp: 3200, punch: true }); },
    frostwand: () => { [0, 0.04, 0.08].forEach((at, i) => chime(2400 + i * 500, at, 0.09, 0.45)); swish(0, 6000, 11000, 0.14, 0.07, 'highpass'); noise({ at: 0.05, type: 'highpass', f: 9000, dur: 0.2, vol: 0.04 }); },
  };
  const HEALFX = {
    staff: () => { pluck(E5, 0, 0.12, 0.5); pluck(G5, 0.07, 0.12, 0.5); pluck(C6, 0.14, 0.12, 0.6); chime(E6, 0.2, 0.07, 0.7); },
    heartwood: () => { [C5, E5, G5, C6].forEach((f, i) => pluck(f, i * 0.07, 0.1, 0.8)); chime(E6, 0.22, 0.08, 0.9); noise({ type: 'bandpass', f: 3000, q: 1, dur: 0.4, vol: 0.05, a: 0.1 }); },
    stormstaff: () => { tone({ f: 330, to: 440, dur: 0.3, vol: 0.09, type: 'sine', a: 0.08 }); crackle(0.05, 3, 3000, 5000, 0.05); chime(G6, 0.12, 0.08, 0.7); chime(C7, 0.18, 0.06, 0.7); },
    frostwand: () => { [E6, G6, C7].forEach((f, i) => chime(f, i * 0.07, 0.09, 0.8)); noise({ type: 'highpass', f: 9000, dur: 0.3, vol: 0.04, a: 0.05 }); },
  };
  /* critical hit by weapon kind: the whack, then a ting that fits what hit */
  const CRITFX = {
    blade: () => { crack(0, 0.4, 3200); thump(0, 135, 0.5, 0.2); thump(0, 60, 0.4, 0.32); crunch(0, 0.32, 2200, 300, 0.14); swish(0, 2500, 9500, 0.09, 0.22, 'highpass'); tone({ f: 1400, to: 3600, dur: 0.08, vol: 0.1, type: 'sawtooth', lp: 5000, punch: true }); steel(2700, 0.015, 0.16, 0.5); steel(4100, 0.02, 0.09, 0.42); bell(C7, 0.03, 0.07, 0.8); [[0.1, 0.1, 2500], [0.2, 0.06, 2350], [0.3, 0.035, 2200]].forEach(([at, v, f]) => steel(f, at, v, 0.3)); },
    arrow: () => { crack(0, 0.42, 4500); thump(0, 190, 0.5, 0.16); thump(0, 70, 0.35, 0.28); wood(340, 0, 0.3); tone({ f: 1800, to: 3800, dur: 0.08, vol: 0.09, type: 'sawtooth', lp: 5000, punch: true }); steel(3300, 0.015, 0.14, 0.5); [[0.1, 0.08, 3000], [0.2, 0.05, 2850]].forEach(([at, v, f]) => steel(f, at, v, 0.3)); },
    magic: () => { crack(0, 0.45, 5000); thump(0, 110, 0.55, 0.22); thump(0, 52, 0.45, 0.4); swish(0, 2500, 10000, 0.1, 0.18, 'highpass'); crackle(0.01, 4, 3500, 7000, 0.12); chime(C7, 0.02, 0.14, 1.0); chime(G6, 0.06, 0.1, 0.9); bell(C7, 0.05, 0.08, 1.2); },
  };

  /* ---- monsters: every kind of monster growls, strikes and dies in its own way. arg: { c: kind, s: size } ---- */
  const MWIND = {
    beast: s => growl(165 / s, 0, 0.3, 0.16),
    giant: s => { growl(95 / s, 0, 0.5, 0.22); thump(0.05, 70, 0.2, 0.2); },
    dragon: () => { growl(78, 0, 0.55, 0.24); noise({ type: 'highpass', f: 5000, dur: 0.4, vol: 0.08, a: 0.1 }); },
    insect: () => { tone({ f: 230, dur: 0.3, vol: 0.07, type: 'sawtooth', lp: 1800, a: 0.03, nojit: true }); tone({ f: 238, dur: 0.3, vol: 0.07, type: 'sawtooth', lp: 1800, a: 0.03, nojit: true }); noise({ type: 'bandpass', f: 3000, q: 2, dur: 0.28, vol: 0.05 }); },
    frog: () => { tone({ f: 100, to: 165, dur: 0.12, vol: 0.2, type: 'sine', a: 0.01 }); tone({ f: 92, to: 150, at: 0.13, dur: 0.14, vol: 0.2, type: 'sine', a: 0.01 }); noise({ type: 'bandpass', f: 320, q: 2, dur: 0.25, vol: 0.1 }); },
    snake: () => { noise({ type: 'highpass', f: 5500, dur: 0.35, vol: 0.14, a: 0.08 }); noise({ type: 'bandpass', f: 8000, q: 1.5, dur: 0.3, vol: 0.08, a: 0.08 }); },
    golem: () => { noise({ type: 'lowpass', f: 280, dur: 0.4, vol: 0.2, a: 0.08 }); tone({ f: 55, to: 48, dur: 0.4, vol: 0.15, type: 'sine' }); crack(0.1, 0.1, 1200); crack(0.2, 0.1, 1000); },
    crab: () => { wood(1800, 0, 0.12); wood(1500, 0.07, 0.12); wood(1900, 0.14, 0.12); },
    bat: () => { tone({ f: 3200, to: 1900, dur: 0.18, vol: 0.06, type: 'sine' }); tone({ f: 3300, to: 2000, at: 0.02, dur: 0.16, vol: 0.04, type: 'sine' }); noise({ type: 'bandpass', f: 500, dur: 0.07, vol: 0.1 }); noise({ at: 0.08, type: 'bandpass', f: 500, dur: 0.07, vol: 0.1 }); },
    spirit: () => { noise({ type: 'bandpass', f: 1500, q: 2, dur: 0.3, vol: 0.1, a: 0.1 }); tone({ f: 440, to: 520, dur: 0.3, vol: 0.04, type: 'sine', a: 0.1 }); },
    plant: () => { noise({ type: 'bandpass', f: 2500, q: 1, dur: 0.3, vol: 0.12, a: 0.06 }); wood(300, 0.15, 0.1); },
  };
  MWIND.hag = MWIND.spirit; MWIND.ice = MWIND.spirit; MWIND.fire = MWIND.spirit;
  const claw = () => { swish(0, 3500, 1200, 0.08, 0.2); crunch(0.02, 0.32, 1500, 300, 0.12); thump(0.02, 160, 0.42, 0.15); };
  const MHIT = {
    beast: claw,
    giant: () => { thump(0, 85, 0.7, 0.3); thump(0, 45, 0.55, 0.4); crack(0, 0.3, 2500); crunch(0, 0.4, 1400, 200, 0.2); },
    dragon: () => { claw(); noise({ type: 'bandpass', f: 900, to: 300, dur: 0.2, vol: 0.14, punch: true }); },
    insect: () => { crack(0, 0.3, 5000); tone({ f: 1800, to: 900, dur: 0.06, vol: 0.1, type: 'sine' }); thump(0, 220, 0.25, 0.08); },
    frog: () => { noise({ type: 'lowpass', f: 900, to: 250, dur: 0.1, vol: 0.3, punch: true }); thump(0, 150, 0.4, 0.14); noise({ at: 0.03, type: 'bandpass', f: 400, dur: 0.06, vol: 0.12 }); },
    snake: () => { crack(0, 0.28, 4500); noise({ type: 'highpass', f: 6000, dur: 0.1, vol: 0.12 }); thump(0, 200, 0.3, 0.1); },
    golem: () => { thump(0, 90, 0.65, 0.28); crack(0, 0.3, 2500); noise({ type: 'lowpass', f: 1100, to: 200, dur: 0.22, vol: 0.28, punch: true }); },
    crab: () => { wood(1700, 0, 0.2); steel(1500, 0.01, 0.08, 0.2); crack(0, 0.22, 3500); thump(0, 200, 0.3, 0.1); },
    bat: () => { swish(0, 5000, 2000, 0.07, 0.15); crunch(0.02, 0.25, 1800, 400, 0.1); thump(0.02, 190, 0.3, 0.12); },
    spirit: () => { tone({ f: 700, to: 150, dur: 0.12, vol: 0.15, type: 'sawtooth', lp: 2500, punch: true }); crack(0, 0.2, 4500); thump(0, 120, 0.35, 0.14); chime(C6, 0.02, 0.05, 0.3); },
    plant: () => { wood(330, 0, 0.35); crunch(0, 0.2, 1800, 500, 0.08); thump(0, 230, 0.3, 0.1); },
  };
  MHIT.hag = MHIT.spirit; MHIT.ice = () => { crack(0, 0.3, 7000); chime(rnd(2500, 3500), 0, 0.07, 0.3); thump(0, 130, 0.35, 0.12); }; MHIT.fire = () => { crack(0, 0.25, 4000); noise({ type: 'bandpass', f: 1200, to: 300, dur: 0.15, vol: 0.2, punch: true }); thump(0, 120, 0.4, 0.15); };
  /* a ranged monster fires: spit, wisp, ember, ice shard, mist */
  const MSHOT = {
    plant: () => { noise({ type: 'bandpass', f: 900, to: 450, dur: 0.1, vol: 0.2 }); wood(500, 0.02, 0.15); },
    spirit: () => { swish(0, 500, 2500, 0.2, 0.14); chime(E6, 0.05, 0.06, 0.4); },
    hag: () => { tone({ f: 220, to: 260, dur: 0.3, vol: 0.08, type: 'sine', a: 0.08 }); noise({ type: 'bandpass', f: 1200, q: 2, dur: 0.3, vol: 0.08, a: 0.1 }); chime(A5, 0.1, 0.05, 0.5); },
    ice: () => { [0, 0.04].forEach((at, i) => chime(2800 + i * 600, at, 0.07, 0.4)); swish(0, 6500, 10500, 0.12, 0.06, 'highpass'); },
    fire: () => { swish(0, 300, 900, 0.25, 0.2); crackle(0.02, 4, 1500, 4000, 0.07); },
  };
  const MDIE_KIND = { beast: 'flesh', giant: 'flesh', frog: 'flesh', snake: 'flesh', bat: 'flesh', dragon: 'dragon', insect: 'bug', crab: 'bug', golem: 'golem', spirit: 'spirit', hag: 'spirit', plant: 'plant', ice: 'ice', fire: 'fire' };
  const MDIE = {
    flesh: s => { thump(0, 150 / s, 0.5, 0.22); tone({ f: 280 / s, to: 70 / s, dur: 0.32, vol: 0.18, type: 'sawtooth', lp: 700, punch: true }); noise({ type: 'lowpass', f: 2000, to: 260, dur: 0.2, vol: 0.18 }); crack(0, 0.18); },
    dragon: () => { growl(80, 0, 0.7, 0.26); thump(0.1, 70, 0.5, 0.4); noise({ at: 0.1, type: 'lowpass', f: 1500, to: 150, dur: 0.5, vol: 0.2 }); },
    bug: () => { crunch(0, 0.35, 2500, 500, 0.1); noise({ at: 0.03, type: 'lowpass', f: 800, to: 250, dur: 0.15, vol: 0.2 }); wood(420, 0.02, 0.25); },
    golem: () => { thump(0, 80, 0.5, 0.3); noise({ type: 'lowpass', f: 1500, to: 150, dur: 0.5, vol: 0.3, punch: true }); [0.08, 0.16, 0.26].forEach(at => crack(at, 0.12, rnd(900, 1800))); },
    spirit: () => { swish(0, 2500, 300, 0.3, 0.14); chime(G6, 0.02, 0.06, 0.5); chime(E6, 0.1, 0.05, 0.5); chime(C6, 0.18, 0.05, 0.6); },
    plant: () => { noise({ type: 'lowpass', f: 1800, to: 300, dur: 0.2, vol: 0.16 }); noise({ type: 'bandpass', f: 2500, q: 1, dur: 0.25, vol: 0.1 }); wood(320, 0, 0.2); },
    ice: () => { crack(0, 0.35, 7500); [0, 0.04, 0.09, 0.14].forEach(at => chime(rnd(2000, 4500), at, 0.05, 0.3)); thump(0, 120, 0.3, 0.14); },
    fire: () => { noise({ type: 'bandpass', f: 1500, to: 300, dur: 0.3, vol: 0.18 }); noise({ type: 'highpass', f: 6000, dur: 0.3, vol: 0.06 }); thump(0, 120, 0.3, 0.14); },
  };

  Object.assign(SOUNDS, {
    swing: w => (SWING[w] || SWING.sword)(),
    wimpact: p => (IMPACT[(p && p.w) || 'sword'] || IMPACT.sword)(p && p.a),
    release: w => (RELEASE[w] || RELEASE.bow)(),
    cast: w => (CAST[w] || CAST.staff)(),
    healfx: w => (HEALFX[w] || HEALFX.staff)(),
    crit: f => (CRITFX[f] || CRITFX.blade)(),
    mwind: p => { const c = (p && p.c) || 'beast'; (MWIND[c] || MWIND.beast)((p && p.s) || 1); },
    mhit: p => (MHIT[(p && p.c) || 'beast'] || MHIT.beast)(),
    mshot: p => (MSHOT[(p && p.c) || 'spirit'] || MSHOT.spirit)(),
    mdie: p => { const k = MDIE_KIND[(p && p.c) || 'beast'] || 'flesh'; MDIE[k]((p && p.s) || 1); },
    herodown: () => { thump(0, 100, 0.5, 0.3); noise({ type: 'lowpass', f: 600, to: 200, dur: 0.25, vol: 0.15 }); chime(G5, 0.08, 0.06, 0.6); chime(C5, 0.2, 0.06, 0.8); },
  });

  /* sounds that tend to come in bursts: at most one per this many milliseconds */
  const GAP = { swing: 70, wimpact: 45, release: 70, cast: 70, healfx: 200, mwind: 220, mhit: 60, mshot: 120, mdie: 70, herodown: 250, crit: 80, hurt: 70, hurtcrit: 90, block: 90, tap: 40, tick: 30, star: 120, coins: 80, warn: 400 };
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
