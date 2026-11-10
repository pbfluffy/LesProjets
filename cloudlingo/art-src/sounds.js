// Generates Cloudlingo's sound effects as small MP3s (sounds/*.mp3).
// Everything is synthesized here: bell-like tones built from a few harmonics with
// soft attacks and exponential decays, kept short and quiet on purpose.
// Needs ffmpeg on PATH. Usage: node art-src/sounds.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RATE = 44100;
const OUT = path.join(__dirname, '..', 'sounds');
fs.mkdirSync(OUT, { recursive: true });

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
// A soft bell: fundamental plus quiet upper partials, each decaying faster than the one below.
function bell(buf, t0, freq, { len = 0.6, vol = 0.5, bright = 1, attack = 0.006 } = {}) {
  const partials = [[1, 1, 1], [2, 0.35 * bright, 1.6], [3, 0.12 * bright, 2.4], [4.2, 0.06 * bright, 3.5]];
  const start = Math.floor(t0 * RATE), n = Math.floor(len * RATE);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-t * 5.5 / len);
    let s = 0;
    for (const [mult, amp, decay] of partials) s += amp * Math.sin(2 * Math.PI * freq * mult * t) * Math.exp(-t * decay * 3 / len);
    buf[start + i] += vol * env * s;
  }
}
// A gentle muted "bonk": a sine sliding down in pitch with a quick decay.
function bonk(buf, t0, from, to, { len = 0.28, vol = 0.45 } = {}) {
  const start = Math.floor(t0 * RATE), n = Math.floor(len * RATE);
  let phase = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE, f = from * Math.pow(to / from, t / len);
    phase += 2 * Math.PI * f / RATE;
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 9 / len);
    buf[start + i] += vol * env * (Math.sin(phase) + 0.2 * Math.sin(2 * phase));
  }
}
// Airy sparkle: a few very high, very short bells at random-ish times.
function sparkle(buf, t0, count, { spread = 0.4, vol = 0.18, base = 96 } = {}) {
  const notes = [0, 4, 7, 12, 16, 19, 24];
  for (let k = 0; k < count; k++) {
    const at = t0 + spread * k / count + 0.01 * ((k * 7) % 3);
    bell(buf, at, midi(base + notes[(k * 3) % notes.length]), { len: 0.25, vol, bright: 0.5, attack: 0.002 });
  }
}
// Soft rising whoosh (filtered noise) for the streak sound.
function whoosh(buf, t0, { len = 0.45, vol = 0.12 } = {}) {
  const start = Math.floor(t0 * RATE), n = Math.floor(len * RATE);
  let lp = 0, seed = 12345;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const noise = seed / 0x7fffffff * 2 - 1, t = i / RATE;
    const cutoff = 0.02 + 0.25 * (t / len);
    lp += cutoff * (noise - lp);
    const env = Math.sin(Math.PI * t / len);
    buf[start + i] += vol * env * lp * 3;
  }
}

const SOUNDS = {
  // Right answer: two bright rising notes (E6 → A6).
  correct: [0.42, b => { bell(b, 0, midi(88), { len: 0.3, vol: 0.38 }); bell(b, 0.085, midi(93), { len: 0.34, vol: 0.42 }); }],
  // Wrong answer: a soft, low two-step bonk. Gentle, never harsh.
  wrong: [0.4, b => { bonk(b, 0, 330, 220, { len: 0.18, vol: 0.32 }); bonk(b, 0.12, 247, 165, { len: 0.24, vol: 0.3 }); }],
  // Lesson complete: a cheerful four-note arpeggio with a little sparkle.
  complete: [1.15, b => { [72, 76, 79, 84].forEach((n, i) => bell(b, i * 0.09, midi(n), { len: 0.7, vol: 0.32 })); bell(b, 0.36, midi(88), { len: 0.75, vol: 0.2 }); sparkle(b, 0.42, 5, { spread: 0.35 }); }],
  // Daily goal / streak: a warm whoosh into a rising chord.
  streak: [1.1, b => { whoosh(b, 0, { len: 0.38 }); [67, 71, 74, 79].forEach((n, i) => bell(b, 0.22 + i * 0.06, midi(n), { len: 0.75, vol: 0.27 })); }],
  // Achievement unlocked: a quick sparkle run, then a bright ding.
  badge: [1.0, b => { sparkle(b, 0, 7, { spread: 0.32, vol: 0.16 }); bell(b, 0.34, midi(91), { len: 0.65, vol: 0.34 }); bell(b, 0.34, midi(84), { len: 0.65, vol: 0.2 }); }],
  // Streak freeze earned: icy, high shimmering bells.
  freeze: [0.95, b => { [96, 100, 103, 108, 103, 100].forEach((n, i) => bell(b, i * 0.07, midi(n), { len: 0.4, vol: 0.13, bright: 0.4, attack: 0.003 })); bell(b, 0.3, midi(84), { len: 0.6, vol: 0.18, bright: 0.3 }); }],
  // Mock exam passed: a bright fanfare ending on a full chord.
  pass: [1.5, b => { [67, 72, 76].forEach((n, i) => bell(b, i * 0.11, midi(n), { len: 0.4, vol: 0.3 })); [72, 76, 79, 84].forEach(n => bell(b, 0.36, midi(n), { len: 1.05, vol: 0.2 })); sparkle(b, 0.45, 6, { spread: 0.5, vol: 0.13 }); }],
  // Mock exam not passed: a soft, encouraging two-note fall (not a "fail" buzzer).
  tryagain: [0.8, b => { bell(b, 0, midi(76), { len: 0.4, vol: 0.27, bright: 0.6 }); bell(b, 0.16, midi(72), { len: 0.6, vol: 0.27, bright: 0.6 }); }]
};

for (const [name, [secs, draw]] of Object.entries(SOUNDS)) {
  const buf = new Float32Array(Math.ceil(secs * RATE));
  draw(buf);
  // Normalize to a gentle peak and fade the very end to avoid clicks.
  let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const gain = peak ? 0.6 / peak : 1;
  const fade = Math.floor(0.03 * RATE);
  const pcm = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const f = i > buf.length - fade ? (buf.length - i) / fade : 1;
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * gain * f * 32767))), i * 2);
  }
  const out = path.join(OUT, name + '.mp3');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '64k', out], { input: pcm });
  console.log(name.padEnd(9), secs + 's', fs.statSync(out).size + ' B');
}
