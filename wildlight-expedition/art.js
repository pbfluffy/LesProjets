/* Wildlight Expedition · Canvas art. Sprite paths are built once in local coordinates. */
const artInk = '#221f24';
const artDefaultSky = ['#2d5a45', '#14301f'];

function artPaths(shapes) {
  for (const name of Object.keys(shapes)) shapes[name] = new Path2D(shapes[name]);
  return shapes;
}

function artFill(c, path, color) {
  c.fillStyle = color;
  c.fill(path);
}

function artShape(c, path, color) {
  artFill(c, path, color);
  c.strokeStyle = artInk;
  c.lineWidth = 1.7;
  c.stroke(path);
}

function artLine(c, path, color, width) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke(path);
}

function artOval(c, x, y, rx, ry, color, angle = 0) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  c.fill();
}

const artBlade = artPaths({
  sword: 'M3 -3.5 22 -3.5 30 0 22 3.5 3 3.5Z',
  swordLight: 'M4 -2.8 22 -2.8 28 0 4 0Z',
  short: 'M3 -3 17 -3 24 0 17 3 3 3Z',
  shortLight: 'M4 -2.3 17 -2.3 22 0 4 0Z',
  great: 'M5 -5.8 11 -5.8 14 -4.4 41 -4.4 50 0 41 4.4 14 4.4 11 5.8 5 5.8Z',
  greatLight: 'M6 -5 11 -5 14 -3.7 41 -3.7 48 0 6 0Z',
  hilt: 'M-9 -2 H1 L3 -6 6 -7 5 0 6 7 3 6 1 2 H-9 L-11 0Z',
  grip: 'M-8 -1 V1 M-5 -1 V1 M-2 -1 V1'
});

function artSingleSword(c, kind) {
  const great = kind === 'great';
  const short = kind === 'twin';
  artShape(c, great ? artBlade.great : short ? artBlade.short : artBlade.sword, '#829ba7');
  artFill(c, great ? artBlade.greatLight : short ? artBlade.shortLight : artBlade.swordLight, '#d6e9e8');
  c.save();
  if (great) c.scale(1.3, 1.2);
  artShape(c, artBlade.hilt, '#b78648');
  artLine(c, artBlade.grip, '#634638', 1.3);
  c.restore();
}

function drawSword(c, kind) {
  c.save();
  c.lineJoin = 'round';
  if (kind === 'twin') {
    c.rotate(-0.32);
    artSingleSword(c, kind);
    c.rotate(0.64);
  }
  artSingleSword(c, kind);
  c.restore();
}

const artBren = artPaths({
  boots: 'M-13 -16 -3 -16 -3 -5 0 -1 Q-4 2 -15 0 L-15 -4Z M5 -16 14 -18 15 -6 21 -3 20 0 H4Z',
  cloak: 'M-18 -36 Q-7 -43 10 -37 L15 -28 11 -17 12 -9 Q-5 -4 -23 -9 L-25 -15Z',
  cloakLight: 'M-19 -34 -10 -33 -13 -18 -21 -10 -23 -13Z',
  cloakHem: 'M-22 -13 Q-7 -8 9 -12',
  coat: 'M-9 -35 Q5 -42 16 -32 L17 -13 9 -10 -8 -12 -13 -21Z',
  coatLight: 'M-7 -33 4 -36 12 -31 8 -19 -5 -19Z',
  belt: 'M-10 -18 Q3 -16 16 -20 L17 -15 Q2 -11 -10 -14Z',
  buckle: 'M-3 -17 H2 V-13 H-3Z',
  farArm: 'M-10 -33 Q-17 -34 -17 -27 L-20 -23 -25 -26 -28 -21 -22 -16 -16 -16 -10 -24Z',
  face: 'M-7 -53 Q-4 -59 6 -56 L11 -51 11 -47 14 -43 10 -41 9 -36 0 -35 -6 -40Z',
  hair: 'M-8 -42 -12 -47 -11 -56 -6 -60 3 -61 10 -58 13 -53 6 -51 -3 -52 -4 -45Z',
  hairLight: 'M-9 -55 -5 -58 3 -59 10 -56',
  beard: 'M2 -44 5 -40 10 -42 10 -37 5 -33 -2 -36 -5 -42 -3 -46Z',
  eye: 'M7 -48 10 -49',
  arm: 'M-4 -31 Q2 -34 6 -28 L14 -23 23 -25 25 -20 14 -16 3 -20Z',
  guard: 'M-18 -42 -6 -42 0 -37 -2 -28 -17 -27 -22 -32 -22 -38Z',
  guardLight: 'M-19 -38 -17 -40 -7 -40 -2 -36 -5 -33 -18 -33Z',
  lantern: 'M-2 -5 Q-2 -9 0 -9 Q3 -9 3 -5 M-4 -5 H4 L5 4 3 6 H-3 L-5 4Z',
  glass: 'M-2.7 -3 H2.7 L3.2 3.4 H-3.2Z',
  flame: 'M-1.7 3 Q-3 1 -0.1 -2 Q-0.1 0 1 0 Q3 3 0 3.6Z'
});

function artDrawBren(c, t, swing, brace, weapon) {
  artShape(c, artBren.boots, '#443433');
  c.save();
  if (brace) {
    c.translate(2, 5);
    c.scale(1.06, 0.88);
  }
  c.save();
  c.translate(-9, -35);
  c.rotate(Math.sin(t * 3.6) * 0.045 - swing * 0.16);
  c.translate(9, 35);
  artShape(c, artBren.cloak, '#b8772b');
  artFill(c, artBren.cloakLight, '#db9f43');
  artLine(c, artBren.cloakHem, '#edb65b', 1.4);
  c.restore();

  if (weapon === 'twin') {
    artShape(c, artBren.farArm, '#966333');
    c.save();
    c.translate(-26, -23);
    c.rotate(-1.98 + swing * 0.8);
    artSingleSword(c, 'twin');
    artOval(c, 0, 0, 3, 3, '#d59c6a');
    c.restore();
  }
  artShape(c, artBren.coat, '#68574a');
  artFill(c, artBren.coatLight, '#867766');
  artShape(c, artBren.belt, '#483332');
  artFill(c, artBren.buckle, '#d3a662');

  c.save();
  c.translate(11, -12);
  c.rotate(Math.sin(t * 5) * 0.12 - swing * 0.25);
  artOval(c, 0, 0, 8 + Math.sin(t * 11), 8, '#ffc66e36');
  artShape(c, artBren.lantern, '#795036');
  artFill(c, artBren.glass, '#dc8f40');
  c.translate(Math.sin(t * 13) * 0.45, 0);
  artFill(c, artBren.flame, '#fff0a5');
  c.restore();

  artShape(c, artBren.face, '#e8ae7a');
  artShape(c, artBren.hair, '#513833');
  artLine(c, artBren.hairLight, '#916249', 1.4);
  artFill(c, artBren.beard, '#654332');
  artLine(c, artBren.eye, '#3c2827', 1.4);

  c.save();
  c.translate(0, -28);
  c.rotate((brace ? 0.4 : 0) + swing * 0.62);
  c.translate(0, 28);
  artShape(c, artBren.arm, '#a96931');
  c.save();
  c.translate(23, -22);
  c.rotate((brace ? -0.52 : weapon === 'great' ? -1.43 : -1.05) + swing * 1.20);
  artSingleSword(c, weapon);
  artOval(c, 0, 0, 3.2, 3.3, '#e2ac78');
  c.restore();
  c.restore();
  artShape(c, artBren.guard, '#819196');
  artFill(c, artBren.guardLight, '#bdcecc');
  artOval(c, -17.5, -31, 1, 1, '#d5dfd9');
  c.restore();
}

const artTavi = artPaths({
  boots: 'M-10 -26 -1 -23 -2 -9 -1 -1 -13 1 -14 -2 -9 -8Z M2 -24 11 -25 10 -7 16 -3 15 0 4 0 3 -7Z',
  arrow: 'M0 3 V-18 M-2.6 -16 L0 -23 2.6 -19 0 -13Z',
  quiver: 'M-5 -3 H6 L3 26 Q1 29 -4 26Z',
  quiverFold: 'M-4 0 H5 M-4 15 4 14',
  coat: 'M-9 -36 Q1 -42 11 -32 L12 -19 16 -10 4 -6 -1 -12 -9 -7 -15 -12 -10 -28Z',
  coatLight: 'M-8 -34 -2 -32 -4 -19 -10 -13 -12 -14Z',
  strap: 'M-10 -35 Q-6 -28 10 -21 M-11 -19 Q-2 -17 11 -20',
  hood: 'M-17 -49 -19 -65 Q-12 -62 -1 -59 Q9 -56 14 -47 L10 -40 2 -35 -12 -37 -15 -44Z',
  hoodLight: 'M-17 -62 Q-9 -60 0 -56 Q8 -54 12 -47 L6 -49 -7 -50 -13 -45Z',
  face: 'M2 -49 Q8 -51 12 -46 L15 -43 11 -41 8 -37 0 -39 -2 -44Z',
  eye: 'M7 -46 10 -46.5',
  shoulder: 'M-14 -38 -5 -42 4 -38 1 -34 -10 -31Z',
  bow: 'M-3 -19 Q-2 -14 2 -11 Q9 -3 6 3 Q5 7 2 11 Q-2 16 -3 19',
  bowLight: 'M-2 -16 Q2 -12 5 -7 M5 7 Q2 12 -1 16'
});

function artDrawTavi(c, lean, swing, t) {
  artShape(c, artTavi.boots, '#443d36');
  c.save();
  c.translate(0, -7);
  c.rotate(-0.33 * lean + 0.04 * swing);
  c.translate(0, 7);

  c.save();
  c.translate(-14, -39);
  c.rotate(-0.26 + Math.sin(t * 3) * 0.035);
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate((i - 1) * 4, (i === 1 ? -4 : 1));
    c.rotate((i - 1) * 0.15);
    artFill(c, artTavi.arrow, '#efe4bf');
    artLine(c, artTavi.arrow, '#efe4bf', 0.9);
    c.restore();
  }
  artShape(c, artTavi.quiver, '#84583e');
  artLine(c, artTavi.quiverFold, '#c68d55', 1.7);
  c.restore();

  artShape(c, artTavi.coat, '#386651');
  artFill(c, artTavi.coatLight, '#599071');
  artLine(c, artTavi.strap, '#bd9464', 2.7);
  artShape(c, artTavi.hood, '#2c5d48');
  artFill(c, artTavi.hoodLight, '#59966f');
  artShape(c, artTavi.face, '#d79f78');
  artLine(c, artTavi.eye, '#3c2827', 1.4);
  artShape(c, artTavi.shoulder, '#487c60');

  const bx = 24 + lean * 2 + swing * 3;
  const by = -29;
  const pull = bx - 6 - lean * 22;
  c.beginPath();
  c.moveTo(3, -32);
  c.lineTo(12, -27);
  c.lineTo(bx + 6, by);
  c.moveTo(-6, -34);
  c.lineTo(-3 - lean * 7, -24 - lean * 4);
  c.lineTo(pull, by);
  c.strokeStyle = artInk;
  c.lineWidth = 6.5;
  c.stroke();
  c.strokeStyle = '#537959';
  c.lineWidth = 4;
  c.stroke();

  c.beginPath();
  c.moveTo(bx - 3, by - 19);
  c.lineTo(pull, by);
  c.lineTo(bx - 3, by + 19);
  c.strokeStyle = '#ece4c6';
  c.lineWidth = 1;
  c.stroke();
  if (lean > 0.16) {
    c.fillStyle = '#f1d89a';
    c.fillRect(pull, by - 1, bx + 13 - pull, 1.6);
    artOval(c, bx + 13, by - 0.15, 2.8, 1.3, '#d7e6e1');
  }
  c.save();
  c.translate(bx, by);
  artLine(c, artTavi.bow, artInk, 5);
  artLine(c, artTavi.bow, '#b47946', 3);
  artLine(c, artTavi.bowLight, '#e0ac62', 1.5);
  c.restore();
  artOval(c, bx + 6, by, 3, 2.6, '#d79f78');
  artOval(c, pull, by, 2.5, 2.1, '#d79f78');
  c.restore();
}

const artIona = artPaths({
  boots: 'M-11 -12 H-4 V-5 L-1 -2 -2 0 H-13 L-14 -3Z M5 -12 H12 L13 -5 17 -2 16 0 H5Z',
  skirt: 'M-10 -30 H12 L13 -18 20 -7 Q5 -3 -5 -6 L-8 -8 -17 -7 -14 -17Z',
  skirtLight: 'M-9 -22 -2 -21 -6 -8 -13 -9Z',
  hair: 'M-13 -49 Q-14 -58 -6 -60 Q6 -63 12 -53 L9 -42 3 -36 -13 -39Z',
  bun: 'M-9 -50 Q-19 -49 -18 -56 Q-18 -63 -12 -63 Q-7 -62 -6 -57Z',
  face: 'M-7 -53 Q3 -57 8 -51 L11 -46 8 -44 7 -40 1 -37 -7 -40 -8 -45Z',
  fringe: 'M-11 -48 -12 -53 Q-10 -60 -4 -60 Q6 -61 10 -53 Q5 -54 3 -56 Q0 -50 -8 -48Z',
  eye: 'M5 -48 8 -48.5',
  shawl: 'M-22 -30 Q-23 -40 -11 -44 Q-3 -39 7 -42 Q18 -41 21 -32 Q23 -24 12 -23 Q6 -15 -6 -18 Q-17 -17 -22 -30Z',
  shawlLight: 'M-20 -31 Q-21 -39 -12 -42 Q-3 -37 7 -40 Q16 -39 18 -33 Q10 -35 4 -30 Q-7 -23 -20 -31Z',
  hem: 'M-19 -29 Q-16 -20 -7 -21 M-5 -21 Q5 -19 11 -25',
  arm: 'M11 -32 18 -29 23 -29 27 -32 29 -27 25 -24 17 -23 11 -26Z',
  staff: 'M-3 -2 Q2 -13 -1 -25 Q-3 -35 2 -42 Q7 -49 5 -54 L1 -62 -3 -65 -8 -62',
  staffTwist: 'M-2 -5 Q1 -14 -1 -22 M0 -38 Q0 -40 3 -44 M5 -51 Q6 -53 2 -59',
  wrap: 'M-1 -44 6 -41 M-2 -47 6 -44 M0 -50 7 -47',
  sprigs: 'M2 -44 Q-4 -46 -7 -54 M3 -45 Q2 -51 0 -55 M4 -45 Q9 -49 10 -55',
  star: 'M0 -6 Q1 -1 6 0 Q1 1 0 6 Q-1 1 -6 0 Q-1 -1 0 -6Z'
});

function artDrawIona(c, t, cast) {
  artShape(c, artIona.boots, '#443449');
  artShape(c, artIona.skirt, '#665875');
  artFill(c, artIona.skirtLight, '#857294');
  artShape(c, artIona.bun, '#815246');
  artShape(c, artIona.hair, '#5a3a3a');
  artShape(c, artIona.face, '#e2ae88');
  artFill(c, artIona.fringe, '#754b3f');
  artLine(c, artIona.eye, '#442a31', 1.4);
  artShape(c, artIona.shawl, '#a087bb');
  artFill(c, artIona.shawlLight, '#cfb5df');
  artLine(c, artIona.hem, '#e7cee8', 1.4);
  artOval(c, 8, -34, 2.6, 2.7, '#6e517d');
  artOval(c, 8, -34, 1.4, 1.5, '#f3ca80');

  c.save();
  c.translate(29 + cast * 3, 0);
  c.rotate(-cast * 0.26);
  artLine(c, artIona.staff, artInk, 5.5);
  artLine(c, artIona.staff, '#90603d', 3.7);
  artLine(c, artIona.staffTwist, '#db9d63', 1.4);
  artLine(c, artIona.sprigs, '#8e8b56', 1.5);
  artLine(c, artIona.wrap, '#e5bf89', 1.4);
  artOval(c, -7, -54, 2.4, 3, '#dca39b', -0.5);
  artOval(c, 0, -55.5, 2.4, 3.1, '#e9ca84');
  artOval(c, 10, -55, 2.3, 3, '#d9a9bb', 0.5);
  if (cast > 0.08) {
    c.globalAlpha *= cast;
    artOval(c, -6, -64, 8 + Math.sin(t * 17), 8, '#d1affe65');
    c.translate(-6, -65);
    artFill(c, artIona.star, '#f6eaff');
  }
  c.restore();
  artShape(c, artIona.arm, '#9b80b8');
  artOval(c, 28 + cast * 2, -29, 3, 2.8, '#e2ae88');
}

function drawHero(c, id, x, y, o) {
  const t = o.t || 0;
  const swing = o.dead ? 0 : o.swing || 0;
  const phase = id === 'bren' ? 0 : id === 'tavi' ? 1 : 2;
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  artOval(c, 0, 2, id === 'bren' ? 23 : 19, 4, '#1a151662');
  if (o.dead) {
    c.globalAlpha *= 0.48;
    c.translate(4, -7);
    c.rotate(-1.44);
    c.translate(0, 5);
  } else {
    c.translate(o.hit > 0 ? -1.8 + Math.sin(t * 62) : 0, Math.sin(t * 3 + phase) * 0.8);
    if (o.hit > 0) c.filter = 'brightness(1.35)';
  }
  if (id === 'bren') artDrawBren(c, t, swing, !o.dead && o.brace, o.weapon);
  else if (id === 'tavi') artDrawTavi(c, o.dead ? 0 : o.lean || 0, swing, t);
  else artDrawIona(c, t, swing);
  c.restore();
}

const artFox = artPaths({
  tail: 'M-11 1 -19 8 -23 7 -33 12 -30 6 -42 8 -38 3 -49 1 -41 -2 -45 -6 -33 -5 -37 -11 -25 -7 -26 -12 -12 -6 0 -4Z',
  tailLight: 'M-45 1 -34 1 -37 -3 -27 0 -30 -6 -21 -1 -20 -5 -9 0 -19 3 -29 4 -26 2Z',
  legs: 'M-20 -14 -11 -13 -16 -5 -15 -1 -7 -1 -7 2 -20 2 -22 -3Z M6 -15 17 -13 16 -4 22 -1 22 2 H12 L9 -2Z',
  body: 'M-23 -10 Q-26 -18 -20 -23 Q-8 -28 10 -25 L18 -16 13 -9 5 -6 -9 -7 -15 -4 -23 -7Z',
  back: 'M-22 -17 Q-19 -24 -8 -24 L6 -23 1 -17 -11 -15 -17 -12Z',
  mane: 'M-1 -22 -3 -32 4 -28 7 -35 10 -28 16 -34 18 -27 25 -28 24 -16 18 -8 10 -7 12 -11 4 -8 7 -14 -1 -13 3 -18Z',
  maneLight: 'M1 -26 5 -23 8 -30 11 -23 16 -29 17 -23 22 -25 20 -19 11 -15 7 -16 9 -21 3 -20Z',
  head: 'M13 -22 15 -32 22 -27 26 -29 27 -22 30 -19 37 -16 36 -12 28 -9 19 -10 14 -15Z',
  muzzle: 'M20 -15 25 -16 35 -15 35 -12 28 -10 22 -12Z',
  ear: 'M16 -29 20 -25 16 -23Z',
  nose: 'M34 -17 38 -16 36 -13 33 -15Z'
});

function artDrawFox(c, t, wind, lunge) {
  c.scale(1 + wind * 0.15, 1 - wind * 0.39 + Math.min(lunge, 34) * 0.004);
  c.save();
  c.translate(-19, -16);
  c.rotate(Math.sin(t * 5) * 0.11 - wind * 0.22);
  c.translate(19, 0);
  artShape(c, artFox.tail, '#4b6350');
  artFill(c, artFox.tailLight, '#749064');
  c.restore();
  artShape(c, artFox.legs, '#743f33');
  artShape(c, artFox.body, '#a8613e');
  artFill(c, artFox.back, '#c88249');
  artShape(c, artFox.mane, '#b35032');
  artFill(c, artFox.maneLight, '#db8450');
  artShape(c, artFox.head, '#ba7045');
  artFill(c, artFox.muzzle, '#edcf98');
  artFill(c, artFox.ear, '#e29b69');
  artFill(c, artFox.nose, artInk);
  artOval(c, 26, -19.3, 2.2, 1.65, artInk);
  artOval(c, 26.5, -19.6, 0.95, 0.65, '#f9d587');
}

const artBeetle = artPaths({
  legs: 'M-16 -13 -22 -6 -24 0 -18 1 -16 -6 -10 -9Z M-6 -11 -9 -4 -8 1 -2 1 -3 -5 2 -9Z M9 -12 12 -5 18 -2 18 1 13 1 7 -3 4 -9Z',
  head: 'M15 -18 Q26 -21 31 -14 L34 -9 30 -5 19 -5 15 -9Z',
  plates: 'M-27 -8 Q-28 -17 -20 -23 Q-10 -32 4 -29 Q17 -28 24 -18 L25 -11 Q11 -3 -12 -4 L-23 -5Z',
  middle: 'M-17 -6 Q-18 -21 -7 -29 Q0 -31 8 -28 Q-1 -25 -3 -16 L-1 -5 Q-10 -3 -17 -6Z',
  front: 'M-1 -5 Q-6 -17 4 -25 Q10 -29 17 -23 Q24 -20 25 -12 Q18 -7 -1 -5Z',
  shine: 'M-23 -16 Q-19 -23 -11 -25 M-14 -17 Q-12 -23 -7 -25 M1 -18 Q5 -24 12 -23',
  iron: 'M-20 -15 -17 -17 -15 -14 -17 -12Z M-11 -21 -8 -22 -7 -20 -10 -18Z M-8 -12 -5 -13 -4 -10 -7 -9Z M7 -20 10 -21 11 -19 9 -17Z M15 -15 19 -16 20 -14 17 -12Z',
  antennae: 'M-5 3 Q-4 -7 -7 -12 L-10 -16 M0 3 Q3 -6 6 -8 L10 -8',
  jaw: 'M28 -7 34 -8 36 -11'
});

function artDrawBeetle(c, t, wind) {
  c.rotate(-wind * 0.26);
  artShape(c, artBeetle.legs, '#533e37');
  c.save();
  c.translate(29, -14);
  c.rotate(Math.sin(t * 4.5) * 0.09 - wind * 0.25);
  artLine(c, artBeetle.antennae, artInk, 3.8);
  artLine(c, artBeetle.antennae, '#e5d7af', 1.9);
  artOval(c, -10, -16, 1.8, 1.5, '#eddfb8');
  artOval(c, 10, -8, 1.8, 1.5, '#eddfb8');
  c.restore();
  artShape(c, artBeetle.head, '#6e4b41');
  artOval(c, 28, -12.5, 2.2, 1.6, '#e8bd7e');
  artLine(c, artBeetle.jaw, '#926b54', 1.45);
  artShape(c, artBeetle.plates, '#955938');
  artShape(c, artBeetle.middle, '#b2744b');
  artShape(c, artBeetle.front, '#bc7950');
  artLine(c, artBeetle.shine, '#e1a070', 1.65);
  artFill(c, artBeetle.iron, '#b5b4a6');
}

const artSpitter = artPaths({
  feet: 'M-12 -8 H-4 L-4 -4 -2 -1 -4 2 H-13 L-15 0Z M6 -8 H12 L14 -3 18 -1 17 2 H8 L6 -2Z',
  body: 'M-16 -21 Q-16 -36 3 -35 Q17 -34 18 -21 Q23 -4 7 -2 Q-14 1 -17 -12Z',
  chest: 'M-10 -15 Q-11 -27 1 -28 Q13 -31 15 -17 Q19 -7 9 -5 Q-6 -2 -10 -15Z',
  mouth: 'M0 -9 Q-6 -6 -6 0 Q-5 7 0 9 Q6 6 6 0 Q5 -6 0 -9Z',
  cap: 'M-24 4 Q-21 -12 -9 -14 Q7 -17 18 -7 L25 4 Q21 12 0 10 Q-18 10 -24 4Z',
  capLight: 'M-20 1 Q-17 -10 -7 -12 Q6 -14 15 -7 Q8 -8 1 -5 Q-8 -1 -20 1Z',
  brim: 'M-23 4 Q-12 0 4 2 Q19 3 24 4 Q20 10 0 9 Q-18 9 -23 4Z',
  gills: 'M-15 4 -11 7 M-9 4 -5 8 M-2 4 1 8 M5 4 8 8 M13 5 15 7'
});

function artDrawSpitter(c, t, wind) {
  artShape(c, artSpitter.feet, '#665244');
  c.save();
  c.scale(1 + wind * 0.38, 1 + wind * 0.22);
  artShape(c, artSpitter.body, '#bca77b');
  artFill(c, artSpitter.chest, '#e7d5a4');
  artOval(c, -6, -19, 2, 2.3, artInk);
  artOval(c, 12, -22, 1.65, 2.1, artInk);
  c.save();
  c.translate(6, -16);
  c.scale(0.77 + wind * 0.37, 0.7 + wind * 0.38);
  c.rotate(0.22);
  artShape(c, artSpitter.mouth, '#a67a53');
  artOval(c, 0, -0.8, 3.9, 6, '#362733');
  artOval(c, 0.7, 2.8, 2.1, 1.45, '#775148');
  c.restore();

  c.translate(-2, -32);
  c.rotate(-0.24 + Math.sin(t * 4) * 0.04 + wind * 0.16);
  artShape(c, artSpitter.cap, '#c3873b');
  artFill(c, artSpitter.capLight, '#eab65c');
  artOval(c, -10, -7, 2.7, 1.45, '#f2cb80', -0.35);
  artOval(c, 7, -6, 3.7, 1.8, '#a56436', 0.4);
  artOval(c, 15, -2.5, 2.6, 1.4, '#a56436', 0.5);
  artShape(c, artSpitter.brim, '#aa6c3a');
  artLine(c, artSpitter.gills, '#e3af63', 1.2);
  c.restore();
}

const artBoar = artPaths({
  dustTrail: 'M37 1 H65 M48 5 H75 M60 -2 H73',
  dustChip: 'M-3 1 -1 -2 3 -1 2 1Z',
  tail: 'M-38 -39 Q-49 -34 -49 -42 Q-47 -47 -44 -43',
  farLegs: 'M-31 -22 H-19 L-21 -2 -26 1 H-34 L-33 -5Z M5 -22 H18 L18 -3 14 0 H6 L7 -5Z',
  nearLeg: 'M-3 -2 H8 L9 10 6 17 H-5 L-5 13 -2 10Z',
  hoof: 'M-5 13 0 12 7 12 6 17 H-5Z',
  backLeg: 'M-25 -25 H-11 L-11 -14 -17 -7 -17 1 H-29 L-29 -4 -26 -9Z',
  roots: 'M-42 -43 -44 -56 -36 -50 -36 -64 -31 -56 -25 -55 -27 -69 -21 -63 -17 -70 -15 -60 -10 -59 -7 -74 -2 -65 3 -68 4 -59 10 -59 17 -72 18 -62 25 -66 23 -56 31 -58 31 -47 23 -36 -25 -36Z',
  rootLight: 'M-38 -51 -37 -47 -28 -48 -23 -57 -18 -52 -11 -53 -6 -64 -3 -57 6 -54 13 -57 17 -62 M21 -53 28 -53',
  body: 'M-47 -32 Q-47 -49 -32 -55 Q-24 -61 -2 -59 Q20 -62 34 -49 Q43 -40 37 -24 Q30 -9 5 -9 L-20 -11 Q-42 -12 -47 -32Z',
  back: 'M-44 -37 Q-39 -54 -23 -55 Q-7 -59 7 -56 Q17 -56 25 -51 Q5 -51 -5 -40 Q-22 -29 -43 -32Z',
  flank: 'M-39 -26 Q-24 -25 -13 -33 Q-3 -36 7 -37 Q0 -30 0 -20 Q-19 -13 -32 -17Z',
  bristles: 'M-29 -48 -32 -42 M-21 -51 -24 -44 M-13 -51 -16 -45 M-31 -29 -35 -26 M-24 -30 -28 -27',
  head: 'M-10 -3 Q-11 -14 2 -18 Q12 -21 20 -14 L28 -7 38 -6 41 0 38 9 27 11 19 17 Q9 21 0 16 L-8 9Z',
  faceLight: 'M-7 -10 Q2 -18 12 -16 Q22 -13 27 -7 L32 -5 22 -1 13 -3 8 1 1 -1Z',
  ear: 'M-6 -8 Q-13 -19 -10 -26 Q0 -24 7 -15 L1 -8Z',
  innerEar: 'M-8 -22 Q-1 -21 2 -15 L-3 -13Z',
  snout: 'M30 -6 Q36 -9 41 -5 L43 0 41 8 Q36 11 29 9 L26 5Z',
  farTusk: 'M25 7 Q43 10 48 -4 Q50 11 39 15 Q32 17 24 13Z',
  tusk: 'M11 9 Q23 17 34 12 Q42 8 46 0 Q45 14 36 20 Q24 25 13 18Z',
  tuskLight: 'M15 12 Q28 20 39 10',
  brow: 'M10 -8 20 -9 23 -7'
});

function artDrawBoar(c, t, wind, scrape) {
  const rake = Math.sin(t * 25);
  if (scrape > 0) {
    c.save();
    c.globalAlpha *= 0.49 + scrape * 0.45;
    artLine(c, artBoar.dustTrail, '#e0b078', 1.7);
    for (let i = 0; i < 5; i++) {
      const age = (t * 2.7 + i * 0.2) % 1;
      c.save();
      c.translate(43 + age * 32, 2 - age * (11 + scrape * 15));
      c.rotate(age * (3 + i));
      c.scale(1 + age * 0.45, 1 + age * 0.45);
      c.globalAlpha *= 1 - age * 0.75;
      artFill(c, artBoar.dustChip, i % 2 ? '#fdc984' : '#cf9764');
      c.restore();
    }
    c.restore();
  }

  artLine(c, artBoar.tail, artInk, 4);
  artLine(c, artBoar.tail, '#6b737c', 2.1);
  artShape(c, artBoar.farLegs, '#434651');
  artShape(c, artBoar.roots, '#635147');
  artLine(c, artBoar.rootLight, '#a4815e', 1.8);
  artShape(c, artBoar.body, '#636e7a');
  artFill(c, artBoar.back, '#88949c');
  artFill(c, artBoar.flank, '#545d69');
  artLine(c, artBoar.bristles, '#a0a8a9', 1.2);
  artShape(c, artBoar.backLeg, '#5a616e');

  c.save();
  c.translate(24 + rake * scrape * 4, -17 - Math.max(0, rake) * scrape * 5);
  c.rotate(-scrape * (0.32 + rake * 0.68));
  artShape(c, artBoar.nearLeg, '#626b76');
  artFill(c, artBoar.hoof, '#3b3a44');
  c.restore();

  c.save();
  c.translate(34, -34 + scrape * 8 + wind * 2);
  c.rotate(0.03 + scrape * 0.49 + wind * 0.13);
  artShape(c, artBoar.farTusk, '#cdbb97');
  artShape(c, artBoar.head, '#707a84');
  artFill(c, artBoar.faceLight, '#89969c');
  artShape(c, artBoar.ear, '#59616c');
  artFill(c, artBoar.innerEar, '#a18382');
  artShape(c, artBoar.snout, '#525864');
  artOval(c, 38.6, -0.6, 1.6, 2.05, artInk);
  artOval(c, 35, -3.4, 2.4, 0.75, '#969b9d');
  artShape(c, artBoar.tusk, '#f4e4bf');
  artLine(c, artBoar.tuskLight, '#ffefd4', 1.45);
  artOval(c, 17, -6, 2.7, 1.95, '#352832');
  artOval(c, 17.8, -5.8, scrape > 0 ? 1.75 : 1.05, 1.05, '#ffad68');
  artLine(c, artBoar.brow, '#454651', 2.1);
  c.restore();
}

function drawMon(c, type, x, y, o) {
  const t = o.t || 0;
  const wind = o.dead ? 0 : o.wind || 0;
  const lunge = o.lunge || 0;
  const fade = o.dead ? Math.max(0, 1 - (o.fade || 0) * 1.5) : 1;
  if (fade === 0) return;
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.globalAlpha *= fade;
  artOval(c, -lunge, 2, type === 'boar' ? 40 : 24, type === 'boar' ? 5.5 : 4, '#1a151662');
  // As in the game, build right-facing shapes and mirror them at their feet.
  c.scale(-1, 1);
  c.translate(lunge, o.dead ? 0 : Math.sin(t * 4 + x) * (type === 'boar' ? 0.45 : 0.9));
  if (o.dead) c.rotate(0.18);
  if (o.flash > 0) c.filter = 'brightness(1.6)';
  if (type === 'brushfang') artDrawFox(c, t, wind, lunge);
  else if (type === 'beetle') artDrawBeetle(c, t, wind);
  else if (type === 'spitter') artDrawSpitter(c, t, wind);
  else if (type === 'boar') artDrawBoar(c, t, wind, o.dead ? 0 : o.scrape || 0);
  c.restore();
}

const artLand = artPaths({
  ridge: 'M0 111 33 96 67 92 105 108 142 83 163 77 183 91 205 84 235 99 260 77 281 66 310 80 334 79 363 99 400 87V150H0Z',
  mist: 'M0 120 Q84 105 146 121 T278 119 Q350 103 400 111 V127 Q337 118 276 134 Q222 145 147 134 T0 139Z',
  distantGround: 'M0 147 35 142 81 147 119 140 166 146 207 141 248 147 294 140 334 143 372 137 400 141 V167H0Z',
  road: 'M0 160 Q59 153 116 159 T227 157 Q316 143 400 154 V247 Q350 238 300 245 T178 246 Q80 255 0 234Z',
  track: 'M0 188 Q104 166 206 184 T400 177 V185 Q318 201 214 191 T0 194Z M0 217 Q62 224 133 216 T267 214 Q343 219 400 202 V206 Q351 225 270 222 T130 224 Q66 233 0 224Z',
  lip: 'M0 237 Q64 250 145 246 Q221 238 310 244 Q366 246 400 233 V260H0Z',
  stones: 'M14 233 23 229 34 232 29 235Z M47 171 53 168 62 169 57 172Z M107 249 113 245 122 245 128 248Z M138 196 146 193 153 195 146 197Z M238 235 247 231 256 233 252 236Z M298 166 305 163 316 164 311 167Z M339 241 346 236 357 237 353 241Z M372 220 379 217 387 218 382 221Z',
  grass: 'M9 242 4 234 10 237 10 230 14 237 18 235 15 242Z M78 253 72 247 80 248 82 243 85 249 91 247 87 253Z M187 253 184 247 190 248 192 242 196 248 202 246 199 252Z M317 252 310 246 319 247 320 242 324 248 331 244 328 251Z M394 243 388 233 394 237 398 229 399 238 400 236V243Z'
});

function artPines(count, stride, offset, base, height, seed) {
  const path = new Path2D();
  for (let i = 0; i < count; i++) {
    const x = i * stride + offset + (i * 17 % 9);
    const h = height + (i * seed % 39);
    const y = base + i * 13 % 10;
    const top = y - h;
    const w = h * 0.27;
    path.moveTo(x, top);
    path.lineTo(x + w * 0.46, top + h * 0.42);
    path.lineTo(x + w * 0.23, top + h * 0.39);
    path.lineTo(x + w * 0.75, top + h * 0.67);
    path.lineTo(x + w * 0.47, top + h * 0.63);
    path.lineTo(x + w, y);
    path.lineTo(x + 2, y - 2);
    path.lineTo(x + 2, y + 8);
    path.lineTo(x - 2, y + 8);
    path.lineTo(x - 2, y - 2);
    path.lineTo(x - w, y);
    path.lineTo(x - w * 0.48, top + h * 0.63);
    path.lineTo(x - w * 0.78, top + h * 0.68);
    path.lineTo(x - w * 0.25, top + h * 0.39);
    path.lineTo(x - w * 0.49, top + h * 0.43);
    path.closePath();
  }
  return path;
}

const artFarPines = artPines(23, 19, -6, 128, 42, 17);
const artNearPines = artPines(15, 30, -8, 142, 60, 31);
const artSkyGradients = new WeakMap();

function artSkyGradient(c, top, bottom) {
  let gradients = artSkyGradients.get(c);
  if (!gradients) {
    gradients = new Map();
    artSkyGradients.set(c, gradients);
  }
  let bottoms = gradients.get(top);
  if (!bottoms) {
    bottoms = new Map();
    gradients.set(top, bottoms);
  }
  let gradient = bottoms.get(bottom);
  if (!gradient) {
    gradient = c.createLinearGradient(0, 0, 0, 155);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    bottoms.set(bottom, gradient);
  }
  return gradient;
}

function drawBackground(c) {
  const sky = (typeof B !== 'undefined' && B && B.spec && B.spec.sky) || artDefaultSky;
  c.save();
  c.fillStyle = artSkyGradient(c, sky[0], sky[1]);
  c.fillRect(0, 0, 400, 260);
  artOval(c, 307, 47, 25, 25, '#f4cf8633');
  artOval(c, 307, 47, 19, 19, '#f4cf864d');
  artFill(c, artLand.ridge, '#17242662');
  artFill(c, artFarPines, '#111f2066');
  artFill(c, artLand.mist, '#e0e7cd13');
  artFill(c, artNearPines, '#121c1c9c');
  artFill(c, artLand.distantGround, '#343a2e');
  artFill(c, artLand.road, '#594b3b');
  artFill(c, artLand.track, '#b3976724');
  artFill(c, artLand.lip, '#3d382d');
  artFill(c, artLand.stones, '#9e856074');
  artFill(c, artLand.grass, '#666348');
  c.restore();
}
