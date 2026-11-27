// Measures sound files (duration, peak, how fast they decay, brightness) so they can be chosen without listening.
// usage: node tools/sfx-analyze.js <file-or-folder> [...]   (needs ffmpeg on the PATH)
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const SR = 22050;

function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('ffmpeg failed for ' + file);
  const b = r.stdout; return new Float32Array(b.buffer, b.byteOffset, b.length >> 2);
}
function fft(re, im) {                                   // in-place radix-2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) {
      const a = i + k, b = i + k + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
      re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
function analyze(x) {
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
  const thr = peak * 0.1; let on = 0; while (on < x.length && Math.abs(x[on]) < thr) on++;
  // envelope in 5 ms windows from the onset
  const w = Math.round(SR * 0.005), env = [];
  for (let i = on; i + w <= x.length; i += w) { let s = 0; for (let k = 0; k < w; k++) s += x[i + k] * x[i + k]; env.push(Math.sqrt(s / w)); }
  const ep = Math.max(...env, 1e-9); let dec = env.length; for (let i = 0; i < env.length; i++) if (env[i] < ep * 0.0316 && i > 2) { dec = i; break; }       // to -30 dB
  // brightness: spectral centroid of the first 4096 samples after the onset
  const N = 4096, re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = (x[on + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  fft(re, im); let num = 0, den = 0; for (let k = 1; k < N / 2; k++) { const m = Math.hypot(re[k], im[k]); num += m * k * SR / N; den += m; }
  return { dur: x.length / SR, onset: on / SR, peakDb: 20 * Math.log10(peak || 1e-9), decayMs: dec * 5, centroid: den ? num / den : 0 };
}
function walk(p, out) { const s = fs.statSync(p); if (s.isDirectory()) fs.readdirSync(p).forEach(f => { if (!/__MACOSX|\.DS_Store/.test(f)) walk(path.join(p, f), out); }); else if (/\.(wav|ogg|mp3|flac)$/i.test(p)) out.push(p); return out; }
if (require.main === module) {
  const files = process.argv.slice(2).flatMap(p => walk(p, []));
  for (const f of files) { try { const a = analyze(decode(f)); console.log(`${path.basename(f).padEnd(34)} dur ${a.dur.toFixed(2)}s onset ${(a.onset * 1000).toFixed(0).padStart(4)}ms peak ${a.peakDb.toFixed(0).padStart(4)}dB decay ${String(a.decayMs).padStart(4)}ms centroid ${a.centroid.toFixed(0).padStart(5)}Hz`); } catch (e) { console.log(path.basename(f), 'ERR', e.message); } }
}
module.exports = { decode, analyze, SR };
