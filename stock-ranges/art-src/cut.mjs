// Cuts the corgi out of its white background → art-src/corgi-full.png (transparent).
// The source is flat artwork on white, and the dog's chest is white too, so a colour key would
// eat the dog. Instead this flood-fills from the image edges: only white that is connected to
// the outside becomes transparent; white enclosed by outlines stays. Needs ffmpeg on PATH.
// Usage: node art-src/cut.mjs && node art-src/icons.mjs  →  public/img/icons/*
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, 'corgi-source.png')
const W = 1312
const H = 1199
const BG_MIN = 238 // a pixel counts as background white when every channel is at least this

const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 })
if (raw.length !== W * H * 4) throw new Error(`unexpected size ${raw.length}; expected ${W}x${H} RGBA`)

const isWhite = (p) => raw[p * 4] >= BG_MIN && raw[p * 4 + 1] >= BG_MIN && raw[p * 4 + 2] >= BG_MIN
const outside = new Uint8Array(W * H)
const stack = []
const push = (p) => { if (!outside[p] && isWhite(p)) { outside[p] = 1; stack.push(p) } }
for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x) }
for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1) }
while (stack.length) {
  const p = stack.pop()
  const x = p % W
  const y = (p / W) | 0
  if (x > 0) push(p - 1)
  if (x < W - 1) push(p + 1)
  if (y > 0) push(p - W)
  if (y < H - 1) push(p + W)
}

// Outside → fully transparent. Light pixels touching the outside are the anti-aliased fringe of an
// outline: fade them out in proportion to how white they are, so no pale halo shows on a tinted background.
const out = Buffer.from(raw)
const FRINGE_FROM = 150
let removed = 0
let softened = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x
    if (outside[p]) { out[p * 4 + 3] = 0; removed++; continue }
    let touches = false
    for (let dy = -1; dy <= 1 && !touches; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < W && ny >= 0 && ny < H && outside[ny * W + nx]) { touches = true; break }
      }
    }
    if (!touches) continue
    const lum = (raw[p * 4] + raw[p * 4 + 1] + raw[p * 4 + 2]) / 3
    if (lum > FRINGE_FROM) {
      out[p * 4 + 3] = Math.round(Math.max(0, Math.min(1, (255 - lum) / (255 - FRINGE_FROM))) * 255)
      softened++
    }
  }
}

execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', join(HERE, 'corgi-full.png')], { input: out, maxBuffer: 1 << 28 })
console.log(`transparent px: ${(removed / (W * H) * 100).toFixed(1)}%, softened edge px: ${softened}`)
