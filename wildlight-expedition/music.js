/* Wildlight Expedition – background music.
 * Three themes composed in code and played with the Web Audio API (no audio files): 'village' (calm, plucked arpeggios over a warm pad),
 * 'fight' (driving drums, bass and a minor-key riff) and 'boss' (slower, heavier, brass and low drums). Each theme is a step sequencer that
 * keeps scheduling a little ahead of the clock; the melody of the village theme wanders, so it does not repeat exactly.
 * window.music.set('village' | 'fight' | 'boss' | null) switches theme with a crossfade; music.duck(seconds) lowers it for a moment (fanfares);
 * music.sync() applies the sound mode of sfx.js ('all' plays music; 'fx' and 'off' do not) and starts after the first tap. */
(function () {
  'use strict';
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const LEVEL = 0.22;                      // music sits well under the sound effects

  let A = null, out = null, desired = null, cur = null, duckTimer = 0;

  function audio() {
    if (A) return A;
    if (!window.sfx || window.sfx.state() !== 'running') return null;
    const a = window.sfx.audio();
    if (!a) return null;
    A = a;
    out = a.ctx.createGain(); out.gain.value = LEVEL; out.connect(a.out);
    return A;
  }

  /* ---- voices (each writes to the theme's own bus) ---- */
  function voice(bus, o) {
    const ctx = A.ctx, t0 = o.at, dur = o.dur, v = o.vol, a = o.a || 0.01, r = o.r || 0.08;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.setValueAtTime(v, Math.max(t0 + a, t0 + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let tail = g;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); tail = f; }
    tail.connect(bus);
    const n = o.det ? [-o.det, o.det] : [0];
    n.forEach(d => {
      const osc = ctx.createOscillator();
      osc.type = o.type || 'triangle';
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      if (d) osc.detune.value = d;
      osc.connect(g); osc.start(t0); osc.stop(t0 + dur + 0.05);
    });
  }
  function hit(bus, o) {       // filtered noise (hats, snares, cymbals)
    const ctx = A.ctx, t0 = o.at;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = A.noiseBuf; src.loop = true;
    f.type = o.type || 'highpass'; f.frequency.value = o.f; f.Q.value = o.q || 0.8;
    g.gain.setValueAtTime(o.vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0, Math.random() * 0.4); src.stop(t0 + o.dur + 0.03);
  }
  const kick = (bus, at, vol) => { voice(bus, { f: 130, to: 42, at, dur: 0.2, vol: vol || 0.5, type: 'sine', a: 0.002, r: 0.05 }); };
  const snare = (bus, at, vol) => { hit(bus, { at, f: 1700, type: 'bandpass', q: 0.7, dur: 0.14, vol: vol || 0.16 }); voice(bus, { f: 210, to: 130, at, dur: 0.08, vol: 0.12, type: 'triangle', a: 0.002 }); };
  const hat = (bus, at, vol, open) => hit(bus, { at, f: 7500, dur: open ? 0.16 : 0.04, vol: vol || 0.05 });
  const tom = (bus, at, f0, vol) => { voice(bus, { f: f0, to: f0 * 0.5, at, dur: 0.38, vol: vol || 0.4, type: 'sine', a: 0.003, r: 0.1 }); hit(bus, { at, f: 400, type: 'lowpass', dur: 0.12, vol: 0.12 }); };

  /* ================= themes ================= */
  /* VILLAGE: A minor pentatonic, vi - IV - I - V, 8th-note grid, 78 bpm */
  const VCH = [                                       // bass root, chord tones (midi)
    { b: 45, c: [57, 60, 64, 69] },                   // Am
    { b: 41, c: [53, 57, 60, 65] },                   // F
    { b: 48, c: [55, 60, 64, 67] },                   // C
    { b: 43, c: [50, 55, 59, 62] },                   // G
  ];
  const PENT = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79];       // A C D E G A C D E G
  const ARP = [0, 1, 2, 1, 3, 2, 1, 2];
  const village = {
    bpm: 78, spb: 2, gain: 1,
    init: s => { s.mel = 5; },
    step(s, n, t, d) {
      const bar = Math.floor(n / 8) % 4, k = n % 8, ch = VCH[bar], B = s.bus;
      if (k === 0) {
        ch.c.slice(0, 3).forEach(m => voice(B, { f: mtof(m - 12), at: t, dur: d * 8.2, vol: 0.05, type: 'triangle', a: 0.7, r: 1.0, lp: 1100, det: 6 }));
        voice(B, { f: mtof(ch.b), at: t, dur: d * 4, vol: 0.13, type: 'sine', a: 0.02, r: 0.3 });
        if (Math.random() < 0.5) voice(B, { f: mtof(ch.c[3] + 12), at: t + d * 0.5, dur: d * 3, vol: 0.035, type: 'sine', a: 0.01, r: 0.8 });          // a soft bell
      }
      if (k === 4) voice(B, { f: mtof(ch.b), at: t, dur: d * 3, vol: 0.08, type: 'sine', a: 0.02, r: 0.3 });
      if (Math.random() < 0.88) {                                     // plucked arpeggio
        const m = ch.c[ARP[k] % 4] + (k % 4 === 3 ? 12 : 0);
        voice(B, { f: mtof(m), at: t, dur: d * 1.8, vol: 0.075, type: 'triangle', a: 0.004, r: 0.3, lp: 2400 });
      }
      if ((k === 0 || k === 4) && Math.random() < 0.72) {              // wandering melody
        s.mel = Math.max(1, Math.min(PENT.length - 1, s.mel + pick([-2, -1, -1, 0, 1, 1, 2])));
        const len = k === 0 ? pick([2, 3, 4]) : pick([1, 2]);
        voice(B, { f: mtof(PENT[s.mel]), at: t + d * 0.04, dur: d * len, vol: 0.085, type: 'sine', a: 0.02, r: 0.4 });
        voice(B, { f: mtof(PENT[s.mel]) * 2, at: t + d * 0.04, dur: d * len * 0.6, vol: 0.02, type: 'triangle', a: 0.02, r: 0.3 });
      }
    },
  };

  /* FIGHT: A minor, Am - F - G - Em, 16th-note grid, 142 bpm */
  const FCH = [{ b: 33, off: 0, c: [57, 60, 64] }, { b: 29, off: -4, c: [53, 57, 60] }, { b: 31, off: -2, c: [55, 59, 62] }, { b: 28, off: -5, c: [52, 55, 59] }];
  const RIFFS = [                                           // [step, scale degree in A minor pent (semitones above A4), length in steps]
    [[0, 0, 2], [2, 3, 2], [4, 7, 2], [6, 5, 2], [8, 3, 2], [10, 0, 2], [12, 3, 4]],
    [[0, 7, 3], [3, 5, 1], [4, 3, 2], [6, 0, 2], [8, 3, 2], [10, 5, 2], [12, 7, 2], [14, 10, 2]],
    [[0, 0, 1], [1, 0, 1], [2, 3, 2], [4, 5, 2], [6, 7, 2], [8, 10, 2], [10, 7, 2], [12, 5, 2], [14, 3, 2]],
  ];
  const BASS8 = [0, 0, 12, 0, 0, 0, 7, 12];
  const fight = {
    bpm: 142, spb: 4, gain: 0.6,                           // drums and bass peak higher than the village harp: trim the theme
    init: s => { s.riff = 0; },
    step(s, n, t, d) {
      const bar = Math.floor(n / 16) % 4, k = n % 16, ch = FCH[bar], B = s.bus;
      if (k % 2 === 0) voice(B, { f: mtof(ch.b + BASS8[k / 2]), at: t, dur: d * 1.9, vol: 0.12, type: 'sawtooth', a: 0.004, r: 0.04, lp: 520 });
      if (k === 0 || k === 8) kick(B, t, 0.5);
      if (k === 10 && bar % 2) kick(B, t, 0.4);
      if (k === 4 || k === 12) snare(B, t, 0.17);
      if (k % 2 === 0) hat(B, t, k % 4 === 2 ? 0.055 : 0.035, false);
      if (k === 14) hat(B, t, 0.06, true);
      if (k === 0 || k === 10) ch.c.forEach(m => voice(B, { f: mtof(m), at: t, dur: d * (k === 0 ? 3 : 2), vol: 0.04, type: 'sawtooth', a: 0.004, r: 0.05, lp: 1500 }));
      if (k === 0) s.riff = bar === 0 ? Math.floor(Math.random() * RIFFS.length) : s.riff;
      RIFFS[s.riff].forEach(([st, deg, len]) => {
        if (st !== k) return;
        voice(B, { f: mtof(69 + deg + ch.off), at: t, dur: d * len * 0.95, vol: 0.06, type: 'sawtooth', a: 0.006, r: 0.05, lp: 2300, det: 5 });
      });
    },
  };

  /* BOSS: D minor, Dm - Bb - C - Dm, 16th-note grid, 112 bpm */
  const BCH = [{ b: 38, c: [50, 57, 62] }, { b: 34, c: [46, 53, 58] }, { b: 36, c: [48, 55, 60] }, { b: 38, c: [50, 57, 62] }];
  const boss = {
    bpm: 112, spb: 4, gain: 0.6,
    init: () => {},
    step(s, n, t, d) {
      const bar = Math.floor(n / 16) % 4, k = n % 16, ch = BCH[bar], B = s.bus;
      if (k === 0) {
        ch.c.forEach(m => voice(B, { f: mtof(m + 12), at: t, dur: d * 16.2, vol: 0.04, type: 'sawtooth', a: 0.5, r: 0.8, lp: 800, det: 8 }));       // tense strings
        voice(B, { f: mtof(ch.b - 12), at: t, dur: d * 15, vol: 0.2, type: 'sine', a: 0.05, r: 0.3 });                                                 // low drone
        tom(B, t, 95, 0.45);
      }
      if (k === 0 || k === 10) ch.c.forEach(m => voice(B, { f: mtof(m + 12), at: t, dur: d * 2.5, vol: 0.075, type: 'sawtooth', a: 0.01, r: 0.1, lp: 1100 }));  // brass stabs
      if (k % 4 === 0) voice(B, { f: mtof(ch.b), at: t, dur: d * 3.6, vol: 0.12, type: 'sawtooth', a: 0.006, r: 0.06, lp: 380 });
      if (k === 6 || k === 8) kick(B, t, 0.45);
      if (k === 4 || k === 12) { snare(B, t, 0.2); tom(B, t, 70, 0.22); }
      if (k === 14) tom(B, t, 110, 0.28);
      if (k % 2 === 0) hat(B, t, 0.03, false);
      if (bar === 3 && k >= 8 && k % 2 === 0) voice(B, { f: mtof(86), at: t, dur: d * 1.5, vol: 0.03, type: 'triangle', a: 0.004, r: 0.05 });          // a rising shiver
      if (bar === 3 && k === 15) hit(B, { at: t, f: 4000, dur: 0.5, vol: 0.06 });
    },
  };
  const THEMES = { village, fight, boss };

  /* ================= playback ================= */
  function pump() {
    if (!cur || !A) return;
    const th = THEMES[cur.name], dur = 60 / th.bpm / th.spb, now = A.ctx.currentTime;
    if (cur.next < now - 0.5) cur.next = now + 0.05;                // the clock ran on while the tab was away: do not play catch-up
    while (cur.next < now + 0.3) { th.step(cur, cur.step, cur.next, dur); cur.step++; cur.next += dur; }
  }
  function fadeOut(c, sec) {
    if (!c) return;
    clearInterval(c.timer);
    const t = A.ctx.currentTime;
    c.bus.gain.cancelScheduledValues(t); c.bus.gain.setValueAtTime(c.bus.gain.value, t); c.bus.gain.linearRampToValueAtTime(0, t + sec);
    setTimeout(() => { try { c.bus.disconnect(); } catch (e) { /* ignore */ } }, sec * 1000 + 600);
  }
  function startTheme(name) {
    const ctx = A.ctx, bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime); bus.gain.linearRampToValueAtTime(THEMES[name].gain || 1, ctx.currentTime + 1.2);
    bus.connect(out);
    cur = { name, bus, step: 0, next: ctx.currentTime + 0.1 };
    if (THEMES[name].init) THEMES[name].init(cur);
    cur.timer = setInterval(pump, 80);
    pump();
  }
  function apply() {
    const want = window.sfx && window.sfx.musicOn() ? desired : null;
    if (!want) { if (cur && A) { fadeOut(cur, 0.7); cur = null; } return; }
    if (!audio()) return;                                       // before the first tap: wait
    if (cur && cur.name === want) return;
    fadeOut(cur, 0.9); cur = null;
    startTheme(want);
  }
  function setDuck(on) {
    if (!A) return;
    const t = A.ctx.currentTime;
    out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(on ? LEVEL * 0.22 : LEVEL, t + (on ? 0.15 : 0.9));
  }

  window.music = {
    set(name) { desired = THEMES[name] ? name : null; if (!desired || desired !== (cur && cur.name)) setDuck(false); apply(); },
    sync: apply,
    duck(sec) {                                                  // a fanfare is playing: lower the music for a moment
      if (!A) return;
      setDuck(true); clearTimeout(duckTimer);
      duckTimer = setTimeout(() => setDuck(false), (sec || 2) * 1000);
    },
    current: () => (cur ? cur.name : null),
    wanted: () => desired,
    themes: () => Object.keys(THEMES),
  };
})();
