// Cuts the mascot sheet (art-src/nimbus-sheet.webp) into one transparent WebP per pose.
// Needs ffmpeg on PATH. Usage: node art-src/cut.js  →  img/nimbus/<pose>.webp
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'nimbus-sheet.webp');
const OUT = path.join(__dirname, '..', 'img', 'nimbus');
const W = 1536, H = 1024, MAX = 320; // output fits in 320x320 (2x the largest on-screen size)

// Rough boxes [x, y, w, h] around each pose on the sheet; trimmed to content below.
const POSES = {
  hero:     [20, 30, 610, 620],
  cool:     [625, 80, 300, 280],
  laugh:    [925, 50, 300, 300],
  think:    [1220, 60, 300, 290],
  angry:    [615, 385, 310, 290],
  tired:    [915, 410, 350, 265],
  proud:    [1255, 385, 270, 290],
  idea:     [25, 655, 385, 345],
  laptop:   [425, 690, 345, 310],
  shocked:  [805, 680, 335, 320],
  sleep:    [1150, 690, 375, 310]
};

const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: W * H * 4 + 1024 });

// Background = near-white or light-grey (shadow) pixels with little colour.
const isBg = (r, g, b) => Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 24;

fs.mkdirSync(OUT, { recursive: true });
for (const [name, [x0, y0, w, h]] of Object.entries(POSES)) {
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) raw.copy(px, y * w * 4, ((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4);

  // Flood-fill the background from every edge pixel. Black outlines stop it,
  // so the cloud's white body stays opaque.
  // Outlines have tiny anti-aliased gaps; thicken the dark lines into a wall
  // (WALL px) so the fill can't leak into the body through them.
  const WALL = { angry: 6, think: 4 }[name] || 2, wall = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (isBg(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) continue; // any line or colour (e.g. a mark drawn over the outline)
    for (let dy = -WALL; dy <= WALL; dy++) for (let dx = -WALL; dx <= WALL; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && dx * dx + dy * dy <= WALL * WALL) wall[yy * w + xx] = 1;
    }
  }
  const bg = new Uint8Array(w * h), stack = [];
  const push = i => { if (!bg[i] && !wall[i] && isBg(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i - x) / w;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w); if (y < h - 1) push(i + w);
  }
  // The wall also kept a light rim just outside the outline: hand those rim
  // pixels back to the background, at most WALL steps deep, so the outer edge
  // is clean while gaps into the body stay closed.
  for (let pass = 0; pass < WALL; pass++) {
    const add = [];
    for (let i = 0; i < w * h; i++) {
      if (bg[i] || !wall[i] || !isBg(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) continue;
      const x = i % w, y = (i - x) / w;
      if ((x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w])) add.push(i);
    }
    add.forEach(i => { bg[i] = 1; });
  }
  // Keep only the largest connected shape plus anything close to it (sparkles,
  // "!!", "?", zzz), dropping slivers of neighbouring poses at the box edges.
  const comp = new Int32Array(w * h).fill(-1), sizes = [], boxes = [];
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || comp[s] >= 0) continue;
    const id = sizes.length; let n = 0, bx0 = w, by0 = h, bx1 = 0, by1 = 0; const st = [s]; comp[s] = id;
    while (st.length) {
      const i = st.pop(), x = i % w, y = (i - x) / w; n++;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && !bg[j] && comp[j] < 0) { comp[j] = id; st.push(j); }
    }
    sizes.push(n); boxes.push([bx0, by0, bx1, by1]);
  }
  const main = sizes.indexOf(Math.max(...sizes)), mb = boxes[main], GAP = 70;
  const keep = sizes.map((n, k) => {
    const b = boxes[k];
    const touchesEdge = b[0] === 0 || b[1] === 0 || b[2] === w - 1 || b[3] === h - 1;
    const near = b[2] >= mb[0] - GAP && b[0] <= mb[2] + GAP && b[3] >= mb[1] - GAP && b[1] <= mb[3] + GAP;
    return k === main || (near && !touchesEdge && n >= 12);
  });
  let tx0 = w, ty0 = h, tx1 = 0, ty1 = 0;
  for (let i = 0; i < w * h; i++) {
    if (bg[i] || !keep[comp[i]]) { px[i * 4 + 3] = 0; continue; }
    const x = i % w, y = (i - x) / w;
    if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (y < ty0) ty0 = y; if (y > ty1) ty1 = y;
    // Soften the light fringe next to removed background so dark mode shows no white halo.
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const nearBg = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
    if (nearBg && Math.min(r, g, b) > 150) px[i * 4 + 3] = Math.max(0, Math.min(255, Math.round((255 - Math.min(r, g, b)) * 2.5)));
  }
  // Trim to content (with a small margin) and write a square-fit WebP.
  const m = 4; tx0 = Math.max(0, tx0 - m); ty0 = Math.max(0, ty0 - m); tx1 = Math.min(w - 1, tx1 + m); ty1 = Math.min(h - 1, ty1 + m);
  const cw = tx1 - tx0 + 1, ch = ty1 - ty0 + 1, crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) px.copy(crop, y * cw * 4, ((ty0 + y) * w + tx0) * 4, ((ty0 + y) * w + tx1 + 1) * 4);
  const scale = Math.min(1, MAX / Math.max(cw, ch));
  const ow = Math.round(cw * scale), oh = Math.round(ch * scale);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-i', '-',
    '-vf', `scale=${ow}:${oh}:flags=lanczos`, '-c:v', 'libwebp', '-lossless', '0', '-quality', '88', '-pix_fmt', 'yuva420p',
    path.join(OUT, name + '.webp')], { input: crop });
  console.log(name.padEnd(8), `${ow}x${oh}`, fs.statSync(path.join(OUT, name + '.webp')).size + ' B');
}
