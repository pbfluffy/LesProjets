/* Builds the game's music (assets/music/*.mp3) from the downloaded CC0 tracks listed in assets/music/CREDITS.md.
 *   node tools/build-music.js <folder with the downloaded files>
 * Needs ffmpeg on the PATH. Every track is levelled by a fixed gain (so a seamless loop stays seamless) to about -20 LUFS and saved as MP3 (VBR quality 5).
 * The two village tracks are already seamless loops. The fight and boss tracks are plain songs, so a loop is made of them: the last XF seconds fade out
 * while the first XF seconds fade in over them, and the file starts XF seconds in; when the file ends and starts again nothing is heard. */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const src = process.argv[2];
if (!src) { console.error('usage: node tools/build-music.js <folder with the downloaded files>'); process.exit(1); }
const out = path.join(__dirname, '..', 'assets', 'music');
fs.mkdirSync(out, { recursive: true });

const TRACKS = [
  { out: 'village1.mp3', file: 'Loop_The_Bards_Tale.wav', gain: -8.0 },                 // "Medieval: The Bard's Tale" (RandomMind), loop version
  { out: 'village2.mp3', file: 'Loop_The_Old_Tower_Inn.wav', gain: -2.6 },              // "Medieval: The Old Tower Inn" (RandomMind), loop version
  { out: 'fight.mp3', file: 'battle_8.mp3', gain: -6.5, xf: 3 },                         // "Medieval: Battle" (RandomMind)
  { out: 'boss.mp3', file: 'battleThemeA.mp3', gain: -9.7, xf: 4 },                      // "Battle Theme A" (cynicmusic)
];
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const duration = f => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString().trim());

for (const t of TRACKS) {
  const input = path.join(src, t.file), dest = path.join(out, t.out);
  const enc = ['-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-q:a', '5', dest];
  if (!t.xf) { ff(['-i', input, '-af', `volume=${t.gain}dB`, ...enc]); }
  else {
    const L = duration(input), x = t.xf;
    ff(['-i', input, '-filter_complex',
      `[0]volume=${t.gain}dB,asplit=3[a][b][c];` +
      `[a]atrim=start=${x}:end=${(L - x).toFixed(3)},asetpts=PTS-STARTPTS[body];` +
      `[b]atrim=start=${(L - x).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:d=${x}:curve=qsin[tail];` +
      `[c]atrim=end=${x},asetpts=PTS-STARTPTS,afade=t=in:d=${x}:curve=qsin[head];` +
      `[tail][head]amix=inputs=2:duration=longest:normalize=0[xf];[body][xf]concat=n=2:v=0:a=1[o]`, '-map', '[o]', ...enc]);
  }
  console.log(t.out, (fs.statSync(dest).size / 1048576).toFixed(2) + ' MB', duration(dest).toFixed(1) + ' s');
}
