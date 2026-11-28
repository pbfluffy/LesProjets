# Art v14: skill button art: eight hero portrait medallions and sixteen skill icons (generate bitmap images)

In Wildlight Expedition every hero has two battle skills (buttons under the battle scene). Players must see at a glance WHICH hero a skill belongs to and what it does. You make ONE section (the letter you were started with: A, B or C).
Use your built-in image generation tool: do NOT draw anything with code and do not fake images (code only to measure, crop, convert and save). Other processes work on the other sections at the same time: do not touch their files or scratch folders. Do NOT edit or overwrite any existing file.
Match the existing art: painted storybook fantasy, clean cel-shading, confident dark outlines, rich colour. Look at `C:\Temp\Game\assets\heroes\` (the heroes, e.g. `bren-sword-idle.webp`; open them, convert a copy to PNG in your scratch folder if your tools cannot open WebP) and at the item icons in `C:\Temp\Game\assets\items\` (e.g. `sword.png`, `heartwood.png`, `leatherarmor.png`) for the finish.
Output each picture as PNG AND WebP (same name, quality 92, alpha kept where it is transparent).
Each hero has a signature colour (used by the buttons): milo `#c9b27a`, bren `#c98a2b`, tavi `#4c9a5c`, iona `#b69ce0`, rook `#4fa6a0`, elric `#7078d8`, maren `#c8504a`, tobin `#e08a2c`.

## Section A: eight hero portrait medallions, `C:\Temp\Game\assets\ui\hero-<id>.png|webp`, 256 x 256
A head-and-shoulders portrait of each hero (ids: `milo`, `bren`, `tavi`, `iona`, `rook`, `elric`, `maren`, `tobin`), painted in the same style, SQUARE, with an opaque soft background: a calm radial glow in the hero's signature colour fading to a darker shade of it. The face is centred and large (the game clips it to a circle of about 40 px, so the face must be readable that small), eyes clear, a little of the shoulders and the outfit visible (the hero's current SIMPLE outfit, see the idle pictures: no armor). Keep every hero's face, hair, skin tone, spectacles, topknot, braid, hood, quiver strap etc. exactly like the sprite so players recognise them at once. Slightly three-quarter view looking toward the right, a confident expression. No frame, no text, nothing outside the square.
Make them with the hero's idle picture as the reference (edit mode / reference image), then check all eight side by side: same finish, same lighting direction, clearly different people.

## Sections B and C: sixteen skill icons, `C:\Temp\Game\assets\skills\<id>.png|webp`, 192 x 192, transparent background
Each icon is a bold game-icon EMBLEM on a transparent background: one strong, simple silhouette that reads at 28 px (as well as at 96 px), painted with soft shading and a clean dark outline, a gentle glow in the owner's signature colour behind or around it (the glow stays inside the canvas and fades out, no hard edges), no text, no hands or characters (except where listed), centred with a small margin. Colours: mostly the owner's signature colour plus gold, white and a darker shade; each icon must look different from the others at a glance.
Use the same lighting and outline weight for all of your icons. After making them, put all of them on a dark background at 28, 48 and 96 px in a contact sheet and check that each one is readable at 28 px; redo any that are muddy.

### B: Bren, Tavi, Iona and Milo (eight icons)
- `whirlwind` (Bren, orange): a spinning sword with two sweeping crescent slash trails around it.
- `ironguard` (Bren, orange): a round steel shield with a gold boss and a faint golden barrier glow.
- `arrowrain` (Tavi, green): three arrows falling from above at slight angles with little green sparkles.
- `snipe` (Tavi, green): a single long arrow with a bright glowing tip flying toward a small target ring.
- `bloom` (Iona, lilac): a glowing flower (five soft petals) with a heart of light and tiny floating motes.
- `storm` (Iona, lilac): a jagged lightning bolt striking from a small purple storm cloud.
- `hardswing` (Milo, sandy gold): a wooden farm axe or pitchfork mid-swing with a big impact starburst.
- `rally` (Milo, sandy gold): a brass war horn with three curved sound waves leaving it.

### C: Rook, Elric, Maren and Tobin (eight icons)
- `backstab` (Rook, teal): two crossed curved daggers with three quick slash lines.
- `smoke` (Rook, teal): a round black bomb with a lit fuse and a billowing grey-teal smoke cloud.
- `fireball` (Elric, indigo-blue with orange fire): a blazing orange fireball with a flame tail and a few embers.
- `meteor` (Elric, indigo-blue with orange fire): three flaming meteors streaking down diagonally.
- `lance` (Maren, crimson): a long spear sweeping in a wide arc with a crimson slash trail and a red tassel.
- `bulwark` (Maren, crimson): a tall kite shield with a crimson cross, with a glowing barrier ring around it.
- `ironpalm` (Tobin, saffron-orange): an iron-gauntleted open palm striking forward with a golden shockwave ring.
- `innerpeace` (Tobin, saffron-orange): a lotus flower with a soft golden aura and two calm swirling light ribbons.

## Files, scratch and checks
- Create only the files of your section (A: `assets\ui\hero-<id>`; B and C: `assets\skills\<id>`), a contact sheet `C:\Temp\Game\assets-preview-skillui-<letter>.html` (dark background, several sizes; for A also at 40 px round-clipped), and scratch files only in `C:\Temp\Game\.art-scratch-v14-<letter>\`. If your sandbox forbids deleting scratch files, leave them.
- Verify every image by looking at it: portraits must match the sprites' faces; icons must be readable small, centred, transparent around the edges with no halo and no text.
- Finish with the list of files and their sizes.
