/* Wildlight Expedition – background music.
 * Real recorded tracks (assets/music/*.mp3, CC0, see assets/music/CREDITS.md; built by tools/build-music.js) played with the Web Audio API:
 *   'village'  two calm medieval folk tracks (lute and flute) that follow each other with a short crossfade, then start over,
 *   'fight'    one lively folk-battle loop,   'boss'  one heavier cinematic loop.
 * Each track is fetched and decoded the first time it is needed (the others a few seconds later, in the background); a track that cannot be loaded just stays silent.
 * window.music.set('village' | 'fight' | 'boss' | null) switches theme with a crossfade; music.duck(seconds) lowers it for a moment (fanfares);
 * music.sync() applies the sound mode of sfx.js ('all' plays music; 'fx' and 'off' do not) and starts after the first tap. */
(function () {
  'use strict';
  const LEVEL = 0.6;                       // the tracks are levelled to about -20 LUFS; this puts the music well under the sound effects
  const XF = 2.5;                          // seconds of crossfade between two tracks of the village list
  const THEMES = {
    village: { files: ['village1', 'village2'], gain: 1 },          // one pass of each, one after the other (both are seamless loops on their own)
    fight: { files: ['fight'], gain: 1 },                           // one file that loops
    boss: { files: ['boss'], gain: 1 },
  };

  let A = null, out = null, desired = null, cur = null, duckTimer = 0, preloaded = false;
  const buffers = {};                                              // file -> Promise of a decoded AudioBuffer (or null if it failed)

  function audio() {
    if (A) return A;
    if (!window.sfx || window.sfx.state() !== 'running') return null;
    const a = window.sfx.audio();
    if (!a) return null;
    A = a;
    out = a.ctx.createGain(); out.gain.value = LEVEL; out.connect(a.out);
    return A;
  }

  const fileUrl = f => (typeof window.assetUrl === 'function' ? window.assetUrl(`music/${f}.mp3`) : `assets/music/${f}.mp3`);
  function load(f) {
    if (!buffers[f]) {
      buffers[f] = fetch(fileUrl(f)).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
        .then(b => new Promise((ok, no) => A.ctx.decodeAudioData(b, ok, no))).catch(() => { delete buffers[f]; return null; });
    }
    return buffers[f];
  }
  function preload() {                                              // the other themes, once the first one is playing
    if (preloaded) return;
    preloaded = true;
    setTimeout(() => { for (const t of Object.values(THEMES)) for (const f of t.files) load(f); }, 4000);
  }

  /* Plays file number i of the theme from time t0 on (a crossfade into it unless it is the first one), and plans the next one: it starts XF seconds before this one ends. */
  function schedule(c, i, t0, first) {
    const th = THEMES[c.name], f = th.files[i % th.files.length];
    load(f).then(buf => {
      if (cur !== c || !buf) return;
      const ctx = A.ctx, now = ctx.currentTime, start = Math.max(t0, now), single = th.files.length === 1;
      const g = ctx.createGain(), s = ctx.createBufferSource();
      s.buffer = buf; s.loop = single; s.connect(g); g.connect(c.bus);
      if (first) {                                                   // the theme fades in as a whole
        c.bus.gain.cancelScheduledValues(now); c.bus.gain.setValueAtTime(0, now); c.bus.gain.linearRampToValueAtTime(th.gain, now + 1.2);
        g.gain.setValueAtTime(1, start);
      } else { g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(1, start + XF); }
      if (!single) {
        const end = start + buf.duration;
        g.gain.setValueAtTime(1, Math.max(start + XF, end - XF)); g.gain.linearRampToValueAtTime(0.0001, end);
        const wait = Math.max(0, (end - XF - 10 - now) * 1000);       // plan the next track 10 seconds before it is needed
        c.timer = setTimeout(() => { if (cur === c) schedule(c, i + 1, end - XF, false); }, wait);
      }
      s.start(start); c.srcs.push(s);
      s.onended = () => { c.srcs = c.srcs.filter(x => x !== s); try { g.disconnect(); } catch (e) { /* ignore */ } };
    });
  }
  function fadeOut(c, sec) {
    if (!c) return;
    clearTimeout(c.timer);
    const t = A.ctx.currentTime;
    c.bus.gain.cancelScheduledValues(t); c.bus.gain.setValueAtTime(c.bus.gain.value, t); c.bus.gain.linearRampToValueAtTime(0, t + sec);
    setTimeout(() => { for (const s of c.srcs) { try { s.stop(); } catch (e) { /* ignore */ } } try { c.bus.disconnect(); } catch (e) { /* ignore */ } }, sec * 1000 + 300);
  }
  function startTheme(name) {
    const bus = A.ctx.createGain();
    bus.gain.value = 0;
    bus.connect(out);
    cur = { name, bus, srcs: [] };
    schedule(cur, 0, A.ctx.currentTime, true);
    preload();
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
