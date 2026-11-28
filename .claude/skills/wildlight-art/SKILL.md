---
name: wildlight-art
description: Make or redo Wildlight Expedition pictures (heroes, weapon poses, armor layers, monsters, item icons, backgrounds) with Codex image generation, check them and put them into the game. Use when the game needs new or changed art.
---

All game pictures are bitmaps made by **Codex CLI** with its built-in image tool (never draw art with code or fake it). Claude writes a brief, starts Codex processes, checks the results and wires them in.
Templates: `wildlight-expedition/tools/art-briefs/` (`codex-art-brief-v10-heroes.md` new heroes, `-v11-outfits.md` redraw all heroes + item icons, `-v12-armor-layers.md` armor layers). Copy the closest one and change the sections.

## Picture rules the game depends on
- Heroes face RIGHT; full body, feet visible, no ground shadow, transparent background, no halo or text.
- **Every picture of one hero shares one canvas**: feet at x = 50% and y = 97.46% of the height, same scale. `assets/meta.json` stores `{frameW, frameH, feetX: 0.5, feetY: 0.97461, figureH}` per hero (figureH = standing figure height as a share of the canvas); canvases: Bren 812x512, Tavi 526, Iona 606, Milo 560, Rook 620, Elric 640, Maren 820, Tobin 600 (all 512 high). Monsters: height 512 (bosses 640).
- Names: heroes `assets/heroes/<hero>-<weapon>-<idle|attack>.webp`; armor layers `assets/armor/<hero>-<leatherarmor|chainmail|platearmor>-<idle|attack>.webp` (transparent, SAME canvas as the hero pictures, only the armor pieces); icons `assets/items/<id>.png` 256x256 transparent; monsters `assets/monsters/<id>-<idle|attack>.webp`; backgrounds `assets/bg/<stage>.jpg` 1200x800.
- A new hero or weapon also needs `HERO_FILES`, `HEIGHT`, `PHASE`, `IDLE` (sprites.js) and the meta entry; see `wildlight-add-content`.
- Style: clean anime cel-shading, confident dark-brown outlines, soft shading. Simple base outfits so armor reads clearly when added.

## Brief checklist (what made Codex output usable)
- Say exactly what stays (pose, weapon, canvas, face) and what changes. Name the existing pictures as references (full paths).
- **Consistency method**: first picture of a character from the description (or edit of the current one), then EVERY other picture in edit mode from its own current picture plus the first new picture as a second reference.
- One section per hero; each Codex process only touches its own files. Output to a NEW folder (`assets/heroes-v2/`), never overwrite existing files; scratch only in `.art-scratch-<id>/`. Ask for PNG and WebP (quality 92, alpha kept) and a contact sheet HTML (old/new, dark/light, feet line at 97.46%).
- Armor layers: Codex makes the full armored picture in edit mode from the base picture, then cuts the layer out by comparing it with the base (only armor pixels opaque). One layer per hero and pose is reused over all that hero's weapon pictures, so ask Codex to check the other weapon pictures.

## Run Codex
One terminal tab per process (the session may open only **6 tabs**; reusable tabs show `reusable: true` in `list_terminal_tabs`; chain two commands with `;` in one tab to run 8-9 sections):
```
codex exec -m gpt-6.2-sol -s workspace-write --skip-git-repo-check "Read C:\Temp\Game\<brief>.md and do exactly what it says. Your section is A (Bren, id bren)."
```
(`--full-auto` is not accepted by this Codex version.) Runs take 20-60 minutes. Watch progress with a `Monitor` that counts the output files (heroes 50 files, armor layers 48) instead of polling.

## Check before using
1. Dimensions: every new file must have the SAME width/height as the file it replaces (parse the WebP/PNG headers in a small node script) and `meta.json` must still be right.
2. Look at them: a contact sheet of the first idle picture of every hero (outfit consistent, weapon right), the attack pictures, and for armor an overlay page (`<img>` of the base with the layer absolutely positioned on top; also over the other weapon pictures). Check on dark and light backgrounds for halos.
3. Back up the old pictures (`.heroes-v1-backup/`) outside the repo, copy the new WebP over, `git rm` pictures that are no longer used (the first three heroes used PNG before the outfit redraw; `HERO_PNG` in sprites.js is now empty).
4. Run the game (phone size), open the Party tab, a fight and the Forge; confirm no 404 (`artUrls()` HEAD check, see the `wildlight-expedition` skill).
5. Mention in the PR what was generated and how it was checked; art is judged by looking, say what you looked at.
