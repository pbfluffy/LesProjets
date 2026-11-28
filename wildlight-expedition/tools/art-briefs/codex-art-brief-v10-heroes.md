# Art v10: five new heroes with their weapons (generate bitmap images)

Wildlight Expedition is getting five new heroes. You make ONE hero (the section letter you were started with: A, B, C, D or E): his or her **idle and attack pictures for two weapons** and the **item icons of the weapons**.
Use your built-in image generation tool: do NOT draw anything with code, and do not fake images. Other processes work on the other sections at the same time: do not touch their files or scratch folders.

## Style (match the existing heroes EXACTLY)
Look at every file in `C:\Temp\Game\assets\heroes\` (Bren, Tavi, Iona: e.g. `bren-sword-idle.png`, `bren-sword-attack.png`, `tavi-bow-idle.png`, `iona-staff-idle.png`) and the item icons in `C:\Temp\Game\assets\items\` (e.g. `sword.png`, `rapier.png`, `heartwood.png`).
Clean anime cel-shaded fantasy game art, confident dark-brown outlines, soft shading, layered cloth folds, expressive faces, full body. The new hero must look like part of the SAME cast: same line weight, same palette richness, same proportions (heads about 1/7 of the height), but a clearly different person, outfit and silhouette.
Heroes face **RIGHT**. Full body, feet visible, no ground shadow, no text, transparent background with no halo or fringe (check on a dark and on a light background).

## Method (consistency)
Generate the hero's FIRST idle picture (with the first weapon) from the description. Then make EVERY other picture of this hero (the attack, and the second weapon's idle and attack) in edit mode with that first picture as the reference, so the face, hair, outfit and colours stay identical; only the weapon and the pose change.
Icons: use the hero's weapon from the matching picture as the reference so icon and sprite show the same object.

## Canvas rules (so the pictures line up in the game)
Every picture of one hero is on the SAME canvas, with the feet at the horizontal centre (x = 50%) and at y = 97.46% of the height, the body at the same scale in all pictures. Canvas size (width x height) and standing figure height (feet to top of head, as a share of the canvas height):
- A Milo: **560 x 512**, figure about 86%.   - B Rook: **620 x 512**, figure about 89%.   - C Elric: **640 x 512**, figure about 90%.
- D Maren: **820 x 512**, figure about 94% (the spears reach far).   - E Tobin: **600 x 512**, figure about 88%.
Weapons and effects may reach out sideways but must stay fully inside the canvas (plan the pose so a long polearm tip is not cut off). Attack pictures: an unmistakable mid-action pose, feet in the same place as the idle.
Output PNG, losslessly optimised (I convert them to WebP afterwards).

## Icons: `C:\Temp\Game\assets\items\<id>.png`, 256 x 256 transparent PNG, the item centred with a little margin, NO text, NO hands, NO characters, no shadow. Weapons are shown diagonally (tip up and to the right) like the existing icons.

## Sections

### A: Milo Dunn: the starting hero (id `milo`, canvas 560 x 512)
An ordinary village farmhand of about 17, NOT strong-looking and NOT heroic: slim, a bit scruffy, messy brown hair, friendly unsure face, a plain cream linen shirt with rolled sleeves and a patched green-brown waistcoat, patched brown trousers, a rope belt, worn boots, a small canvas satchel. No armour, no gold trim, no cape. The weakest-looking one of the cast, but likeable.
- `milo-pitchfork-idle.png` / `milo-pitchfork-attack.png`: a plain wooden pitchfork. Idle: held upright beside him like a staff. Attack: a jabbing thrust forward.
- `milo-woodaxe-idle.png` / `milo-woodaxe-attack.png`: a wood-cutting axe. Idle: resting on his shoulder. Attack: an overhead chop.
- Icons: `pitchfork.png` (wooden three-tine pitchfork), `woodaxe.png` (a simple wood-cutting axe with a worn handle), `club.png` (a gnarled wooden club with a few iron nails).

### B: Rook: the rogue (id `rook`, canvas 620 x 512)
A lean, quick young rogue: tousled black hair, sharp friendly smirk, a teal-grey hooded cloak thrown back, a dark leather vest over a grey shirt, a scarf, belts with pouches, fingerless gloves, soft boots. Light and nimble silhouette.
- `rook-dagger-idle.png` / `rook-dagger-attack.png`: one curved dagger in a reverse grip. Attack: a quick slashing stab, cloak flaring.
- `rook-twindaggers-idle.png` / `rook-twindaggers-attack.png`: two daggers (one in each hand, matching the icon). Attack: a crossing double slash.
- Icons: `dagger.png` (a curved dagger with a dark leather grip and a gold pommel), `twindaggers.png` (two daggers crossed in an X).

### C: Elric Vane: the mage (id `elric`, canvas 640 x 512)
A slender young scholar mage: deep blue-violet robe with gold star embroidery and a high collar, round spectacles, short pale-blond hair, a satchel of scrolls, ink-stained fingers. Studious and a little proud.
- `elric-tome-idle.png` / `elric-tome-attack.png`: an open spellbook (a tome) held in one hand with a faint glow over the pages. Attack: the other hand thrust forward, a burst of fiery runes leaving the page.
- `elric-grimoire-idle.png` / `elric-grimoire-attack.png`: a big dark grimoire with red runes, floating open beside him. Attack: both hands raised, the grimoire flaring.
- Icons: `tome.png` (a blue leather spellbook with gold clasps and a star), `grimoire.png` (a large black book with glowing red runes and iron corners).

### D: Maren Ashe: the lancer (id `maren`, canvas 820 x 512)
A tall, disciplined lancer woman: long black braid, steel pauldrons and a light breastplate over a crimson-and-white tabard, leather bracers, greaves, a calm determined face.
- `maren-spear-idle.png` / `maren-spear-attack.png`: a long leaf-bladed spear. Idle: held upright at her side. Attack: a long, deep forward thrust with the spear fully extended.
- `maren-halberd-idle.png` / `maren-halberd-attack.png`: a halberd (axe blade, spike and hook on a long shaft). Attack: a wide overhead sweeping chop.
- Icons: `spear.png` (a leaf-bladed spear with a red tassel), `halberd.png` (a steel halberd with a carved shaft).

### E: Brother Tobin: the monk (id `tobin`, canvas 600 x 512)
A stocky, cheerful warrior monk: shaved head, a short beard, saffron-orange and brown robes with the sleeves tied back, prayer beads around the neck, bare calves, sandals. Broad and solid.
- `tobin-wraps-idle.png` / `tobin-wraps-attack.png`: fists in plain cloth hand wraps. Idle: a ready stance. Attack: a straight punch.
- `tobin-gauntlets-idle.png` / `tobin-gauntlets-attack.png`: iron-plated gauntlets with gold trim. Attack: a heavy uppercut with a small shockwave.
- Icons: `wraps.png` (a pair of rolled cloth hand wraps tied with a cord), `gauntlets.png` (a pair of iron gauntlets with gold trim).

## Files, scratch and checks
- Create only the files of your section: the hero PNGs in `C:\Temp\Game\assets\heroes\`, the icons in `C:\Temp\Game\assets\items\`, a measurement file `C:\Temp\Game\assets\hero-meta-<id>.json` with
  `{"<id>":{"frameW":..,"frameH":..,"feetX":0.5,"feetY":0.97461,"figureH":<the measured share of the canvas height the standing idle figure occupies, feet to top of head>}}`, and a contact sheet
  `C:\Temp\Game\assets-preview-hero-<id>.html` showing every picture on a dark and a light background with a line at the feet baseline (y = 97.46%) and the centre line, next to Bren's idle for scale. Do NOT edit any existing file.
- Scratch files go in `C:\Temp\Game\.art-scratch-<id>\` ONLY. If your sandbox forbids deleting scratch files, leave them.
- Verify every image by looking at it; regenerate bad ones (a different face or outfit between pictures, the wrong weapon, a cut-off weapon, wrong canvas size, wrong scale, halo, text, hands in icons).
- Finish with a list of the files and their sizes.
