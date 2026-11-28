# Art v11: simpler outfits for all eight heroes, plus armor icons (generate bitmap images)

Wildlight Expedition is getting ARMOR (leather, chain, plate) that the heroes can wear. For the armor to show clearly, every hero first needs a **simple, plain base outfit** (ordinary clothes, no armor, no cape, no ornaments).
You redraw ONE hero (the section letter you were started with: A to H): ALL of his or her existing pictures, same poses and weapons, but in the simple outfit. Section I makes four item icons.
Use your built-in image generation tool: do NOT draw anything with code, and do not fake images. Other processes work on the other sections at the same time: do not touch their files or scratch folders.

## What stays and what changes
- STAYS exactly: the pose, the weapon (shape, colour, size), the hands, the camera, the canvas size, the position and scale of the figure (feet at x = 50% and y = 97.46% of the height), the face, the hair, the skin tone, the body build, the eye colour, the style (clean anime cel-shading, confident dark-brown outlines, soft shading).
- CHANGES: only the clothing, to the simple outfit described in the section: fewer layers, no metal armor, no pauldrons, no capes or cloaks, no gold trim, no embroidery, no big ornaments. Plain cloth and leather in muted, readable colours that keep each hero's signature colour (so the cast is still told apart at a small size).
- Heroes face RIGHT. Full body, feet visible, no ground shadow, no text, transparent background with no halo or fringe (check on a dark and on a light background).
- Accessories that carry the weapon (a quiver, a satchel strap, a belt) are fine and stay if the hero needs them.

## Method (consistency)
The CURRENT pictures are the references. They are in `C:\Temp\Game\assets\heroes\<hero>-<weapon>-<idle|attack>.png` or `.webp` (open them; if your tools cannot open a WebP, convert it to a PNG in your scratch folder first). Newer heroes also have PNG originals in `C:\Temp\Game\.hero-originals\`.
1. First redraw the hero's FIRST idle picture (given in the section) in EDIT mode from the current picture: same pose and weapon, new outfit. Check it carefully: this is the new "reference look" of the hero.
2. Redraw EVERY other picture of the hero in edit mode from its own current picture, and also give the new reference look as a second reference, so the new outfit, colours and face are identical in all pictures. Only the weapon and the pose differ between pictures, and those must match the CURRENT picture of that name.
3. Compare each new picture with the current one: same pose, same weapon, same placement and scale. If the figure moved or changed size, redo it.

## Output
- Write the new pictures to `C:\Temp\Game\assets\heroes-v2\` with EXACTLY the same file names as the current ones, base name `<hero>-<weapon>-<idle|attack>`, as **PNG** (losslessly optimised) AND as **WebP** next to it (same name, quality 92, alpha kept; use Pillow or any tool you have). Same canvas size as the current picture of that name.
- A contact sheet `C:\Temp\Game\assets-preview-hero-v2-<id>.html` showing, for every picture, the OLD and the NEW one side by side on a dark and on a light background with a line at the feet baseline (y = 97.46%) and the centre line.
- Do NOT edit or overwrite any existing file (the old pictures stay where they are). Scratch files go in `C:\Temp\Game\.art-scratch-v2-<id>\` ONLY.
- Verify every image by looking at it: the outfit must be simple and the same in all pictures, the weapon and pose must match the current picture, no halo, no text, nothing cut off. Regenerate bad ones.
- Finish with a list of the files and their sizes, and say whether the WebP conversion worked.

## Sections

### A: Bren (id `bren`): all 14 pictures: sword, twin, great, falchion, saber, rapier, buckler, each idle + attack. First picture: `bren-sword-idle`
Currently a young knight with red-brown armor, gold trim, a cloak and a lantern. New outfit: a plain cream-white long-sleeved tunic with the sleeves rolled to the elbow, a wide brown leather belt, dark brown trousers, plain brown boots, a small red neckerchief (his signature colour), a simple brown leather strap across the chest only if his weapons need it. No armor, no cloak, no lantern, no gold.

### B: Tavi (id `tavi`): all 8 pictures: bow, shortbow, longbow, crossbow, each idle + attack. First picture: `tavi-bow-idle`
Currently a hooded green ranger with a cloak and leather gear. New outfit: a simple moss-green tunic with a plain hood resting on the shoulders (hood down), a brown belt, brown trousers, simple boots, a plain leather quiver on the back (keep it). No cloak, no armor, no ornaments.

### C: Iona (id `iona`): all 8 pictures: staff, heartwood, stormstaff, frostwand, each idle + attack. First picture: `iona-staff-idle`
Currently a healer in an ornate purple and white dress with ribbons and jewelry. New outfit: a plain long soft-lavender dress with simple sleeves and a rope belt, a plain white collar, simple flat shoes. No jewelry, no ribbons, no ornaments, no layers.

### D: Milo Dunn (id `milo`): 4 pictures: pitchfork, woodaxe, each idle + attack. First picture: `milo-pitchfork-idle`
Already the plainest. Make him slightly plainer: a cream linen shirt with rolled sleeves, simple brown trousers, a rope belt, worn boots. Remove the patched waistcoat and the satchel. Still scruffy and likeable, still the weakest-looking of the cast.

### E: Rook (id `rook`): 4 pictures: dagger, twindaggers, each idle + attack. First picture: `rook-dagger-idle`
Currently a rogue in a teal-grey hooded cloak, vest, scarf and pouches. New outfit: a plain charcoal-grey long-sleeve shirt with a simple dark leather vest, a teal-grey scarf (his signature colour), fingerless gloves, one plain belt, dark trousers, soft boots. No cloak, no hood, no pouches.

### F: Elric Vane (id `elric`): 4 pictures: tome, grimoire, each idle + attack. First picture: `elric-tome-idle`
Currently a mage in a blue-violet robe with gold star embroidery and a high collar. New outfit: a plain deep-blue long robe with a simple round neckline, a plain cord belt, no embroidery, no gold, no satchel of scrolls. Keep the round spectacles and the short pale-blond hair.

### G: Maren Ashe (id `maren`): 4 pictures: spear, halberd, each idle + attack. First picture: `maren-spear-idle`
Currently a lancer in steel pauldrons, a breastplate and a crimson-and-white tabard. New outfit: a plain white linen shirt with long sleeves, a plain crimson sash around the waist (her signature colour), simple dark trousers, plain leather boots. No metal, no pauldrons, no breastplate, no tabard. Keep the long black braid and the calm determined face.

### H: Brother Tobin (id `tobin`): 4 pictures: wraps, gauntlets, each idle + attack. First picture: `tobin-wraps-idle`
Currently a monk in saffron and brown robes with prayer beads. New outfit: simpler: a plain saffron-orange sleeveless robe tied with a plain brown sash, bare arms, simple trousers, sandals. Remove the beads and the layered robes. In `tobin-gauntlets-*` the iron gauntlets (the weapon) stay exactly as they are.

### I: Armor icons (no hero): 4 icons in `C:\Temp\Game\assets\items\`
Create `garb.png`, `leatherarmor.png`, `chainmail.png`, `platearmor.png`: 256 x 256 transparent PNG, the item centred upright with a little margin, NO text, NO hands, NO characters, no shadow. Match the look of the existing weapon icons in `C:\Temp\Game\assets\items\` (e.g. `sword.png`, `heartwood.png`).
- `garb.png`: a folded plain cream tunic with a brown belt on top, a travelling shirt (simple, soft cloth).
- `leatherarmor.png`: a brown leather cuirass (chest piece) with stitched seams, shoulder straps and a buckled belt, no metal except the buckles.
- `chainmail.png`: a steel chainmail shirt (hauberk) with short sleeves, visible ring mesh, a leather belt, a dark leather collar.
- `platearmor.png`: a polished steel plate cuirass with two pauldrons (shoulder plates), gold trim at the edges and a red cloth strip under the neck.
Only section I writes these icons (to `C:\Temp\Game\assets\items\`, do NOT overwrite any existing file there); keep scratch files in `C:\Temp\Game\.art-scratch-v2-icons\`.
