// App icons and the link-preview image, made from the full-size hero pose
// (art-src/hero-full.png, written by cut.js). Needs ffmpeg on PATH.
// Usage: node art-src/cut.js && node art-src/icons.js  →  img/icons/*
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HERO = path.join(__dirname, 'hero-full.png');
const OUT = path.join(__dirname, '..', 'img', 'icons');
const BG = '0xEAF5FF'; // soft sky blue behind Nimbus
fs.mkdirSync(OUT, { recursive: true });
const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

// Square icon: hero scaled to `art` px tall, centred on a solid background.
function icon(file, size, art) {
  ff(['-f', 'lavfi', '-i', `color=c=${BG}:s=${size}x${size}`, '-i', HERO, '-filter_complex',
    `[1:v]scale=-1:${art}:flags=lanczos[h];[0:v][h]overlay=(W-w)/2:(H-h)/2:format=auto,format=rgb24`,
    '-frames:v', '1', path.join(OUT, file)]);
}
icon('icon-512.png', 512, 452);          // "any": nearly full bleed
icon('icon-192.png', 192, 170);
icon('icon-512-maskable.png', 512, 330); // maskable: art inside the central 80% safe zone
icon('apple-touch-icon.png', 180, 140);  // iOS rounds the corners itself; no transparency

// Link preview (Open Graph / LINE / X): 1200x630, hero on the left, title on the right.
const font = 'C\\:/Windows/Fonts/segoeuib.ttf';
const text = (t, size, y, color) => `drawtext=fontfile='${font}':text='${t}':fontsize=${size}:fontcolor=${color}:x=600:y=${y}`;
ff(['-f', 'lavfi', '-i', `color=c=${BG}:s=1200x630`, '-i', HERO, '-filter_complex',
  `[1:v]scale=-1:520:flags=lanczos[h];[0:v][h]overlay=70:(H-h)/2:format=auto,` +
  [text('Cloudlingo', 104, 170, '0x1F8EF1'),
   text('Bite-sized daily lessons', 46, 315, '0x1D2B3A'),
   text('for AWS certifications', 46, 372, '0x1D2B3A'),
   text('CLF · AIF · SAA · DVA · SOA · DEA', 34, 470, '0xF07F1A')].join(',') + ',format=rgb24',
  '-frames:v', '1', '-q:v', '3', path.join(OUT, 'og-image.jpg')]);

for (const f of fs.readdirSync(OUT)) console.log(f.padEnd(24), fs.statSync(path.join(OUT, f)).size + ' B');
