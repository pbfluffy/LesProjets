# Art v15: armor layers for every weapon's attack pose (generate bitmap images)

Wildlight Expedition heroes wear armor as a transparent layer drawn over the hero picture (see `C:\Temp\Game\codex-art-brief-v12-armor-layers.md`, READ IT FIRST: it explains what a layer is, the three armors `leatherarmor`, `chainmail`, `platearmor`, the method and the rules; they all apply here).
Problem found: the layers of v12 were made for each hero's FIRST weapon only and the game reused them over the hero's other weapons. That fits the standing (idle) pictures but NOT the attack pictures: in the other weapons' attack poses the arms, shoulders and torso are in different places, so the armor pieces float or cover the face.
Fix: for every weapon of your hero EXCEPT the first one, make 3 new layers (one per armor) that fit THAT weapon's ATTACK picture exactly. Use your built-in image generation tool for the armor pictures (never draw armor with code; code only to measure, compare, cut out and save). Do NOT edit or overwrite any existing file. Other processes work on other heroes at the same time: do not touch their files or scratch folders.

## Inputs
- The hero's base attack pictures: `C:\Temp\Game\assets\heroes\<hero>-<weapon>-attack.webp` (the simple-outfit pictures; if your tools cannot open WebP, convert a copy to PNG in your scratch folder).
- The existing layer of the first weapon, as the style reference for the three armors: `C:\Temp\Game\assets\armor\<hero>-<armor>-attack.webp` (and `-idle.webp`).

## What to make
For each weapon below and each armor in `leatherarmor`, `chainmail`, `platearmor`: ONE transparent layer with the SAME canvas size as `<hero>-<weapon>-attack.webp`, containing only the armor pieces, placed exactly over that picture's body (chest piece, shoulders, bracers, belt, greaves/boots as in the existing layers; never over the face, hair, hands or the weapon and its effects). The three armors must look exactly like the existing layers of that hero (same design, same colours), only fitted to this pose.
Method (as in v12): in edit mode take the base attack picture and make the full picture of the same figure wearing the armor (same pose, face, weapon, effects, canvas), then cut the layer out by comparing it with the base picture (keep only the armor pixels, clean specks, fill small holes, smooth edges, fully transparent elsewhere, no fringe).
Verify each: put the layer over the base attack picture on a dark and a light background and look: the hero must look armored, with no floating pieces, nothing over the face, no clothes poking through. Redo bad ones.

## Output
- `C:\Temp\Game\assets\armor\<hero>-<armor>-<weapon>-attack.png` AND `.webp` (quality 92, alpha kept), exactly this naming (the weapon id between the armor and `attack`).
- A contact sheet `C:\Temp\Game\assets-preview-armor-attack-<hero>.html`: for each weapon and armor: the base attack picture, the layer alone on a checkerboard, and the layer over the base.
- Also check the IDLE pictures of the other weapons with the existing generic idle layers (`<hero>-<armor>-idle.webp` over `<hero>-<weapon>-idle.webp`): if any combination looks wrong (floating pieces, misplaced vambraces) make `<hero>-<armor>-<weapon>-idle.png|webp` for those too and say which ones in your final report.
- Scratch files only in `C:\Temp\Game\.art-scratch-v15-<hero>\`.
- Finish with the list of files and sizes and an honest note on how well each fits.

## Your hero (the section you were started with) and its weapons (make layers for these, the first weapon is already done)
A bren: `twin`, `great`, `falchion`, `saber`, `rapier`, `buckler` (18 layers) · B tavi: `shortbow`, `longbow`, `crossbow` (9) · C iona: `heartwood`, `stormstaff`, `frostwand` (9) · D milo: `woodaxe` (3) · E rook: `twindaggers` (3) · F elric: `grimoire` (3) · G maren: `halberd` (3) · H tobin: `gauntlets` (3)
