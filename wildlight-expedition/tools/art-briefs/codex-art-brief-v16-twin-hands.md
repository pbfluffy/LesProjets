# Art v16: left-hand and right-hand attack pictures for the twin weapons (generate bitmap images)

In Wildlight Expedition a hero with twin blades attacks twice per swing. Today there is ONE attack picture where both blades cross at once. The game now wants the two hits to come from alternating hands: first the RIGHT hand strikes, then the LEFT hand.
You make the pictures for ONE hero and weapon (the section letter you were started with: A, B or C). Use your built-in image generation tool: do NOT draw anything with code and do not fake images (code only to measure, crop, convert and save). Do NOT edit or overwrite any existing file. The other section works at the same time: do not touch its files or scratch folders.

## Sections
- A: Bren with twin swords (id `bren`, weapon `twin`). Current pictures: `C:\Temp\Game\assets\heroes\bren-twin-idle.webp` and `bren-twin-attack.webp`.
- B: Rook with twin daggers (id `rook`, weapon `twindaggers`). Current pictures: `C:\Temp\Game\assets\heroes\rook-twindaggers-idle.webp` and `rook-twindaggers-attack.webp`.
- C: Tobin with hand wraps (id `tobin`, weapon `wraps`). Current pictures: `C:/Temp/Game/assets/heroes/tobin-wraps-idle.webp` and `C:/Temp/Game/assets/heroes/tobin-wraps-attack.webp`. Here the "blades" are his two cloth-wrapped fists: `attackR` = a straight punch with the RIGHT fist (left fist guarding near the chin), `attackL` = the next punch with the LEFT fist (right fist pulled back to guard), shoulders and hips twisting opposite ways; keep the same punch effect style as the existing attack picture.
(Open the WebP files; if your tools cannot open WebP, convert copies to PNG in your scratch folder.)

## What to make: two attack pictures
- `<hero>-<weapon>-attackR`: the hero in a lunging strike, the **RIGHT-hand blade** (the hand nearest the camera is not important: the hero faces RIGHT as in all hero pictures, so the right hand is the one holding the weapon on the viewer's left/front, as in the existing picture) slashing forward in a clear arc with a motion trail; the OTHER blade is pulled back (drawn behind the hip / held low), not crossing in front.
- `<hero>-<weapon>-attackL`: the next strike: the **LEFT-hand blade** slashing forward in a clear arc with its motion trail, the first blade now pulled back; the body turned the other way a little (shoulders and hips twisted opposite to the first pose) so the two pictures read as right hand, then left hand, one after the other.
Both pictures: same hero (face, hair, outfit, colours exactly like the existing pictures), same blades (shape, size, colour, the same slash-trail style and colour as the existing attack picture), same camera, **same canvas size as the existing `-attack` picture of that weapon, feet at x 50% and y 97.46% of the height, same scale**; the weapons and trails stay fully inside the canvas.
Method: edit mode from the existing `-attack` picture (and the idle picture) as the references, so everything but the pose stays identical. Make `attackR` first and `attackL` from it.

## Output
- `C:\Temp\Game\assets\heroes\<hero>-<weapon>-attackR.png|webp` and `<hero>-<weapon>-attackL.png|webp` (PNG and WebP quality 92, alpha kept).
- A contact sheet `C:\Temp\Game\assets-preview-twin-<hero>.html`: idle, the old attack, attackR, attackL side by side on dark and light backgrounds with the feet baseline (y = 97.46%) and the centre line marked.
- Scratch files only in `C:\Temp\Game\.art-scratch-v16-<hero>\`.
- Check every picture by looking: same hero and blades, the two poses clearly different (right then left), nothing cut off, no halo or text, feet in the same place as the idle. Redo bad ones. Finish with the file list and sizes.
