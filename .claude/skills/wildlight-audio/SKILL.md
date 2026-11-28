---
name: wildlight-audio
description: Change Wildlight Expedition sound effects or background music (recorded CC0 clips and tracks, synth fallback, mixing, credits). Use when adding or fixing sounds or music, or when the audio sounds wrong.
---

Design guide: `rpg-combat-audio-design.md` (dev folder) and the "Sound" / "Background music" sections of `wildlight-expedition/CLAUDE.md`. Nobody can listen from the session: choose by **measuring**, say so in the PR ("measured, not heard") and invite the user's ear.

## Sound effects (`sfx.js`, `assets/sfx/`)
- Every action has a **synth version** (works with no files) and, where it exists, a **recorded clip** that replaces it once `pack.bin` has loaded (`SMP` table: action → group + gain/rate; `SMP_LEVEL` 0.7 because clips are normalised hotter than the synth). New weapons and skills need entries in both (`SWING` / `IMPACT` / `CAST` / `skill_*`).
- `assets/sfx/pack.bin` (~170 clips, mono 16-bit 22.05 kHz) + `index.json` are built by `tools/build-sfx.js <folder with the unpacked source packs>`; the groups are defined in that file (`GROUPS`: max length after the onset, variants kept, source files). `tools/sfx-analyze.js <file|folder>` prints duration, peak, decay and brightness so clips can be picked without listening. Both need `ffmpeg` on the PATH.
- Buses: player combat 0 dB, enemy combat -6 dB, interface -5 dB, `alert` 0 dB (boss warning, fanfares, rare loot), music below. A voice budget stops many sounds stacking. The sound panel (header speaker) has Music / Effects / Interface sliders; no sound on tab changes.

## Music (`music.js`, `assets/music/`)
- Four CC0 recorded MP3s (`village1`, `village2`, `fight`, `boss`), credits in `assets/music/CREDITS.md`, built by `node tools/build-music.js <folder with the downloads>` (needs `ffmpeg` and `ffprobe`): a fixed gain to about -20 LUFS (so seamless loops stay seamless), MP3 VBR q5; the `fight` and `boss` songs are turned into loops by fading their last seconds into their first seconds and starting `xf` seconds in.
- `music.js` plays them with Web Audio: village = the two tracks one after the other with a 2.5 s crossfade, fight and boss = `loop = true`. Tracks are fetched and decoded on first use; the next village track is planned 10 s ahead with a timer. **Never schedule recursively without a timer** (that froze the page once).
- To change a track: put the file in `TRACKS` of `tools/build-music.js` (gain = target -20 minus the measured loudness from `ffmpeg -af ebur128`), run it, update `CREDITS.md`, check the decoded length of each MP3 in the browser (`decodeAudioData`: it must match, the browser trims encoder padding) and the level with an `AnalyserNode`.

## Getting new audio (rules)
- Only **CC0** (or a license that needs no more than a credit you can give) and say which. Read the page's license and file list in the built-in browser (the site refuses automated page fetches with 403; reading in the browser pane is fine).
- **Ask the user before downloading**: list file names, source page, license and sizes, and wait for a yes. Never work around a site that blocks downloads (no spoofed user agents).
- Downloads are untrusted data: put them in their own new folder outside the project, only decode them with ffmpeg, never run anything from them. The originals are not shipped; only the built files and the credits are.
