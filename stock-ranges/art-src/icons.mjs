// App icons and the link-preview image, made from the cut-out corgi (art-src/corgi-full.png, written
// by cut.mjs). Same recipe as cloudlingo/art-src/icons.js. Needs ffmpeg on PATH and Windows' Segoe UI Bold.
// Usage: node art-src/cut.mjs && node art-src/icons.mjs  →  public/img/icons/*
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ART = join(HERE, 'corgi-full.png') // the whole scene: the phone overlaps the dog's face, so it can't be cropped away
const OUT = join(HERE, '..', 'public', 'img', 'icons')
const BG = '0xE6F6EC' // soft mint behind the corgi (the green of the bandana, very light)
mkdirSync(OUT, { recursive: true })
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args])

// Square icon: art scaled to `art` px WIDE (the scene is wider than tall), centred on a solid background.
function icon(file, size, art) {
  ff(['-f', 'lavfi', '-i', `color=c=${BG}:s=${size}x${size}`, '-i', ART, '-filter_complex',
    `[1:v]scale=${art}:-1:flags=lanczos[h];[0:v][h]overlay=(W-w)/2:(H-h)/2:format=auto,format=rgb24`,
    '-frames:v', '1', join(OUT, file)])
}
icon('icon-512.png', 512, 484) // "any": nearly full bleed
icon('icon-192.png', 192, 182)
icon('icon-512-maskable.png', 512, 372) // maskable: art inside the central 80% safe zone
icon('apple-touch-icon.png', 180, 156) // iOS rounds the corners itself; no transparency

// Link preview (Open Graph / LINE / X): 1200x630, art on the left, title on the right.
const font = 'C\\:/Windows/Fonts/segoeuib.ttf'
const text = (t, size, x, y, color) => `drawtext=fontfile='${font}':text='${t}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}`
ff(['-f', 'lavfi', '-i', `color=c=${BG}:s=1200x630`, '-i', ART, '-filter_complex',
  `[1:v]scale=-1:540:flags=lanczos[h];[0:v][h]overlay=36:(H-h)/2:format=auto,` +
  [text('Stock', 112, 664, 70, '0xC45C1A'),
   text('Ranges', 112, 664, 178, '0xC45C1A'),
   text('Where does a price sit', 38, 664, 335, '0x1A1916'),
   text('in its own recent range?', 38, 664, 386, '0x1A1916'),
   text('Buy 1-3', 30, 664, 482, '0x2D6A4F'),
   text('Hold 4-7', 30, 808, 482, '0x8A6200'),
   text('Sell 8-10', 30, 968, 482, '0x922B21')].join(',') + ',format=rgb24',
  '-frames:v', '1', '-q:v', '3', join(OUT, 'og-image.jpg')])

for (const f of readdirSync(OUT)) console.log(f.padEnd(24), statSync(join(OUT, f)).size + ' B')
