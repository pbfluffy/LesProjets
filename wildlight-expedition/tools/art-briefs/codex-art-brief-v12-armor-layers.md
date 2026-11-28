# Art v12: armor layers for the heroes (generate bitmap images)

Wildlight Expedition heroes can now wear ARMOR (leather, chain, plate). Each armor is a **transparent layer** that the game draws on top of the hero's picture, exactly aligned to it, so the hero is seen wearing the armor.
You make the layers for ONE hero (the section letter you were started with: A to H): 3 armors x 2 poses = **6 layers**.
Use your built-in image generation tool for the armor pictures: do NOT draw armor with code and do not fake images. You may use code (Python with Pillow / numpy) only to measure, compare, cut out and save images. Other processes work on the other sections at the same time: do not touch their files or scratch folders.

## The base pictures (already redrawn in a simple outfit)
The hero's NEW base pictures are in `C:\Temp\Game\assets\heroes-v2\<hero>-<weapon>-<idle|attack>.png` (a plain cloth outfit: no armor). Each hero has several weapon pictures; they all share the same canvas, the same feet position and scale. The layers are made for the hero's FIRST weapon (given in the section) and the game draws the same layer over the pictures of the hero's other weapons, so the torso, shoulders and legs must line up with the body in ALL of that hero's pictures: look at the other weapon pictures to see how close the body is.

## What a layer is
- A transparent PNG with the **same canvas size as the base picture of the same pose**, containing ONLY the armor pieces, at exactly the place where they sit on the figure. Drawn over the base picture, the result must look like the hero wearing the armor, with the same pose, the same face and hair, the same weapon and hands.
- The armor pieces cover the clothes: they are fully opaque where they cover the outfit (the clothes must not show through) and the layer is transparent everywhere else. No ground shadow, no halo, no fringe, no text.
- The armor must NOT cover the face, hair, hands, fingers, or the weapon (the weapon and hands stay visible above the armor: if a hand or weapon is in front of the torso, leave that part of the layer transparent there).
- Pieces per armor: a chest piece (the main shape), shoulder pieces, upper-arm / forearm guards (bracers), a belt or waist piece, and lower-leg guards or boots where it suits the armor. No helmet: the head stays free so every hero keeps their face and hair.
- Style: exactly the style of the hero pictures (clean anime cel-shading, confident dark-brown outlines, soft shading, same line weight and palette richness). Armor should be recognisable at small size: strong shapes and clear materials.

## The three armors (same design language for all heroes, fitted to the hero's body and kept in the hero's signature colour for cloth parts)
- `leatherarmor`: a brown leather cuirass with stitched seams, leather shoulder straps and pads, leather bracers, a buckled belt. Warm brown, no metal except small buckles and rivets.
- `chainmail`: a steel chainmail hauberk (visible ring mesh) with short sleeves, a dark leather collar and belt, steel-grey vambraces. Cool grey with a little blue.
- `platearmor`: a polished steel breastplate, two rounded pauldrons, steel bracers and greaves, gold trim at the edges, a short cloth strip in the hero's signature colour under the chest plate. Bright steel and gold.

## Method (so the layer lines up perfectly)
1. For each armor and pose, take the hero's first-weapon base picture of that pose and make the full picture of the same figure wearing the armor in EDIT mode (same pose, face, hair, weapon, hands, camera, canvas, feet position and scale; ONLY the armor is added over the clothes). Check that nothing else changed.
2. Cut the layer out: compare the armored picture with the base picture (same canvas) and keep only the armor pixels (where the armored picture clearly differs from the base, cleaned up: remove specks, fill small holes inside armor pieces, no change to the face, hair, hands or weapon, smooth the edge). The layer's pixels are the armored picture's pixels. Everything else is fully transparent. Alpha edges must be clean (no white or dark fringe).
3. Verify: put each layer over the base picture (on a dark and a light background) and look at it: the hero must look like they wear the armor, with no clothes poking through, nothing missing, nothing floating. Also put the layer over the hero's OTHER weapon pictures of the same pose and check it still looks right (small mismatches are acceptable, big ones are not: if the other pictures differ a lot, say so).
4. Redo bad ones. Make the three armors clearly different from each other at a glance, and the plate armor the most impressive.

## Output
- `C:\Temp\Game\assets\armor\<hero>-<armor>-<idle|attack>.png` AND `.webp` next to it (same name, quality 92, alpha kept), for armor in leatherarmor, chainmail, platearmor. Same canvas size as the matching base picture.
- A contact sheet `C:\Temp\Game\assets-preview-armor-<id>.html`: for each armor and pose, the base picture, the layer alone on a checkerboard, and the layer over the base, plus the layer over each of the hero's other weapon pictures of that pose, all at a size that shows the details.
- Do NOT edit or overwrite any existing file. Scratch files go in `C:\Temp\Game\.art-scratch-v3-<id>\` ONLY.
- Finish with a list of the files and their sizes, and an honest note about how well the layers fit the other weapon pictures.

## Sections (hero, id, the first weapon whose pictures you start from)
A Bren (`bren`, `sword`) · B Tavi (`tavi`, `bow`) · C Iona (`iona`, `staff`) · D Milo (`milo`, `pitchfork`) · E Rook (`rook`, `dagger`) · F Elric (`elric`, `tome`) · G Maren (`maren`, `spear`) · H Tobin (`tobin`, `wraps`)
Hero notes: Tavi has a quiver on the back (keep it visible: leave it out of the layer); Elric's tome and floating book effects stay uncovered; Tobin is a monk with bare arms: his armor is light (open chest piece, bracers); Iona is a healer in a long dress: her armor is fitted over the dress bodice and sleeves only, the skirt stays free.
