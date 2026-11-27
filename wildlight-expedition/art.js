/* Wildlight Expedition canvas art | 400 × 260 logical coordinates
 * drawSword(c, kind)
 * drawHero(c, id, x, y, o)
 * drawMon(c, type, x, y, o)
 * drawBackground(c)
 * Optional hooks for the game:
 * drawHpBar(c, x, y, w, frac, kind) — kind is 'hero' or 'enemy'
 * drawFx(c, f, t) — returns true for a handled B.fx entry, otherwise false
 * drawBarrier(c, t, frac) — frac is the remaining duration, 0–1
 * drawHit(c, x, y, age) — age is elapsed seconds since impact
 */
const artInk = '#241e25';
const artTau = Math.PI * 2;
const artClamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const artMix = (a, b, t) => a + (b - a) * t;

function artSurface(w, h, ratio = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  const c = canvas.getContext('2d');
  c.scale(ratio, ratio);
  c.lineCap = c.lineJoin = 'round';
  return c;
}

function artBake(x, y, w, h, paint, ratio = 3) {
  return { x, y, w, h, paint, ratio, canvas: null };
}

function artRaster(s) {
  if (!s.canvas) {
    const b = artSurface(s.w, s.h, s.ratio);
    b.translate(-s.x, -s.y);
    s.paint(b);
    s.canvas = b.canvas;
  }
  return s.canvas;
}

function artPlace(c, s, x = 0, y = 0) {
  c.drawImage(artRaster(s), x + s.x, y + s.y, s.w, s.h);
}

function artGradient(c, x0, y0, x1, y1, colors) {
  const g = c.createLinearGradient(x0,y0,x1,y1);
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
  return g;
}

function artRadial(c, x, y, radius, middle, edge = '#0000') {
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, middle);
  g.addColorStop(1, edge);
  return g;
}

function artFill(c, d, color) {
  c.fillStyle = color;
  c.fill(typeof d === 'string' ? new Path2D(d) : d);
}

function artLine(c, d, color, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke(typeof d === 'string' ? new Path2D(d) : d);
}

function artPaint(c, d, colors, y0, y1, edge = artInk, width = 1.35, x0 = 0, x1 = 0) {
  const p = new Path2D(d);
  if (edge) artLine(c, p, edge, width * 2);
  artFill(c, p, Array.isArray(colors) ? artGradient(c, x0, y0, x1, y1, colors) : colors);
}

function artOval(c, x, y, rx, ry, color, angle = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, angle, 0, artTau);
  c.fillStyle = color;
  c.fill();
}

function artRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function artPivot(c, x, y, angle) {
  c.translate(x, y);
  c.rotate(angle);
  c.translate(-x, -y);
}

const artShadow = artBake(-48, -10, 96, 20, c => {
  c.scale(1, .21);
  c.fillStyle = artRadial(c, 0, 0, 46, '#13131cc9', '#17141b00');
  c.fillRect(-46, -46, 92, 92);
}, 2);

function artGroundShadow(c, x, y, w, h) {
  c.save();
  c.translate(x, y);
  c.scale(w, h);
  artPlace(c, artShadow);
  c.restore();
}

function artFleck(c, d, x, y, w, h, seed, count, light, dark, slope = 0) {
  const r = artRandom(seed);
  c.save();
  c.clip(new Path2D(d));
  for (let i = 0; i < count; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const length = .35 + r() * 2.7;
    artOval(c, px, py, length, .14 + r() * .27, r() < .53 ? light : dark, slope + r() * .6);
  }
  c.restore();
}

const artSwordParts = [
  artBake(-13,-8,49,16,c => artForgeBlade(c, 'sword')),
  artBake(-12,-8,42,16,c => artForgeBlade(c, 'twin')),
  artBake(-14,-10,68,20,c => artForgeBlade(c, 'great'))
];

function artForgeBlade(c, weapon) {
  const great = weapon === 'great';
  const end = great ? 51 : weapon === 'twin' ? 27 : 34;
  const width = great ? 5.6 : 3.5;
  const shoulder = great ? 15 : end - 8;
  const blade = `M3 ${-width} L${shoulder} ${-width} ${end - 8} ${-width * .76} ${end} 0 ${end - 8} ${width * .76} ${shoulder} ${width} 3 ${width}Z`;
  artPaint(c, blade, ['#f4ffff','#a3c9d6','#587386','#b6d2da'], -width, width, '#26313b', 1.05);
  artFill(c, `M5 -0.5 ${end - 2} 0 ${end - 11} ${-width * .77} ${shoulder} ${-width + .7} 5 ${-width + .7}Z`, '#eefaffb9');
  artLine(c, `M7 0 H${end - 3}`, '#e5fcff', .42);
  if (great) {
    artLine(c, 'M10 -2 14 0 10 2 M16 -2 20 0 16 2 M22 -2 26 0 22 2', '#3b6d7d', .75);
    artLine(c, 'M25 2.7 41 2.6', '#a2cad2', .6);
  }
  artPaint(c, 'M-9 -2.3 -2 -2.3 0 -4 2 -6.7 6 -6.1 4 -1 4 1 6 6.1 2 6.7 0 4 -2 2.3 -9 2.3 -11 0Z',
    ['#f5d78a','#b37439','#7b4a33','#dfaa57'], -6, 6, '#37272a', .9);
  artLine(c,'M-8 1.5 H-2 M2 -5 4 -5 M2 4 4 4','#fae5a4',.65);
  artLine(c,'M-8 -1.5 -7 1 M-5 -1.5 -4 1 M-2.5 -1.5 -1.5 .5','#5e4040',.85);
  artOval(c, 2.4, 0, 1, 1.2, '#5b3452');
}

function artSwordPart(c, kind) {
  artPlace(c, artSwordParts[kind === 'great' ? 2 : kind === 'twin' ? 1 : 0]);
}

function drawSword(c, kind) {
  c.save();
  if (kind === 'twin') {
    c.rotate(-.32);
    artSwordPart(c, kind);
    c.rotate(.64);
  }
  artSwordPart(c, kind);
  c.restore();
}

/* Bren | layered wool, etched steel, and a swinging belt lantern */
const artBrenFeet = artBake(-25,-25,53,29,c => {
  artPaint(c,'M-15 -22 -3 -22 -4 -7 1 -4 1 0 -18 0 -19 -4Z M5 -22 15 -23 16 -8 22 -4 22 0 4 0 3 -5Z',
    ['#74605b','#45383e','#352d35'], -23, 1);
  artPaint(c,'M-15 -15 -6 -17 -6 -9 -17 -8Z M5 -16 15 -18 15 -10 5 -9Z',
    ['#afb1a8','#71767e','#505661'], -19, -8, '#302e37', .8);
  artLine(c,'M-16 -8 -9 -9 M-16 -4 -8 -5 M5 -10 12 -11 M6 -4 17 -5','#bd947581',.85);
  artLine(c,'M-17 -.6 H-1 M5 -.6 H21','#b08468',.62);
});

const artBrenCloak = artBake(-38,-48,59,45,c => {
  const d = 'M-10 -43 Q2 -46 13 -35 Q10 -27 13 -19 L17 -10 Q6 -3 -7 -5 Q-15 -9 -32 -5 L-35 -8 Q-23 -19 -25 -32 Q-23 -40 -10 -43Z';
  artPaint(c,d,['#ffd075','#d88d36','#a3542e','#72332f'],-43,-5);
  artFill(c,'M-19 -38 Q-17 -23 -30 -8 L-23 -8 Q-14 -21 -10 -39Z','#ffd27973');
  artFill(c,'M-12 -36 Q-15 -16 -20 -8 L-13 -9 Q-6 -22 -6 -37Z','#6b292854');
  artFill(c,'M1 -34 Q-5 -19 2 -7 Q8 -8 11 -10 Q8 -19 8 -34Z','#8e402a80');
  artLine(c,'M-32 -8 Q-22 -12 -13 -9 Q2 -5 14 -11','#f6b767',.88);
  artLine(c,'M-21 -34 Q-21 -22 -24 -17 M-17 -22 Q-19 -16 -22 -13 M-9 -20 Q-10 -11 -12 -10','#f4b460a0',.7);
  artFleck(c,d,-33,-43,51,39,5,85,'#ffe7ad30','#67313a4a',1.8);
});

const artBrenBody = artBake(-25,-48,49,36,c => {
  artPaint(c,'M-17 -37 Q-8 -46 4 -42 Q13 -42 17 -36 L18 -18 Q14 -13 9 -14 L-12 -15 -18 -23Z',
    ['#9b8268','#685e59','#48434b'],-42,-14);
  artPaint(c,'M-12 -37 -3 -39 6 -38 11 -33 7 -24 -1 -21 -10 -24Z',
    ['#b7beb5','#7f9098','#555b68'],-39,-20,'#3d383e',.85);
  artLine(c,'M-9 -35 -2 -37 6 -36 M-6 -32 1 -34 7 -33 M-8 -26 -1 -23 5 -25','#d4e3d3a5',.9);
  artFill(c,'M-17 -35 Q-6 -46 7 -40 L11 -36 Q1 -34 -8 -27Z','#b6713c');
  artLine(c,'M-15 -35 Q-6 -43 5 -40','#ffc872',1.25);
  artPaint(c,'M-14 -20 Q1 -17 17 -21 L18 -16 Q4 -11 -14 -15Z',['#795143','#422b35'],-21,-15,'#322631',.9);
  artPaint(c,'M-4 -19 3 -18 3 -13 -4 -14Z',['#ffeead','#ab733d'],-19,-13);
  artFill(c,'M-2.5 -17.5 .7 -17.1 .7 -15 -2.5 -15.3Z','#513645');
  artLine(c,'M7 -17 8 -17 M11 -18 12 -18 M14 -19 15 -19 M-11 -17 -8 -16','#d0a172',.8);
});

const artBrenFace = artBake(-18,-69,39,40,c => {
  artPaint(c,'M-11 -58 Q-4 -66 6 -63 Q14 -62 14 -53 L13 -50 17 -46 Q18 -45 14 -43 L13 -36 7 -31 -2 -33 -10 -39Z',
    ['#ffe0a6','#d99b6c','#a45f54'],-62,-34);
  artFill(c,'M5 -54 Q10 -57 13 -53 L12 -49 15 -46 11 -45 7 -47Z','#ffe2ae');
  artPaint(c,'M-13 -44 Q-16 -51 -15 -58 Q-13 -65 -5 -67 Q6 -69 14 -63 L17 -57 11 -58 5 -56 Q0 -59 -3 -55 L-6 -46 -8 -40Z',
    ['#8b6349','#573d38','#342b33'],-67,-41);
  artLine(c,'M-13 -57 Q-9 -65 -1 -65 M-11 -55 Q-7 -62 2 -63 M0 -64 Q8 -65 13 -61 M-8 -50 -6 -55','#d59861aa',.96);
  artPaint(c,'M-8 -45 Q-4 -47 -1 -42 L5 -41 Q8 -44 13 -42 L13 -36 8 -32 2 -31 -5 -35 -9 -40Z',
    ['#98664c','#65443e','#3f3037'],-45,-31,'#422d35',.75);
  artOval(c,-6.3,-46.8,2.6,3.7,'#c58462',-.26);
  artLine(c,'M-6 -48 Q-4 -48 -5 -45 M1 -39 3 -36 M4 -38 7 -35 M8 -40 11 -38','#e0a1778a',.7);
  artLine(c,'M7 -51 Q9.5 -53 12.5 -52','#5a3b35',1.6);
  artOval(c,10.1,-49.7,2.1,1.26,'#fff0cc',-.18);
  artOval(c,10.95,-49.65,.85,1.1,'#40333b');
  artOval(c,11.2,-50.12,.34,.31,'#fff8d6');
  artLine(c,'M11 -40 Q9 -39 7 -40 M13 -45 H15','#673b3a',.75);
});

const artBrenGuard = artBake(-28,-48,32,28,c => {
  artPaint(c,'M-25 -42 -19 -46 -6 -45 1 -39 -3 -29 -9 -25 -22 -28 -26 -33Z',
    ['#e4efe7','#aac2c6','#5c7987','#424f65'],-45,-25);
  artPaint(c,'M-22 -40 -18 -43 -7 -42 -2 -38 -7 -31 -21 -32Z',
    ['#f3f4d3','#a5bfc5','#657f8c'],-43,-31,'#596476',.72);
  artLine(c,'M-23 -41 -18 -44 -7 -43 -1 -39 M-23 -34 -21 -30 -10 -28','#ecf9de',.8);
  artLine(c,'M-16 -38 -13 -35 -10 -39 M-14 -36 -14 -34','#526f7c',.92);
  artOval(c,-20,-37,1.05,1.05,'#fff1b5');
  artOval(c,-6.4,-36,1,1,'#fff1b5');
  artFleck(c,'M-22 -40 -18 -43 -7 -42 -2 -38 -7 -31 -21 -32Z',-23,-44,23,16,19,19,'#f3ffed61','#344a5541',-.6);
});

const artBrenFarArm = artBake(-35,-42,29,24,c => {
  artPaint(c,'M-9 -40 Q-17 -40 -22 -34 L-26 -28 -31 -29 -32 -24 -27 -20 -22 -21 -14 -30Z',
    ['#ce974e','#96603c','#624039'],-40,-20,artInk,1.05);
  artLine(c,'M-29 -27 -25 -24 -20 -29 M-22 -32 -19 -34','#e6b277a8',.78);
});

const artBrenArm = artBake(-13,-35,43,24,c => {
  artPaint(c,'M-8 -32 Q0 -35 7 -27 L14 -23 23 -26 27 -21 22 -16 13 -17 4 -20 -5 -21Z',
    ['#e6a84d','#b76d3b','#784835'],-34,-16);
  artLine(c,'M-4 -30 Q2 -31 7 -25 L13 -21 M1 -24 5 -22','#f6c272a8',1);
  artPaint(c,'M12 -24 19 -26 24 -22 23 -17 17 -16 13 -18Z',
    ['#c5d4ce','#829599','#536273'],-26,-16,'#322c37',.85);
  artLine(c,'M14 -23 19 -24 22 -21 M15 -20 19 -21','#e8ebc8b5',.78);
});

const artLanternGlow = artBake(-20,-20,40,40,c => {
  c.fillStyle = artRadial(c,0,0,19,'#ffd77999','#ff993a00');
  c.fillRect(-19,-19,38,38);
}, 2);
const artLantern = artBake(-8,-13,16,25,c => {
  artLine(c,'M-2 -5 Q-4 -11 0 -11 Q4 -11 3 -5','#2c252d',2);
  artLine(c,'M-2 -6 Q-3 -10 0 -10 Q3 -10 2 -6','#d8a363',.71);
  artPaint(c,'M-5 -5 -3 -7 H3 L5 -5 5 4 3 7 H-3 L-5 3Z',['#fff0ac','#d39a52','#805041'],-7,7,'#382a32',.9);
  artPaint(c,'M-3.4 -4 H3.4 V3.6 H-3.4Z',['#bf5636','#ffbb50','#fff2a5'],-4,4,'#68412f',.62);
  artLine(c,'M0 -4 V4 M-4 5 H4','#ffe28d',.8);
});

const artGlove = artBake(-6,-6,12,12,c => {
  artPaint(c,'M-4 -2 Q-3 -5 0 -4 L4 -3 4 1 2 4 -3 3Z',['#b98e68','#815343','#4f3540'],-4,4,'#332630',.76);
  artLine(c,'M1 -2 3 -1 M0 0 3 1','#e5ad79',.7);
});

const artSlash = new Path2D('M-12 -40 Q37 -52 60 -9 Q49 -32 16 -35 Q2 -38 -12 -40Z');

function artDrawBren(c, t, swing, brace, weapon) {
  artPlace(c, artBrenFeet);
  c.save();
  if (brace) {
    c.translate(3, 6);
    c.scale(1.06,.89);
    artPivot(c, -3,-10,.13);
  }
  c.save();
  artPivot(c,-12,-36,Math.sin(t * 3.2) * .085 - swing * .22);
  artPlace(c,artBrenCloak);
  c.restore();
  if (weapon === 'twin') {
    artPlace(c,artBrenFarArm);
    c.save();
    c.translate(-28,-26);
    c.rotate(-2.11 - Math.sin(swing * Math.PI) * 1.30);
    artSwordPart(c,'twin');
    artPlace(c,artGlove);
    c.restore();
  }
  artPlace(c,artBrenBody);
  c.save();
  c.translate(10,-14);
  c.rotate(Math.sin(t * 5.4) * .17 - swing * .47);
  c.globalAlpha *= .79 + .19 * Math.sin(t * 12);
  artPlace(c,artLanternGlow,0,2);
  c.restore();
  c.save();
  c.translate(10,-14);
  c.rotate(Math.sin(t * 5.4) * .17 - swing * .47);
  artPlace(c,artLantern);
  artOval(c,Math.sin(t * 13) * .9,1,.8,2.3,'#fff4ad',.21);
  c.restore();
  artPlace(c,artBrenFace, swing * 2, 0);
  c.save();
  const attack = Math.sin(swing * Math.PI * .92);
  artPivot(c,-7,-28,(brace ? .26 : 0) + attack * .55);
  artPlace(c,artBrenArm);
  c.translate(24,-22);
  if (swing > .30 && swing < .89) {
    c.save();
    c.globalAlpha *= Math.sin((swing - .30) / .59 * Math.PI) * .55;
    artFill(c,artSlash,weapon === 'great' ? '#ffe4a1' : '#d5f3ed');
    c.restore();
  }
  c.rotate((brace ? -.38 : weapon === 'great' ? -1.59 : -1.28) + attack * 1.6);
  artSwordPart(c,weapon);
  artPlace(c,artGlove);
  c.restore();
  artPlace(c,artBrenGuard);
  c.restore();
}

/* Tavi | a pointed hood, feathered quiver, and a bow that draws in silhouette */
const artTaviFeet = artBake(-20,-23,44,27,c => {
  artPaint(c,'M-11 -20 -1 -21 -2 -12 -5 -5 -4 -1 -16 0 -17 -4 -11 -10Z M3 -21 12 -21 12 -9 14 -5 20 -3 19 0 H6 L4 -4Z',
    ['#7b7660','#494f49','#343640'],-22,0);
  artLine(c,'M-13 -8 -7 -7 M-14 -5 -8 -4 M6 -9 11 -9 M6 -5 14 -5 M-15 -.6 -7 -.6 M7 -1 H18','#c9a481a8',.82);
});

const artTaviCoat = artBake(-21,-45,43,41,c => {
  const d = 'M-11 -38 Q-4 -45 10 -38 L14 -28 12 -22 18 -10 10 -6 1 -9 -5 -7 -16 -9 -18 -15 -11 -25Z';
  artPaint(c,d,['#a6cd82','#538568','#365d55','#283f43'],-42,-6);
  artFill(c,'M-11 -35 -4 -36 -5 -22 -9 -13 -15 -12 -12 -23Z','#b1d48a54');
  artFill(c,'M6 -26 10 -25 10 -18 16 -11 11 -8 5 -11Z','#527d64');
  artLine(c,'M-16 -13 Q-10 -10 -6 -9 L0 -11 10 -8 16 -11 M-9 -23 -13 -16 M4 -21 3 -14','#abd18b',.84);
  artFleck(c,d,-17,-38,35,32,22,66,'#ddf0a140','#172f3545',1.25);
  artLine(c,'M-12 -36 Q-7 -28 12 -20','#402f36',3.55);
  artLine(c,'M-12 -36 Q-7 -28 12 -20','#b98659',1.95);
  artLine(c,'M-11 -22 Q-2 -19 11 -21','#614b47',2.7);
  artLine(c,'M-9 -22 -4 -21 M0 -21 3 -21','#d6ad70',.72);
  artPaint(c,'M-1 -21 H3 V-17 L-1 -17Z',['#e8d587','#98774d'],-21,-17,'#4b4341',.55);
});

const artQuiver = artBake(-13,-29,24,61,c => {
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate((i - 1) * 4,i === 1 ? -3 : 0);
    c.rotate((i - 1) * .13);
    artLine(c,'M0 -20 V9','#3f3a39',1.8);
    artLine(c,'M0 -20 V9','#d6b982',.81);
    artPaint(c,'M0 -23 Q4 -20 2 -11 L0 -13 -3 -12 Q-4 -18 0 -23Z',['#fff6d7','#e4d1a0','#a88f73'],-23,-11,'#525048',.67);
    artLine(c,'M.1 -21 -.2 -13 M-2 -17 0 -15 M1.8 -18 0 -16','#fdf3d3',.58);
    c.restore();
  }
  artPaint(c,'M-7 -5 Q0 -8 7 -4 L4 23 1 28 -5 26Z',['#d09a63','#8d5c4b','#56414a'],-6,27);
  artLine(c,'M-4 -3 -2 22 M3 -3 2 20 M-5 21 3 22','#e9b67d8e',.83);
  artPaint(c,'M-7 -5 Q0 -8 7 -5 L6 .7 Q0 -2 -7 .5Z',['#e4b674','#ae774e'],-7,1,'#40343a',.75);
  artLine(c,'M-5 -3 Q0 -5 5 -3 M-3 25 H1','#ffe8a1a6',.85);
});

const artTaviHood = artBake(-29,-70,51,34,c => {
  const d = 'M-25 -67 Q-17 -67 -7 -62 Q9 -61 15 -51 L17 -47 10 -48 7 -43 1 -38 -11 -39 -19 -43 -20 -54Z';
  artPaint(c,d,['#c0dd90','#6da273','#3c725a','#2a4844'],-69,-38,artInk,1.4,-26,10);
  artFill(c,'M-24 -66 Q-18 -66 -10 -62 Q-15 -61 -15 -57 L-17 -53Z','#d8e49b60');
  artLine(c,'M-24 -66 Q-14 -64 -8 -61 Q7 -60 13 -52','#d6edac',.92);
  artLine(c,'M-18 -57 Q-14 -51 -15 -45 M-14 -55 Q-10 -52 -10 -48','#9ac59582',.79);
  artFleck(c,d,-25,-67,42,30,3,71,'#e7f9ac32','#233f414b',.8);
  artPaint(c,'M-2 -49 Q4 -54 12 -50 L13 -47 17 -44 13 -42 11 -38 5 -36 -2 -40 -4 -44Z',
    ['#ffdda7','#d59c78','#a86c5f'],-52,-37,'#44343a',.9);
  artPaint(c,'M-4 -48 Q2 -54 9 -52 L12 -50 7 -49 Q4 -47 1 -47 L-.5 -43 -4 -43Z',['#624438','#393039'],-53,-44,'#44343a',.62);
  artLine(c,'M7 -48 11 -48.5','#634541',.95);
  artOval(c,9.6,-46.35,1.9,1.2,'#fff1d1');
  artOval(c,10.25,-46.4,.83,1,'#34423e');
  artOval(c,10.5,-46.75,.32,.32,'#fff3c0');
  artLine(c,'M10 -40 Q12 -39.5 12.8 -41 M13.5 -44 H15','#8c5149',.72);
  artPaint(c,'M-17 -44 Q-7 -43 -1 -38 Q4 -36 8 -36 L3 -32 Q-9 -31 -18 -38Z',
    ['#a8cb86','#6f946c','#3f675a'],-44,-33,'#314641',1);
  artLine(c,'M-16 -42 Q-8 -40 -3 -37 M-13 -38 -10 -37 M-8 -36 -5 -35','#dce8a095',.76);
});

const artBow = artBake(-10,-30,32,60,c => {
  const path = 'M-6 -25 Q-1 -24 0 -17 C4 -12 11 -8 11 0 C11 8 4 12 0 17 Q-1 24 -6 25';
  artLine(c,path,'#2e2631',5);
  artLine(c,path,artGradient(c,0,-26,0,26,['#eec384','#a56c48','#dfad70']),3.45);
  artLine(c,'M-5 -24 Q-1 -23 0 -17 Q6 -12 9 -5 M9 6 Q6 13 0 17 Q-1 22 -5 24','#fce0a0',.9);
  artLine(c,'M10 -4 V4','#6c453e',2.65);
  artLine(c,'M8.7 -3 11.5 -3 M9 -1 11.5 -1 M9 1 11.5 1 M8.8 3 11 3','#efb785',.62);
});

const artArrow = artBake(-17,-5,36,10,c => {
  artPaint(c,'M-15 0 -11 -2.8 -5 -1.6 -7 0 -5 1.5 -11 2.5Z',['#fff4cb','#bfa67a'],-3,3,'#615044',.55);
  artLine(c,'M-13 .2 11 .2','#563d35',1.9);
  artLine(c,'M-13 -.16 12 -.16','#f4ce85',.86);
  artPaint(c,'M9 -2.4 17 0 9 2.4 10 .1Z',['#eef3df','#7e9ca0'],-3,3,'#393a40',.63);
});

function artDrawTavi(c, t, lean, swing) {
  artPlace(c,artTaviFeet);
  c.save();
  artPivot(c,0,-8,-lean * .37 + swing * .16);
  c.save();
  c.translate(-20,-44);
  c.rotate(-.17 - Math.sin(t * 4) * .03);
  artPlace(c,artQuiver);
  c.restore();
  artPlace(c,artTaviCoat);
  c.save();
  artPivot(c,-10,-47,Math.sin(t * 4 + .7) * .034 + swing * .039);
  artPlace(c,artTaviHood);
  c.restore();

  const x = 20 + 4 * lean + 3 * swing;
  const y = -28 - 3 * lean;
  const pull = x - 6 - lean * 20;
  c.beginPath();
  c.moveTo(4,-33); c.quadraticCurveTo(9,-26,x + 10,y);
  c.moveTo(-5,-33); c.quadraticCurveTo(-7 - lean * 5,-20 - lean * 11,pull,y);
  c.strokeStyle = artInk; c.lineWidth = 7; c.stroke();
  c.strokeStyle = '#648768'; c.lineWidth = 4.3; c.stroke();
  c.strokeStyle = '#b9d495'; c.lineWidth = .82; c.stroke();
  c.beginPath();
  c.moveTo(x - 6,y - 25); c.lineTo(pull,y); c.lineTo(x - 6,y + 25);
  c.strokeStyle = '#f1e3b7'; c.lineWidth = .8; c.stroke();
  if (lean > .1) artPlace(c,artArrow,pull + 13,y - .5);
  artPlace(c,artBow,x,y);
  artOval(c,x + 9.5,y + .5,3,2.73,'#d69f79',-.18);
  artOval(c,pull,y + .4,2.65,2.2,'#e2ac81',-.15);
  c.restore();
}

/* Iona | lilac embroidery, a twig staff, and dried medicinal flowers */
const artIonaBody = artBake(-26,-49,54,54,c => {
  artPaint(c,'M-12 -11 -5 -11 -5 -5 -1 -2 -2 0 H-15 L-16 -3Z M6 -11 H14 L14 -5 19 -2 18 0 H5Z',
    ['#6a5464','#3c303e'],-13,0);
  artLine(c,'M-14 -3 -7 -3 M7 -3 14 -3 M-14 -.5 -3 -.5 M6 -.5 17 -.5','#d49c888f',.7);
  const skirt = 'M-12 -30 Q2 -37 14 -30 L14 -21 19 -10 22 -6 Q13 -3 6 -6 -2 -2 -10 -6 L-18 -6 -20 -9 -14 -20Z';
  artPaint(c,skirt,['#9a84b4','#6a627f','#4a415f'],-34,-5);
  artFill(c,'M-9 -23 Q-9 -17 -15 -8 L-8 -7 Q-4 -15 -4 -25Z','#c19fca5e');
  artFill(c,'M8 -20 Q10 -12 15 -7 L19 -7 Q14 -12 12 -20Z','#493d5c64');
  artLine(c,'M-17 -8 Q-11 -7 -8 -8 Q-1 -4 5 -7 Q13 -5 19 -7 M-7 -19 -10 -12 M3 -16 3 -10','#c5abd1a3',.85);
  artFleck(c,skirt,-19,-25,40,20,51,65,'#d8bbe640','#362a4c52',1.36);
});

const artIonaFace = artBake(-27,-71,49,39,c => {
  artPaint(c,'M-9 -59 Q-11 -69 -19 -68 Q-26 -67 -24 -60 Q-23 -56 -16 -55Z',
    ['#d6a07d','#865b5d','#4a3a49'],-68,-55);
  artLine(c,'M-22 -62 Q-21 -67 -16 -66 M-21 -59 Q-17 -62 -14 -59','#efd1b2a5',.8);
  artPaint(c,'M-18 -52 Q-17 -67 -3 -68 Q10 -68 15 -58 L12 -43 6 -36 -2 -35 -11 -37 -17 -41Z',
    ['#bf8f76','#885c5c','#593f52'],-68,-36);
  artPaint(c,'M-9 -54 Q-2 -64 8 -58 Q12 -55 12 -50 L16 -46 12 -44 11 -39 5 -35 -4 -36 -9 -43Z',
    ['#ffe7bf','#e2ae8d','#ac726c'],-61,-35);
  artPaint(c,'M-15 -47 Q-17 -55 -11 -62 Q-6 -68 3 -66 Q12 -65 15 -57 Q11 -59 7 -59 Q1 -52 -7 -52 L-7 -44 -10 -43Z',
    ['#d9a482','#a17169','#694a58'],-65,-45,'#65434d',.83);
  artLine(c,'M-13 -53 Q-13 -61 -6 -64 Q1 -67 7 -64 M-9 -55 Q-3 -56 2 -61 M4 -64 Q8 -63 11 -61','#f1c3a1a8',.84);
  artOval(c,-7.1,-46.5,2.6,3.5,'#d0987d',-.35);
  artOval(c,-7,-44,1.12,1.5,'#f3c87e');
  artLine(c,'M7 -51 Q9 -52 11.8 -51','#7b5051',.85);
  artOval(c,9.6,-48.7,1.85,1.24,'#fff3d3');
  artOval(c,10.2,-48.9,.77,1.1,'#493b49');
  artOval(c,10.45,-49.2,.31,.32,'#fff4ce');
  artOval(c,5.5,-44.4,2.5,1.1,'#cc7d7758',-.25);
  artLine(c,'M8 -42 Q10 -40.8 11.9 -42.3','#965d60',.8);
});

const artIonaShawl = artBake(-25,-46,53,33,c => {
  const d = 'M-11 -44 Q-6 -40 4 -42 Q12 -45 19 -40 Q25 -36 23 -30 Q23 -25 14 -23 Q10 -17 -3 -16 Q-14 -17 -20 -23 Q-25 -31 -21 -37Z';
  artPaint(c,d,['#f0d9e4','#c5a6d3','#9b7fb7','#695c94'],-44,-16);
  artFill(c,'M-20 -35 Q-14 -40 -10 -40 Q-5 -36 -1 -37 Q-11 -32 -15 -22 Q-22 -26 -20 -35Z','#f0d0e8a0');
  artFill(c,'M4 -36 Q10 -41 17 -38 Q13 -38 12 -30 Q11 -24 3 -19 L-6 -18 Q3 -24 4 -36Z','#784e9790');
  artLine(c,'M-20 -28 Q-14 -20 -5 -19 Q4 -19 12 -25 Q19 -26 21 -31','#eed1e7',1.05);
  artLine(c,'M-17 -28 -14 -25 -12 -27 -9 -23 -6 -25 -2 -21 1 -24 4 -23 7 -27 10 -26 13 -30 16 -29 19 -33','#f1d9e7a8',.66);
  artFleck(c,d,-23,-43,46,29,91,110,'#fff1eb3a','#533d763e',.65);
  artPaint(c,'M8 -37 11 -39 14 -36 12 -32 8 -32 6 -34Z',['#fff0b0','#c29164','#8a586d'],-39,-32,'#63476a',.82);
  artOval(c,10.5,-35.5,1.45,1.25,'#ffeaba');
});

const artStaff = artBake(-14,-72,28,77,c => {
  const path = 'M-1 0 Q2 -12 -1 -24 Q-4 -34 2 -43 Q8 -50 5 -58 Q3 -66 -4 -68 Q-9 -68 -10 -62';
  artLine(c,path,'#382a36',6);
  artLine(c,path,artGradient(c,0,-69,0,0,['#e2ae73','#aa7657','#6d4948']),3.8);
  artLine(c,'M-8 -63 Q-5 -69 1 -63 Q8 -56 4 -49 M-1 -36 Q-3 -29 -.2 -22 M-.6 -11 -1 -4','#f6bc80b7',.9);
  artLine(c,'M-1 -45 6 -42 M-2 -48 7 -45 M0 -51 7 -48 M-2 -48 -5 -44 -4 -40 M4 -46 8 -41','#f5ca92',1.25);
});

const artBouquet = artBake(-14,-22,32,28,c => {
  artLine(c,'M0 3 Q-4 -2 -8 -11 M0 2 Q3 -3 8 -15 M1 4 Q11 -1 14 -9 M.5 .5 Q0 -5 .8 -15','#635341',1.5);
  artLine(c,'M1 3 Q3 -4 8 -14 M0 2 Q-4 -4 -8 -11 M3 2 Q9 -2 13 -8','#a2a169',.64);
  artFill(c,'M-4 -5 Q-11 -4 -11 -9 Q-6 -9 -4 -5 M5 -8 Q3 -12 7 -13 Q10 -10 5 -8 M8 -3 Q10 -9 14 -6 Q13 -3 8 -3','#9a9c65');
  for (const [x,y,r,color] of [[-8,-12,1.55,'#e9a5ad'],[.8,-15,1.72,'#f0cd83'],[8,-16,1.7,'#dbb9cd'],[13,-9,1.02,'#efdaba']]) {
    for (let i = 0; i < 5; i++) {
      const a = i * artTau / 5;
      artOval(c,x + Math.cos(a) * r,y + Math.sin(a) * r,r,r * .72,color,a);
    }
    artOval(c,x,y,r * .57,r * .56,'#9d674c');
  }
});

const artLilacLight = artBake(-21,-21,42,42,c => {
  c.fillStyle = artRadial(c,0,0,20,'#f2b9ffae','#ce73f100');
  c.fillRect(-20,-20,40,40);
}, 2);
const artStar = new Path2D('M0 -6 Q1 -1 6 0 Q1 1 0 6 Q-1 1 -6 0 Q-1 -1 0 -6Z');

function artDrawIona(c, t, cast) {
  artPlace(c,artIonaBody);
  c.save();
  artPivot(c,-2,-18,Math.sin(t * 3.1 + .9) * .033 - cast * .08);
  artPlace(c,artIonaFace);
  artPlace(c,artIonaShawl);
  c.restore();
  const x = 27 + cast * 8;
  c.save();
  c.translate(x,-1 - cast * 2);
  c.rotate(Math.sin(t * 2.6) * .065 - cast * .23);
  artPlace(c,artStaff);
  c.save();
  c.translate(3,-48);
  c.rotate(Math.sin(t * 5.2 - .5) * .12 + cast * .15);
  artPlace(c,artBouquet);
  c.restore();
  if (cast > .18) {
    c.globalAlpha *= Math.sin(cast * Math.PI * .89);
    artPlace(c,artLilacLight,-10,-65);
    c.translate(-10,-65);
    c.rotate(t * 2);
    artFill(c,artStar,'#fff3e7');
  }
  c.restore();
  c.beginPath();
  c.moveTo(14,-31); c.quadraticCurveTo(20,-24,x + 1,-29 - cast * 2);
  c.strokeStyle = artInk; c.lineWidth = 7.5; c.stroke();
  c.strokeStyle = '#b494c3'; c.lineWidth = 5; c.stroke();
  c.strokeStyle = '#e0bddc'; c.lineWidth = 1; c.stroke();
  artOval(c,x + .5,-29 - cast * 2,3.1,2.7,'#e3ab8a');
}

function drawHero(c, id, x, y, o) {
  const t = o.t || 0;
  const swing = o.dead ? 0 : o.swing || 0;
  const phase = id === 'bren' ? 0 : id === 'tavi' ? 1.5 : 2.7;
  c.save();
  c.translate(x,y);
  c.lineCap = c.lineJoin = 'round';
  artGroundShadow(c,0,1,id === 'bren' ? .68 : .55,.51);
  if (o.dead) {
    c.translate(4,-3);
    c.rotate(-1.44);
    c.globalAlpha *= .52;
  } else {
    const hit = o.hit > 0 ? -2.5 * o.hit / .25 + Math.sin(t * 62) * .64 : 0;
    c.translate(hit,Math.sin(t * 3.4 + phase) * .73);
  }
  if (id === 'bren') artDrawBren(c,t,swing,!o.dead && o.brace,o.weapon);
  else if (id === 'tavi') artDrawTavi(c,t,o.dead ? 0 : o.lean || 0,swing);
  else artDrawIona(c,t,swing);
  c.restore();
  if (!o.dead && o.hit > .16) drawHit(c,x + 10,y - 36,.25 - o.hit);
}

/* Brushfang | long brush tail, shaggy neck, and a low hunting stance */
const artFoxTail = artBake(-55,-25,62,52,c => {
  const d = 'M4 -1 Q-4 5 -15 6 L-11 10 -24 9 -21 14 -35 12 -32 17 -46 12 -42 10 -53 6 -45 3 -51 -2 -41 -2 -47 -8 -36 -7 -41 -14 -30 -12 -33 -18 Q-20 -16 -13 -8 Q-4 -10 4 -7Z';
  artPaint(c,d,['#f8ad65','#ae593c','#693d3b'],-19,15,artInk,1.1,-24,-4);
  artFill(c,'M-17 -6 Q-26 -8 -32 -15 L-31 -10 -39 -11 -34 -5 -45 -6 -39 0 -48 1 -41 4 -49 6 -39 10 -42 12 -33 14 -34 11 -24 12 Q-29 4 -17 -6Z','#e59763');
  artFill(c,'M-46 6 -31 7 -38 3 -28 4 -32 -1 -19 1 -23 -3 -12 -2 -17 3 -27 7 -32 12 -36 10Z','#f4bf82b5');
  artLine(c,'M-44 5 Q-30 1 -13 2 M-27 -9 -16 -5 M-38 8 -29 9 M-32 -4 -26 -2','#ffe0a18a',.8);
  artFleck(c,d,-52,-18,55,34,43,82,'#fff0b948','#522f384d',-.12);
});

const artFoxTorso = artBake(-29,-37,63,38,c => {
  const d = 'M-26 -13 Q-28 -22 -21 -26 Q-11 -32 6 -28 L16 -31 21 -27 27 -27 24 -20 29 -18 23 -14 23 -9 18 -9 16 -5 9 -9 Q-2 -7 -12 -10 Q-18 -5 -23 -8Z';
  artPaint(c,d,['#ffd18b','#bf6b43','#93443b','#583239'],-32,-6);
  artFill(c,'M-23 -22 Q-18 -28 -10 -27 Q-2 -29 7 -25 L6 -20 Q-8 -23 -17 -17 L-23 -18Z','#ffb87087');
  artFill(c,'M-12 -10 Q-3 -13 2 -16 Q15 -19 20 -17 L19 -8 14 -8 16 -5 8 -8 -3 -7Z','#f8c698a6');
  artLine(c,'M-23 -22 Q-17 -27 -10 -27 L-1 -27 M-20 -17 -15 -20 M-4 -21 3 -24 M-11 -14 -7 -17 M6 -13 11 -16','#ffe0a389',.88);
  artFleck(c,d,-26,-30,53,24,56,105,'#fff2b747','#60313b49',-.38);
});

const artFoxLeg = artBake(-8,-14,26,18,c => {
  artPaint(c,'M-5 -12 5 -12 6 -7 10 -3 Q15 -3 16 0 L5 1 1 -1 -2 -6Z',
    ['#d88158','#8b4b43','#422c38'],-12,1,'#30222c',1);
  artLine(c,'M5 -.4 13 -.5 M2 -8 4 -5','#d49774',.69);
});

const artFoxHead = artBake(-16,-30,51,37,c => {
  const d = 'M-11 -7 -14 -15 -10 -14 -10 -20 -5 -16 -3 -22 2 -17 8 -19 Q18 -19 21 -11 L30 -7 Q34 -5 29 -2 L23 -1 20 3 13 3 11 5 6 2 1 4 -1 1 -7 2 -5 -2Z';
  artPaint(c,'M3 -13 0 -25 Q2 -28 8 -24 L13 -15Z',['#d1815a','#834437'],-25,-13);
  artPaint(c,d,['#ffbc79','#ce7347','#95473b','#69373c'],-22,6);
  artPaint(c,'M12 -14 10 -26 Q12 -29 17 -25 L21 -15Z',['#ffd293','#ad6146'],-26,-14,'#3a2930',.95);
  artFill(c,'M13 -24 Q17 -23 18 -17 L14 -18Z','#c78280');
  artFill(c,'M5 -5 Q12 -6 15 -9 L21 -7 31 -5 27 -2 22 -1 19 2 13 2 10 4 6 1 1 2Z','#f5c39b');
  artLine(c,'M-8 -13 -4 -15 -1 -12 M-4 -9 1 -13 M-4 -4 3 -7 M7 -12 11 -14','#ffd493ab',.87);
  artLine(c,'M12 -12 Q15 -15 19 -13','#6c392f',1.55);
  artOval(c,17,-10.5,2.8,1.7,'#352b32',-.16);
  artOval(c,17.75,-10.6,1.18,1.27,'#ffe38a');
  artOval(c,18.15,-11.1,.44,.38,'#fff7cc');
  artOval(c,30,-5.7,2.65,1.95,'#382731',-.14);
  artOval(c,30.3,-6.2,.9,.52,'#bd917d',-.13);
  artLine(c,'M19 -.7 Q25 .6 29 -2 M23 -3.8 23.5 -3.8 M25 -4.3 25.4 -4.3','#844e42',.69);
  artFleck(c,d,-13,-21,44,26,62,48,'#ffdc9c5f','#5e2d3745',-.45);
});

function artDrawFox(c, t, wind, lunge, edge) {
  const leap = artClamp(lunge / 60);
  c.translate(0,wind * 4 - leap * 7);
  c.scale(1 + leap * .16 + wind * .09,1 - wind * .17 + leap * .06);
  c.save();
  c.translate(-20,-17);
  c.rotate(Math.sin(t * 7.3) * .13 + wind * .34 - leap * .44 + edge * .43);
  c.scale(1 - edge * .4,1);
  artPlace(c,artFoxTail);
  c.restore();
  c.save();
  c.translate(-13,-11);
  c.rotate(-leap * .85 + wind * .19);
  artPlace(c,artFoxLeg);
  c.restore();
  c.save();
  c.translate(9,-11);
  c.rotate(-leap * .77 - wind * .22);
  artPlace(c,artFoxLeg);
  c.restore();
  artPlace(c,artFoxTorso);
  c.save();
  c.translate(10,-18 + wind * 3);
  c.rotate(wind * .21 - leap * .12);
  artPlace(c,artFoxHead);
  c.restore();
}

/* Rustshell | cold iron chips embedded in warm, overlapping plates */
const artBeetleFoot = artBake(-10,-18,23,25,c => {
  artPaint(c,'M-7 -14 -2 -15 4 -9 3 -4 10 -1 9 2 H0 L-3 -1 -2 -5 -8 -8Z',
    ['#b9805e','#755049','#3b333e'],-15,2,'#31252d',.96);
  artLine(c,'M-6 -12 -4 -8 -1 -7 M.5 -1 7 -1','#e2a16da1',.75);
});

const artCopper = ['#f5ba77','#c78454','#9e5240','#62363b'];
const artBeetleShell = artBake(-36,-49,68,48,c => {
  const d = 'M-33 -17 Q-34 -34 -22 -42 Q-6 -53 8 -43 Q18 -43 25 -30 L29 -19 22 -10 Q3 -2 -17 -6 Q-30 -9 -33 -17Z';
  artPaint(c,d,['#edbd8b','#a36250','#693b40','#472e39'],-46,-6);
  artPaint(c,'M-32 -20 Q-32 -36 -19 -43 Q-8 -48 2 -46 Q-14 -36 -13 -14 L-15 -7 -25 -10Z',
    ['#e5a572','#9f5f4b','#663c42'],-46,-7,'#50313b',1.02);
  artPaint(c,'M-16 -12 Q-16 -28 -8 -37 Q1 -48 10 -43 Q18 -40 21 -33 Q8 -35 4 -23 L2 -8 Q-9 -6 -16 -12Z',
    artCopper,-45,-7,'#59313a',1.15);
  artPaint(c,'M0 -10 Q2 -28 12 -35 Q18 -39 23 -33 L28 -23 27 -13 Q15 -5 0 -10Z',
    ['#ffca8a','#d09560','#a8604a','#693d43'],-35,-8,'#58313b',1.08);
  artLine(c,'M-30 -23 Q-29 -37 -18 -42 M-26 -25 Q-24 -33 -20 -35 M-13 -18 Q-10 -33 -1 -40 Q3 -43 8 -42 M3 -16 Q8 -33 18 -34 M12 -25 Q16 -30 20 -30','#ffdd9e',1.25);
  artLine(c,'M-28 -15 -22 -12 M-13 -13 Q-7 -9 -1 -11 M5 -12 Q17 -10 24 -15','#e6a26f',.83);
  artFleck(c,d,-33,-46,62,40,89,165,'#ffe0a95e','#582e3d58',-.9);
  for (const [x,y,angle] of [[-23,-27,.3],[-21,-25,.3],[-13,-35,-.4],[-4,-23,-.7],[4,-32,-.7],[-5,-20,-.5],[14,-24,-.4],[17,-20,-.65],[20,-25,-.5],[-24,-18,.4]]) {
    artOval(c,x,y,1.45,.91,'#603f42',angle);
    artOval(c,x-.25,y-.36,1.2,.53,'#c7bfaf',angle);
  }
});

const artBeetleFace = artBake(-5,-37,33,38,c => {
  const antenna = 'M7 -15 Q7 -30 1 -32 M16 -17 Q21 -32 24 -30';
  artLine(c,antenna,'#41323c',3.65);
  artLine(c,antenna,'#e6cd9d',1.65);
  artOval(c,1,-32,2.2,1.5,'#ffe1ae',.2);
  artOval(c,24,-30,2.3,1.48,'#ffe8bd',-.22);
  artPaint(c,'M0 -17 Q7 -25 17 -21 Q23 -18 23 -11 L27 -6 21 -3 17 -5 12 -3 3 -7Z',
    ['#b88668','#8c594e','#5b3c44'],-22,-4);
  artLine(c,'M4 -17 Q11 -22 16 -19 M16 -5 20 -7 23 -5','#e5ab77',.9);
  artOval(c,16,-14.4,2.9,2.5,'#362c36',-.27);
  artOval(c,17,-14.9,1.23,1.38,'#ffdf91');
  artOval(c,17.35,-15.4,.42,.37,'#fff6cb');
});

function artDrawBeetle(c, t, wind, lunge) {
  const slam = artClamp(lunge / 70);
  c.translate(0,wind * 3);
  c.scale(1 + slam * .1,1 - wind * .1);
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate(-22 + i * 17,0);
    c.rotate(Math.sin(t * (5 + slam * 12) + i * 2) * (.08 + slam * .43));
    artPlace(c,artBeetleFoot);
    c.restore();
  }
  c.save();
  artPivot(c,12,-13,-wind * .34 + slam * .22);
  c.save();
  c.translate(16,-3);
  c.rotate(Math.sin(t * 5.4) * .09 - wind * .24);
  artPlace(c,artBeetleFace);
  c.restore();
  artPlace(c,artBeetleShell);
  c.restore();
}

/* Pinecap | speckled amber cap, curled gills, and an expanding seed pod */
const artSpitterBody = artBake(-29,-43,60,49,c => {
  artPaint(c,'M-16 -14 Q-23 -10 -21 -3 L-25 0 Q-23 4 -15 3 L-8 0 -7 -12Z M8 -12 8 -1 Q13 3 20 1 L22 -2 15 -6 16 -13Z',
    ['#e4ba86','#a17a69','#715460'],-15,3);
  const d = 'M-8 -39 Q-22 -35 -23 -23 Q-26 -11 -15 -6 Q-2 0 14 -5 Q28 -8 28 -19 Q27 -34 13 -40Z';
  artPaint(c,d,['#fff2c6','#dfbd93','#bb987e','#8c6a6d'],-41,-3);
  artFill(c,'M-11 -32 Q-20 -23 -15 -13 Q-10 -7 -1 -7 Q-6 -13 -6 -21 L-4 -34Z','#fff5ca64');
  artLine(c,'M-14 -22 Q-16 -16 -12 -11 M-8 -16 Q-8 -11 -4 -9 M6 -11 Q8 -9 12 -9 M-20 -1 -14 -1 M12 -1 19 -1','#ffe2b7a0',.88);
  artFleck(c,d,-23,-39,50,35,147,108,'#fff1bd68','#8b5c6650',1.1);
  artOval(c,6,-23.8,2.65,3.4,'#4f3545',-.17);
  artOval(c,6.8,-25.1,.91,1.02,'#fff1c4');
  artOval(c,-4.1,-23,2.1,3,'#5e4151',.17);
  artOval(c,-3.6,-24.1,.73,.85,'#f8e5b5');
  artOval(c,2,-17,4.4,1.55,'#d995856b',-.12);
});

const artPinecap = artBake(-35,-66,72,44,c => {
  const d = 'M-33 -38 Q-30 -53 -17 -59 Q-9 -64 4 -61 Q18 -58 27 -48 L34 -35 Q36 -29 28 -26 Q13 -28 0 -25 Q-17 -22 -28 -25 Q-36 -29 -33 -38Z';
  artPaint(c,d,['#ffe399','#edab5d','#c16c41','#804242'],-63,-26,artInk,1.33,-12,11);
  artFill(c,'M-32 -34 Q-20 -43 -3 -40 Q7 -38 17 -39 Q29 -41 34 -33 Q35 -29 27 -27 Q16 -31 0 -26 Q-14 -22 -27 -25 Q-33 -28 -32 -34Z',
    artGradient(c,0,-42,0,-26,['#884641','#b77052','#e6ae77']));
  artLine(c,'M-32 -35 Q-23 -42 -11 -41 Q7 -37 18 -40 Q29 -41 34 -33 M-31 -30 Q-25 -24 -13 -25 Q5 -28 14 -29 Q23 -29 28 -27','#ffc986',1.15);
  for (let i = 0; i < 10; i++) {
    const x = -28 + i * 6;
    c.beginPath();
    c.moveTo(x,-30 + Math.sin(i * .65) * 2);
    c.quadraticCurveTo(x + 5,-33,x + 3,-37 + Math.sin(i) * 1.4);
    c.strokeStyle = '#f0b07b86';
    c.lineWidth = .78;
    c.stroke();
  }
  artLine(c,'M-29 -45 Q-24 -58 -11 -60 Q3 -64 15 -55 M-28 -46 Q-24 -51 -21 -53','#ffe4a6',1.25);
  for (const [x,y,r] of [[-19,-49,4],[-9,-55,3.8],[2,-50,4.6],[13,-48,2.4],[-10,-44,2.2],[-26,-43,1.5],[19,-45,1.6]]) {
    artOval(c,x,y+.9,r,r*.44,'#b2735185',-.24);
    artOval(c,x,y,r,r*.47,'#f7d291',-.24);
    artOval(c,x-.6,y-.55,r*.55,r*.19,'#fff0bb',-.24);
  }
  artFleck(c,d,-33,-62,66,38,333,145,'#fff0b754','#7b3d474b',.15);
});

const artPod = artBake(-13,-11,27,23,c => {
  artPaint(c,'M-11 0 Q-13 -6 -4 -8 Q4 -11 10 -6 Q15 -2 11 5 Q7 10 -2 9 Q-10 7 -11 0Z',
    ['#f5cb9e','#d59876','#9b615b'],-10,10,'#5e4149',1);
  artOval(c,1.5,0,8,5.75,'#864b53',-.18);
  artOval(c,2,-.25,5.9,4.1,'#432d42',-.18);
  artOval(c,2.3,1.65,3.1,1.48,'#a45d66',-.15);
  artLine(c,'M-9 -2 Q-7 -6 0 -7 M1 7 Q8 7 10 3','#ffe2a9',.83);
});

function artDrawSpitter(c, t, wind) {
  c.scale(1 + .25 * wind,1 + .065 * wind);
  artPlace(c,artSpitterBody);
  c.save();
  artPivot(c,-7,-34,-.115 + Math.sin(t * 3.7) * .06 - wind * .19);
  artPlace(c,artPinecap);
  c.restore();
  c.save();
  c.translate(19,-16);
  c.scale(.69 + .55 * wind,.61 + .57 * wind);
  artPlace(c,artPod);
  c.restore();
  if (wind > .25) {
    c.globalAlpha *= wind;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.7 + t * 3.5;
      artOval(c,25 + Math.cos(a) * (4 + wind * 9),-17 + Math.sin(a) * 10,1.05,.72,'#ffe6a9',a);
    }
  }
}

/* Thornback | a slate-gray mass, tilted tusks, and a ridge of living roots */
const artBoarLeg = artBake(-14,-15,38,41,c => {
  artPaint(c,'M-10 -12 Q-2 -17 8 -11 L12 -1 10 9 12 16 19 19 20 23 Q12 26 0 24 L-3 19 -4 11 -8 7Z',
    ['#b0b5af','#7e8792','#545c70','#404251'],-13,24,artInk,1.38);
  artPaint(c,'M-3 17 Q5 21 13 17 L19 19 20 23 Q11 26 0 24Z',
    ['#7a7679','#484650','#34303e'],17,25,'#342c38',.78);
  artLine(c,'M-6 -8 Q-.8 -12 5 -9 M-4 -4 -2 5 2 8 M2 21 6 22 M11 19 11 23','#d2c8ae87',.93);
  artLine(c,'M3 14 8 15 M2 16 8 17','#3f435968',1);
});

const artBoarRidge = artBake(-63,-97,117,72,c => {
  const d = 'M-53 -57 Q-62 -68 -59 -78 Q-55 -73 -48 -71 L-48 -78 -45 -85 Q-43 -75 -37 -73 Q-34 -82 -27 -84 L-23 -92 Q-18 -84 -21 -79 Q-17 -84 -11 -84 Q-8 -91 -2 -94 Q-5 -87 -1 -82 L5 -81 10 -89 Q15 -84 12 -77 Q20 -82 26 -77 L34 -82 Q35 -76 32 -72 Q39 -72 43 -66 L49 -68 Q43 -62 44 -55 L49 -44 39 -34 -41 -28Z';
  artPaint(c,d,['#e1a675','#9a6957','#694b4b','#463643'],-94,-37,'#2f252c',1.47);
  artLine(c,'M-55 -70 Q-44 -57 -31 -59 Q-21 -64 -14 -58 Q-1 -47 12 -55 Q27 -62 42 -52 M-46 -72 Q-44 -63 -35 -64 Q-24 -71 -23 -83 M-25 -62 Q-17 -72 -7 -72 Q0 -75 -2 -87 M-13 -59 Q-3 -60 1 -65 Q7 -70 10 -80 M6 -53 Q18 -54 22 -64 Q24 -70 31 -73 M22 -57 Q32 -60 41 -57','#3d2c36',3.25);
  artLine(c,'M-55 -71 Q-44 -59 -32 -60 Q-21 -65 -14 -60 Q-1 -50 11 -57 Q28 -64 42 -53 M-46 -75 Q-45 -65 -36 -65 Q-25 -70 -23 -85 M-27 -64 Q-18 -74 -7 -74 Q0 -77 -2 -90 M-13 -61 Q-3 -62 1 -67 Q7 -72 10 -83 M6 -55 Q18 -56 22 -66 Q24 -71 32 -75','#d19d75',1.25);
  artLine(c,'M-50 -67 -47 -65 M-34 -68 -31 -70 M-27 -79 -26 -82 M-17 -70 -14 -71 M4 -71 7 -73 M19 -62 22 -63 M29 -68 31 -70 M-31 -55 -25 -57 M-1 -56 4 -56','#efd0a181',1.06);
  artFleck(c,d,-58,-95,105,54,26,213,'#efc59457','#301e2e63',-.62);
  const leaves = 'M-44 -63 Q-50 -72 -43 -74 Q-37 -68 -44 -63 M-28 -64 Q-38 -62 -38 -58 Q-31 -56 -28 -64 M-3 -72 Q-8 -77 -5 -79 Q1 -77 -3 -72 M23 -64 Q25 -70 30 -67 Q29 -63 23 -64 M31 -55 Q34 -61 41 -58 Q36 -53 31 -55';
  artFill(c,leaves,'#919264');
  artLine(c,'M-44 -66 -43 -71 M-31 -61 -35 -60 M-3 -75 -4 -77 M26 -65 28 -66 M35 -56 39 -57','#d2bd836e',.74);
});

const artBoarBriars = artBake(-53,-96,102,44,c => {
  const stem = 'M-50 -76 Q-42 -66 -31 -69 Q-24 -73 -20 -77 Q-11 -80 -5 -72 Q2 -66 12 -70 Q20 -74 26 -73 Q32 -73 39 -65 M-30 -69 Q-29 -78 -23 -86 M-8 -75 Q-5 -78 -3 -86 M15 -71 Q17 -75 18 -84 M27 -73 Q32 -76 33 -80';
  artLine(c,stem,'#46323d',3.65);
  artLine(c,stem,'#a68160',1.72);
  artLine(c,'M-44 -73 Q-36 -66 -30 -70 Q-22 -79 -15 -77 M-10 -75 Q-2 -67 7 -69 M14 -72 Q25 -77 31 -72','#e5b782b8',.72);
  const shoots = 'M-44 -71 Q-49 -74 -50 -82 Q-43 -81 -42 -72Z M-27 -75 Q-33 -79 -29 -84 Q-23 -80 -27 -75Z M-14 -77 Q-17 -83 -11 -88 Q-9 -82 -14 -77Z M-2 -73 Q-2 -82 5 -82 Q7 -77 -2 -73Z M14 -73 Q10 -80 13 -85 Q19 -82 14 -73Z M31 -73 Q35 -79 41 -77 Q39 -71 31 -73Z';
  artPaint(c,shoots,['#e5ba7a','#a19b63','#626c53'],-88,-68,'#47383e',.61);
  artLine(c,'M-46 -75 -48 -80 M-27 -78 -29 -82 M-13 -81 -11 -86 M1 -77 4 -80 M14 -77 13 -83 M34 -74 39 -77','#ebcc8fb5',.65);
});

const artBoarBody = artBake(-65,-81,119,76,c => {
  const d = 'M-57 -28 Q-65 -46 -55 -61 Q-47 -75 -32 -78 L-26 -75 -21 -79 -17 -76 -10 -79 -7 -76 -1 -78 5 -74 Q22 -73 36 -61 L45 -51 49 -35 Q44 -19 35 -15 L32 -12 27 -16 20 -12 17 -15 12 -11 Q-7 -8 -18 -13 L-22 -12 -34 -14 -44 -11 Q-54 -14 -57 -28Z';
  artPaint(c,d,['#c4c2ad','#89989e','#687381','#53596d','#414351'],-82,-10,artInk,1.72,-51,33);
  artFill(c,'M-56 -49 Q-53 -68 -36 -72 Q-24 -78 -11 -73 Q0 -75 13 -69 Q-3 -67 -8 -56 Q-15 -47 -22 -44 Q-30 -53 -38 -50 Q-49 -46 -53 -38Z','#c7c9b78c');
  artFill(c,'M-51 -35 Q-44 -42 -36 -39 Q-31 -33 -33 -24 L-31 -15 -44 -14 Q-49 -19 -51 -35Z','#69717e');
  artFill(c,'M-23 -26 Q1 -17 10 -28 Q25 -37 29 -44 Q35 -48 42 -45 L42 -24 33 -18 29 -14 24 -17 11 -12 Q-8 -10 -24 -15Z','#40485878');
  artFill(c,'M10 -66 Q31 -64 41 -51 L46 -41 Q32 -46 23 -35 Q28 -46 21 -54 Q14 -54 10 -66Z','#a0a9a59e');
  artLine(c,'M-57 -45 Q-57 -61 -44 -69 Q-38 -73 -33 -73 M-28 -74 -23 -73 -19 -76 -15 -74 M-13 -74 -10 -76 -7 -74 2 -74 M5 -72 Q27 -70 35 -60','#f3d9a6',1.36);
  artLine(c,'M-48 -56 Q-41 -63 -35 -62 M-52 -51 -45 -55 M-47 -48 -40 -52 M-40 -44 -36 -48 M-34 -57 Q-19 -65 -4 -62 M-28 -50 -18 -56 M-24 -46 -13 -51 M-11 -56 -3 -58 M-4 -49 6 -55 M7 -47 13 -51 M15 -59 Q24 -57 28 -53 M25 -48 30 -50 M-48 -27 -45 -23 M-43 -24 -40 -21 M-17 -36 -8 -40 M-11 -32 -2 -37 M2 -32 8 -36','#e5d5ae88',1.12);
  artLine(c,'M-46 -36 Q-41 -42 -34 -38 M-37 -36 Q-31 -30 -32 -25 M-30 -45 -23 -47 M-27 -39 -20 -42 M-19 -30 -15 -32 M-16 -23 -9 -25 M20 -41 Q28 -47 34 -45','#424858a6',1.25);
  artFleck(c,d,-59,-78,107,65,66,380,'#f8e3b95a','#35364458',-.64);
  artFill(c,'M-3 -44 1 -51 4 -54 2 -49 2 -47 -2 -42Z M2 -40 7 -49 9 -50 8 -47 8 -45 4 -40Z M8 -38 12 -45 14 -46 12 -42 12 -40 9 -37Z','#e8b49aac');
});

const artBoarTail = artBake(-22,-18,28,32,c => {
  artLine(c,'M2 0 Q-12 -2 -13 -9 Q-13 -13 -8 -13 Q-4 -11 -9 -8','#302936',4.6);
  artLine(c,'M2 0 Q-12 -2 -13 -9 Q-13 -13 -8 -13 Q-4 -11 -9 -8','#969294',2.6);
  artLine(c,'M-3 -1 Q-10 -4 -12 -9 Q-12 -12 -9 -12','#e6c2a3',.72);
  artPaint(c,'M-10 -10 Q-20 -13 -20 -7 Q-14 -4 -9 -7Z',['#bda390','#655b64'],-13,-6,'#432f3d',.8);
});

const artBoarFace = artBake(-24,-44,85,68,c => {
  artPaint(c,'M39 -1 Q54 3 56 -10 Q60 5 52 11 Q45 16 36 11Z',
    ['#fff4cf','#d1b18f','#96737b'],-11,13,'#4d343e',1.02);
  const d = 'M-19 -11 Q-22 -22 -8 -28 Q2 -34 13 -26 L19 -27 Q27 -22 30 -16 Q37 -12 46 -13 L53 -9 Q60 -4 55 4 Q52 10 42 10 L36 14 28 14 22 18 18 15 14 18 10 15 6 16 Q-4 13 -10 7 L-16 1Z';
  artPaint(c,d,['#b7bbb0','#8f9ba0','#687484','#52566c'],-32,17, '#282431',1.57);
  artFill(c,'M-10 -16 Q-4 -26 7 -25 Q15 -26 23 -19 L30 -12 37 -10 Q29 -7 25 -11 Q17 -13 13 -10 Q3 -16 -6 -9Z','#c6c9b4a8');
  artFill(c,'M-4 7 Q5 6 9 1 Q15 3 19 1 Q22 8 30 9 Q43 8 47 4 L43 10 36 12 28 14 22 17 18 14 13 17 8 14 5 15Z','#494b6096');
  artLine(c,'M17 -14 Q22 -14 27 -10 L39 -8 M-5 -6 Q1 -9 9 -6 M-5 -1 2 -3 M1 3 7 1 M9 8 13 5 M12 10 16 7','#d8d5b295',1.02);
  artFleck(c,d,-20,-30,73,47,131,185,'#ede3be59','#3d405551',-.5);
  artPaint(c,'M-7 -16 Q-14 -25 -15 -37 Q-12 -43 -6 -38 Q4 -35 11 -25 L8 -19 1 -16Z',
    ['#c4b9a6','#8c909c','#62677b'],-40,-16,'#332939',1.1);
  artPaint(c,'M-11 -35 Q-4 -35 6 -25 L3 -21 -3 -21Z',['#d39f91','#a87785','#746178'],-35,-21,'#604d62',.72);
  artLine(c,'M-13 -36 -10 -38 Q0 -36 7 -28 M-6 -31 -2 -27 1 -26','#e4c2aa',.8);
  artPaint(c,'M38 -11 Q46 -16 54 -11 Q60 -8 57 1 Q52 8 42 6 Q36 4 35 -2Z',
    ['#9e9ca6','#716e83','#525268','#3f3c51'],-12,7,'#302838',1.1);
  artLine(c,'M39 -10 Q48 -13 53 -10 M43 5 Q50 6 54 2','#c7b6a783',.83);
  artOval(c,51,-4,2.75,3.06,'#322b3b',.25);
  artOval(c,52,-5.5,.75,1.2,'#c49d97',.25);
  artOval(c,43,-4,1.52,2.1,'#4a3949',.24);
  artPaint(c,'M22 7 Q31 9 38 4 Q45 0 46 -6 Q51 8 41 15 Q31 22 21 18 Q18 15 22 7Z',
    ['#fffde3','#ffe8ba','#d6b48f','#9b777b'],-6,20,'#493641',1.23);
  artLine(c,'M24 9 Q41 13 46 -1 M24 16 Q31 18 36 15','#fff3cb',1.16);
  artLine(c,'M22 16 Q28 19 34 17','#9e777d',.8);
  artOval(c,21,-8.4,4.6,3.15,'#382c3d',.18);
  artOval(c,22,-8.7,2.6,1.86,'#f7b16e',.17);
  artOval(c,22.6,-8.85,.93,1.48,'#542f39',.1);
  artOval(c,21.7,-9.47,.6,.55,'#fff2bb');
  artLine(c,'M12 -13 Q17 -15 25 -11 L28 -11','#4b4052',2.86);
  artLine(c,'M12 -14.5 Q17 -16.2 23 -13.5','#c4bbb0',.91);
});

const artEmberGlow = artBake(-16,-16,32,32,c => {
  c.fillStyle = artRadial(c,0,0,15,'#ff6f56a8','#ff483000');
  c.fillRect(-15,-15,30,30);
}, 2);

function artDrawBoar(c, t, wind, scrape, lunge, charge) {
  const rush = artClamp(lunge / 100);
  const rake = Math.sin(t * 22);
  c.save();
  c.translate(-56,-32);
  c.rotate(Math.sin(t * 5.3) * .16 + rush * .30);
  artPlace(c,artBoarTail);
  c.restore();
  c.save();
  c.translate(-33,-23);
  c.rotate(wind * .10 - rush * .34);
  c.scale(.92,1);
  c.globalAlpha *= .85;
  artPlace(c,artBoarLeg);
  c.restore();
  c.save();
  c.translate(23,-24);
  c.rotate(-rush * .66 + scrape * .18);
  c.scale(.92,1);
  c.globalAlpha *= .79;
  artPlace(c,artBoarLeg);
  c.restore();
  c.save();
  c.translate(0,scrape * 5 - rush * 5);
  artPivot(c,-17,-30,scrape * .116 + rush * .105);
  c.save();
  artPivot(c,-19,-61,Math.sin(t * 4.4) * .035 - rush * .12 + scrape * .08);
  artPlace(c,artBoarRidge);
  c.restore();
  artPlace(c,artBoarBody);
  c.save();
  artPivot(c,-19,-61,Math.sin(t * 4.4) * .035 - rush * .12 + scrape * .08);
  artPlace(c,artBoarBriars);
  c.restore();
  c.save();
  c.translate(-38,-24);
  c.rotate(rush * .44 - scrape * .16);
  artPlace(c,artBoarLeg);
  c.restore();
  c.save();
  c.translate(22 + rake * scrape * 5,-24 - (rake + 1) * scrape * 5);
  c.rotate(-scrape * (.3 + rake * .88) - rush * .72);
  artPlace(c,artBoarLeg);
  c.restore();
  c.save();
  c.translate(32 + rush * 4,-40 + scrape * 9 + wind * 3);
  c.rotate(.02 + scrape * .42 + rush * .19 + wind * .15);
  artPlace(c,artBoarFace);
  if (scrape > .03 || charge) {
    c.globalAlpha *= Math.max(scrape,.47 * rush);
    artPlace(c,artEmberGlow,22,-8);
    artOval(c,22,-8.4,1.73,1.08,'#ffb05f',.16);
  }
  c.restore();
  c.restore();
}

const artDust = artBake(-16,-16,32,32,c => {
  c.fillStyle = artRadial(c,0,0,15,'#e5b787a0','#ae775200');
  c.fillRect(-15,-15,30,30);
}, 2);
const artDebris = new Path2D('M-2.8 1 -.9 -2.2 2.4 -1.4 2.1 .8 -.4 1.9Z');

const artRushStreak = new Path2D('M0 0 Q35 -3 67 2 Q41 1 6 2Z');

function artBoarDust(c, t, scrape, rush, charge) {
  const power = Math.max(scrape,rush);
  if (power < .04) return;
  c.save();
  if (charge) {
    for (let i = 0; i < 7; i++) {
      const p = (t * 5.5 + i*.24)%1;
      c.save();
      c.translate(-33 - p*(39+i*3),-62 + i*8.8);
      c.scale(-(.64 + p * .7),1+i*.1);
      c.globalAlpha *= (1-p) * rush * .56;
      artFill(c,artRushStreak,i%3 ? '#d7b093' : '#ffc891');
      c.restore();
    }
  }
  for (let i = 0; i < 9; i++) {
    const p = (t * (scrape ? 3.4 : 4.4) + i / 9) % 1;
    const sx = scrape ? 24 - p * (24 + 7 * (i % 3)) : -17 - p * (charge ? 77 : 43) + 18 * (i % 2);
    const sy = 1 - Math.sin(p * Math.PI) * (9 + i % 4 * 3) * power + p * 4;
    c.globalAlpha = (1 - p) * (.37 + power * .63);
    artPlace(c,artDust,sx,sy);
    c.save();
    c.translate(sx + 3,sy - 4);
    c.rotate(p * 6 + i);
    const size = (.38 + (i % 3) * .28) * (.5 + power * .5);
    c.scale(size,size);
    artFill(c,artDebris,i % 2 ? '#bc895f' : '#e6ad7c');
    c.restore();
  }
  c.restore();
}

function drawMon(c, type, x, y, o) {
  const t = o.t || 0;
  const wind = o.dead ? 0 : o.wind || 0;
  const lunge = o.lunge || 0;
  const scrape = o.dead ? 0 : o.scrape || 0;
  const fade = o.dead ? Math.max(0,1 - (o.fade || 0) * 1.5) : 1;
  if (!fade) return;
  const boss = type === 'boar';
  const charge = boss && artBattleCharge(x,y);
  const rush = artClamp(lunge / (charge ? 92 : 138));
  c.save();
  c.translate(x - lunge,y);
  c.globalAlpha *= fade;
  artGroundShadow(c,0,2,boss ? 1.62 : .88,boss ? .76 : .51);
  c.scale(-1,1);
  if (boss && !o.dead) artBoarDust(c,t,scrape,rush,charge);
  c.translate(0,o.dead ? 0 : Math.sin(t * 4 + x) * (boss ? .55 : .85));
  if (o.dead) c.rotate(.19);
  if (type === 'brushfang') artDrawFox(c,t,wind,lunge,artClamp((x-lunge-326)/30));
  else if (type === 'beetle') artDrawBeetle(c,t,wind,lunge);
  else if (type === 'spitter') artDrawSpitter(c,t,wind);
  else if (boss) artDrawBoar(c,t,wind,scrape,lunge,charge);
  c.restore();
  if (o.flash > .06 && !o.dead) drawHit(c,x - lunge - (boss ? 16 : 4),y - (boss ? 43 : 24),.15 - o.flash);
}

/* Forest paintings | each palette is rasterized once at the game's backing size. */
const artForests = [
  {
    key: '#2d5a45', seed: 419, opening: [267,48], light: '#ffe6a5', shaft: '#ffe4a731',
    sky: ['#38515d','#89a497','#e4cb92','#bdbb91'],
    hills: ['#778d86','#69827b','#536e6a'],
    far: ['#819691','#708984','#647e75'], middle: ['#537468','#385b53','#627f68'],
    needles: ['#4c7557','#365d50','#23484a'], wood: ['#756754','#3b4c43','#203d3d'],
    bank: ['#788368','#4d6855','#243f3d'], road: ['#bab18c','#8e795f','#7c6756','#504d43'],
    track: '#513b3439', trackLight: '#ffe4aa36',
    moss: ['#566c50','#314e44','#1d3835'], grass: ['#9ca773','#708c62','#aec283'],
    rock: ['#b2ab8d','#706c61','#4d514b'], flora: ['#e6bc80','#e2d5a4','#ce9c72']
  },
  {
    key: '#27495a', seed: 97, opening: [198,65], light: '#c2edbf', shaft: '#bbeed82b',
    sky: ['#162e42','#385e6b','#7fa992','#8cb19c'],
    hills: ['#587e7c','#476f70','#365c62'],
    far: ['#57807b','#446f70','#355f65'], middle: ['#396367','#284f57','#4d786c'],
    needles: ['#355d58','#284e50','#15363d'], wood: ['#617269','#314e52','#192f3b'],
    bank: ['#65887a','#425f60','#1b3b44'], road: ['#94a99a','#6b7b73','#59655e','#39484b'],
    track: '#1e3b4748', trackLight: '#b3dac83a',
    moss: ['#516d5c','#32544e','#1b3a43'], grass: ['#80a788','#588178','#a4ba88'],
    rock: ['#99a9a2','#626f76','#374a55'], flora: ['#afcfd6','#a5c6aa','#dcc0a1']
  },
  {
    key: '#5a4a3a', seed: 751, opening: [238,59], light: '#ffcf84', shaft: '#ffb76737',
    sky: ['#483143','#77514d','#c18055','#de9d65'],
    hills: ['#ae785e','#90645a','#755657'],
    far: ['#a17b62','#84665b','#775b55'], middle: ['#75564e','#503e45','#947153'],
    needles: ['#6c5149','#534044','#342e3a'], wood: ['#88614d','#523c3e','#2e2734'],
    bank: ['#887354','#625141','#3b3038'], road: ['#b68e67','#967154','#755846','#4e403d'],
    track: '#502f354a', trackLight: '#ffcf913c',
    moss: ['#715b49','#524538','#302b35'], grass: ['#b28d5a','#846b4c','#c0a570'],
    rock: ['#b6a087','#786756','#4a4548'], flora: ['#e5a25d','#d5b07c','#c47a61']
  }
];
const artRoads = [
  new Path2D('M-10 175 C41 160 91 170 144 154 C205 135 218 132 262 129 C232 139 226 146 248 152 C290 167 346 155 410 161 V241 C355 243 319 250 272 244 C222 240 199 241 158 248 C105 251 38 238 -10 244Z'),
  new Path2D('M-10 179 C38 173 67 179 109 165 C130 158 140 141 201 130 C178 142 176 153 213 158 C280 171 355 157 410 169 V241 C355 244 307 249 262 244 C220 240 192 241 151 247 C108 255 33 237 -10 242Z'),
  new Path2D('M-10 176 C61 166 115 177 165 162 C192 154 270 144 310 130 C297 140 280 150 293 156 C322 166 369 154 410 160 V238 C356 236 331 250 273 244 C213 234 184 244 154 248 C103 254 43 240 -10 244Z')
];
const artGroundLip = new Path2D('M-10 235 C31 230 48 247 95 244 Q113 240 143 249 C190 250 211 234 251 240 C293 249 335 246 360 238 Q382 227 410 233 V270 H-10Z');
const artRuts = [
  new Path2D('M-10 195 C56 190 108 196 165 179 C212 165 231 157 273 161 Q332 168 410 153'),
  new Path2D('M-10 218 C63 215 106 222 167 204 C228 187 257 180 299 184 Q355 190 410 178'),
  new Path2D('M-10 232 C72 226 95 237 157 222 C234 202 274 197 325 206 Q356 213 409 198')
];
const artScenes = new Map();
let artLastSky;
let artLastScene;

function artHills(c, p, r) {
  for (let j = 0; j < 3; j++) {
    c.beginPath();
    c.moveTo(-30,104 + j * 10);
    let prevY = 90 + j * 14;
    for (let x = -20; x < 441; x += 45) {
      const skyGap = 13 * Math.sin((x - p.opening[0] + 92) * .013);
      const next = 68 + j * 11 + skyGap + r() * (j === 0 ? 37 : 24);
      c.bezierCurveTo(x - 37,prevY - 4,x - 11,next - 4,x,next);
      prevY = next;
    }
    c.lineTo(430,155); c.lineTo(-30,155); c.closePath();
    c.fillStyle = artGradient(c,0,63 + j * 11,0,152,[p.hills[j],p.sky[3]]);
    c.fill();
  }
}

function artTree(c, r, x, y, h, w, fill, light = null, wood = null) {
  const lean = (r() - .5) * w * .35;
  c.save();
  c.translate(x,y);
  c.beginPath();
  c.moveTo(lean,-h);
  for (let j = 1; j <= 9; j++) {
    const k = j / 9;
    const wx = (k * .84 + .10) * w;
    const cy = -h + h * k;
    const dx = lean * (1 - k);
    c.quadraticCurveTo(dx + wx * .49,cy - h * .115,dx + wx * (.84 + r() * .34),cy - h * (r() * .025));
    c.lineTo(dx + wx * (.55 + r() * .16),cy - h * .013);
    if (j < 9) c.lineTo(dx + wx * .38,cy - h * (.055 + r() * .026));
  }
  c.lineTo(w * .11,0); c.lineTo(w * .10,7); c.lineTo(-w * .10,7); c.lineTo(-w * .11,-1);
  for (let j = 9; j >= 1; j--) {
    const k = j / 9;
    const wx = (k * .88 + .10) * w;
    const cy = -h + h * k;
    const dx = lean * (1 - k);
    c.lineTo(dx - wx * (.71 + r() * .10),cy + h * .004);
    c.lineTo(dx - wx * (.89 + r() * .30),cy - h * .019);
    c.quadraticCurveTo(dx - wx * .48,cy - h * .046,dx - wx * .29,cy - h * .12);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (light) {
    c.save();
    c.clip();
    if (wood) {
      c.beginPath(); c.moveTo(lean,-h * .90); c.quadraticCurveTo(lean * .2,-h * .5,0,7);
      c.strokeStyle = wood; c.lineWidth = w * .16; c.stroke();
    }
    for (let j = 1; j < 9; j++) {
      const k = j / 9;
      const cy = -h + h * k;
      const wx = (k * .84 + .10) * w;
      c.beginPath();
      c.moveTo(lean * (1 - k) - 1,cy - h * .103);
      c.quadraticCurveTo(-wx * .18,cy - h * .03,-wx * (.6 + r() * .28),cy + h * .017);
      c.moveTo(1,cy - h * .08);
      c.quadraticCurveTo(wx * .25,cy - h * .023,wx * (.45 + r() * .24),cy + h * .017);
      c.strokeStyle = light;
      c.lineWidth = h * (.005 + r() * .012);
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const side = i % 2 ? 1 : -1;
        const dx = side * wx * (.15 + r() * .7);
        artOval(c,dx,cy - h * (.04 + r() * .07),h * (.012 + r() * .025),h * .004,light,side * .65);
      }
    }
    c.restore();
  }
  c.restore();
}

function artTreeLines(c, p, r) {
  for (let j = 0; j < 3; j++) {
    const pitch = 6 + j * 4;
    for (let x = -10; x < 418; x += pitch) {
      const open = Math.max(0,1 - Math.abs(x - p.opening[0]) / (92 + j * 9));
      const h = (17 + 14 * j + r() * (17 + j * 7)) * (1 - open * .37);
      const y = 117 + j * 9 + r() * 10;
      artTree(c,r,x + (r() - .5) * pitch,y,h,h * (.17 + r() * .11),p.far[j]);
    }
    const mist = artGradient(c,0,108 + j * 7,0,137 + j * 5,['#ffffff00',p.sky[3] + '62','#ffffff00']);
    c.fillStyle = mist;
    c.fillRect(0,107 + j * 7,400,35);
  }
  for (let i = 0; i < 26; i++) {
    const x = i * 16.25 + r() * 13 - 8;
    const open = Math.max(0,1 - Math.abs(x - p.opening[0]) / 100);
    if (open > .68 && r() < .64) continue;
    const y = 137 + r() * 15;
    const h = (47 + r() * 63) * (1 - open * .3);
    const fill = artGradient(c,0,y-h,0,y,p.middle);
    artTree(c,r,x,y,h,h * (.18 + r() * .09),fill,p.middle[2]+'89',p.wood[0]+'a0');
  }
}

function artShafts(c, p) {
  const [x,y] = p.opening;
  c.save();
  c.globalCompositeOperation = 'screen';
  c.fillStyle = artRadial(c,x,y,79,p.light + '8e',p.light + '00');
  c.fillRect(x - 79,y - 79,158,158);
  for (let i = 0; i < 6; i++) {
    const x0 = x - 63 + i * 15;
    const y0 = y - 38 + i * 2;
    const x1 = x0 - 62 - 9 * i;
    const y1 = 186 + 5 * i;
    const blur = artGradient(c,x0,y0,x1,y1,[p.light + '00',p.shaft,p.light + '00']);
    c.beginPath();
    c.moveTo(x0,y0);
    c.lineTo(x0 + 8 + i,y0 + 1);
    c.lineTo(x1 + 15 + i * 8,y1);
    c.lineTo(x1,y1);
    c.closePath();
    c.fillStyle = blur;
    c.fill();
  }
  c.restore();
}

function artSkyWash(c,p,r,stage) {
  const x = p.opening[0];
  for (let i = 0; i < 11; i++) {
    const y = 10 + i*7 + r()*11;
    const drift = (r()-.5)*167;
    const w = 30+r()*111;
    const h = 3+r()*19;
    c.save();
    c.translate(x+drift,y);
    c.rotate(-.072 + r()*.074);
    c.scale(1,h/w);
    c.fillStyle = artRadial(c,0,0,w,i%3 ? p.light+'31' : p.hills[1]+'55');
    c.fillRect(-w,-w,w*2,w*2);
    c.restore();
    if (stage === 2 && i%3===0) {
      c.beginPath();
      c.moveTo(x+drift-w*.8,y+2);
      c.bezierCurveTo(x+drift-w*.3,y-3,x+drift+w*.15,y-3,x+drift+w*.60,y-4);
      c.strokeStyle=p.light+'25'; c.lineWidth=.85; c.stroke();
    }
  }
}

function artTrunk(c, p, seed, x, y, h, w, lean, roots) {
  const r = artRandom(seed);
  c.save();
  c.translate(x,y);
  const d = `M${-w * 1.65} 3 Q${-w * .87} -7 ${-w * .54} -19 Q${-w * .45} ${-h * .39} ${lean - w * .42} ${-h} L${lean + w * .37} ${-h} Q${w * .29} ${-h * .31} ${w * .53} -15 Q${w * .79} -3 ${w * 1.45} 4 L${w * .60} 2 ${w * .20} -1 ${-w * .2} 2 ${-w * .76} 1Z`;
  artPaint(c,d,p.wood,-h,5,p.wood[2],1.15,lean - w,w);
  c.save();
  c.clip(new Path2D(d));
  for (let i = 0; i < (w > 20 ? 36 : 15); i++) {
    const pos = (r() - .48) * w;
    const top = -h + r() * h * .92;
    const bottom = Math.min(4,top + 14 + r() * h * .60);
    c.beginPath();
    c.moveTo(pos + lean * (-top / h),top);
    c.bezierCurveTo(pos + lean * (-top / h) * .86,artMix(top,bottom,.25),pos + (r() - .5) * w * .25,artMix(top,bottom,.78),pos * 1.32,bottom);
    c.strokeStyle = i % 3 ? p.wood[0]+'80' : p.wood[2]+'b7';
    c.lineWidth = .4 + r() * 1.6;
    c.stroke();
  }
  c.restore();
  for (let j = 0; j < roots; j++) {
    const side = j % 2 ? 1 : -1;
    const len = w * (1.7 + r() * 2.05);
    const dy = 2 + r() * 21;
    const cy = -12 - j % 4 * 4;
    const start = side * w * (.12 + r() * .35);
    const root = `M${start} ${cy} C${side * w * .66} -6 ${side * len * .78} ${dy - 12} ${side * len} ${dy} C${side * len * .67} ${dy - 5} ${side * w * .53} ${dy + 5} ${start * .5} 2Z`;
    artPaint(c,root,[p.wood[0],p.wood[1],p.wood[2]],cy,dy,p.wood[2],.83);
    artLine(c,`M${start} ${cy + 3} Q${side * w * .56} -1 ${side * len * .79} ${dy - 2}`,p.wood[0]+'d4',.83);
    artLine(c,`M${side * w * .63} -1 Q${side * w * .87} 2 ${side * len * .65} ${dy - 1}`,p.grass[1]+'8c',1);
  }
  c.restore();
}

function artBranch(c, p, r, x, y, len, angle, depth) {
  c.save();
  c.translate(x,y);
  c.rotate(angle);
  const turn = (r() - .51) * len * .26;
  const w = len * .09;
  const twig = `M${-w} 3 Q${-w * .9} ${-len * .45} ${turn} ${-len} Q${w * .8} ${-len * .53} ${w * .67} 0Z`;
  artPaint(c,twig,[p.wood[0],p.wood[1],p.wood[2]],-len,0,p.wood[2],.66,-w,w);
  artLine(c,`M${-w * .24} -1 Q${-w * .59} ${-len * .54} ${turn * .88} ${-len * .9}`,p.wood[0]+'c9',.71);
  if (depth > 0) {
    artBranch(c,p,r,turn * .36,-len * .59,len * (.42 + r() * .19),-.53 - r() * .46,depth - 1);
    artBranch(c,p,r,turn * .38,-len * .42,len * (.44 + r() * .22),.58 + r() * .44,depth - 1);
    artBranch(c,p,r,turn * .73,-len * .82,len * .32,.24 + r() * .41,depth - 1);
  }
  c.restore();
}

function artOverhang(c,p,r) {
  const banks = [
    [-8,-11,77,59], [38,-9,61,39], [86,-13,56,39], [119,-23,48,35],
    [329,-25,57,43], [376,-8,60,45], [417,9,48,55]
  ];
  for (const [x,y,w,h] of banks) {
    c.save();
    c.translate(x,y);
    const silhouette = new Path2D();
    silhouette.moveTo(w,0);
    for (let i=1;i<=40;i++) {
      const a=i*artTau/40;
      const bump=.76+r()*.24;
      const px=Math.cos(a)*w*bump, py=Math.sin(a)*h*bump;
      const previous=a-artTau/80;
      silhouette.quadraticCurveTo(Math.cos(previous)*w,Math.sin(previous)*h,px,py);
    }
    silhouette.closePath();
    artFill(c,silhouette,artGradient(c,0,-h,0,h,[p.wood[2],p.needles[2],p.needles[0]]));
    c.clip(silhouette);
    for (let i=0;i<165;i++) {
      const px=(r()-.5)*w*2, py=(r()-.30)*h*1.66;
      artOval(c,px,py,1.5+r()*4.3,.65+r()*1.7,p.grass[i%3]+'28',-.69+r()*1.04);
    }
    c.restore();
  }
}

function artBrambles(c, p, r, x, y, size, dir) {
  c.save();
  c.translate(x,y);
  c.scale(dir,1);
  for (let i = 0; i < 7; i++) {
    const end = 11 + r() * size;
    const high = size * (.24 + r() * .58);
    const dx = (r() - .55) * size * .36;
    const d = `M${dx} 3 C${dx - 10} ${-high * .87} ${end * .53} ${-high * 1.18} ${end} ${-high * .68}`;
    artLine(c,d,p.wood[2],2.1 + r() * 2.1);
    artLine(c,d,p.wood[0],.61);
    for (let j = 0; j < 5; j++) {
      const q = .20 + j * .15;
      const nx = (1-q)**3*dx + 3*(1-q)**2*q*(dx-10) + 3*(1-q)*q*q*(end*.53) + q**3*end;
      const ny = (1-q)**3*3 + 3*(1-q)**2*q*(-high*.87) + 3*(1-q)*q*q*(-high*1.18) - q**3*high*.68;
      const tip = (j % 2 ? 1 : -1) * (3 + r() * 4);
      artFill(c,`M${nx - 3} ${ny + .8} Q${nx - 2} ${ny + tip * .76} ${nx + tip * .4} ${ny + tip} L${nx + 1} ${ny + .1}Z`,i % 2 ? p.wood[2] : p.wood[1]);
      if ((i + j) % 4 === 0) artOval(c,nx+1,ny-1,1.25,1.18,p.flora[2]);
    }
  }
  c.restore();
}

function artRock(c, p, r, x, y, scale) {
  c.save();
  c.translate(x,y);
  c.scale(scale,scale * (.74 + r() * .34));
  c.rotate((r() - .5) * .17);
  artOval(c,0,1,15,3.7,'#17232860');
  artPaint(c,'M-13 -.5 -11 -6 -5 -12 3 -13 9 -10 14 -4 11 0 4 2 -8 2Z',p.rock,-13,2,p.wood[2],.66,-8,10);
  artFill(c,'M-11 -6 -5 -12 3 -13 8 -10 3 -6 -4 -5 -10 -3Z',p.rock[0]+'b3');
  artFill(c,'M-3 -6 3 -6 9 -10 14 -4 11 0 3 2 -3 .5Z',p.rock[2]+'6a');
  artLine(c,'M-10 -5 -5 -11 1 -12 M-3 -5 -6 -.5 M4 -5 10 -3',p.rock[0],.72);
  artLine(c,'M-5 -10 -2 -10 0 -8 M-11 -2 -7 -1',p.grass[1],1.08);
  c.restore();
}

function artGrass(c, r, x, y, size, colors, count) {
  c.save();
  c.translate(x,y);
  for (let i = 0; i < count; i++) {
    const bx = (r() - .5) * size * .85;
    const dx = bx + (r() - .5) * size * 1.13;
    const h = 1 + r() * size * .93;
    const w = .28 + r() * size * .14;
    c.beginPath();
    c.moveTo(bx - w,0);
    c.quadraticCurveTo(bx - w,-h * .57,dx,-h);
    c.quadraticCurveTo(bx + w * .8,-h * .36,bx + w,0);
    c.fillStyle = colors[i % colors.length];
    c.fill();
  }
  c.restore();
}

function artFern(c, p, seed, x, y, scale, front = false) {
  const r = artRandom(seed);
  c.save();
  c.translate(x,y);
  c.scale(scale,scale);
  for (let i = 0; i < 5; i++) {
    const dir = (i - 2) * .62 + (r() - .5) * .4;
    const len = 13 + r() * 12;
    c.save();
    c.rotate(dir);
    c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(2,-len * .53,-2,-len);
    c.strokeStyle = p.grass[1]; c.lineWidth = .86; c.stroke();
    for (let j = 1; j <= 7; j++) {
      const k = j / 8;
      const yy = -len * k;
      const xx = 4 * k - 6 * k * k;
      const wing = len * (.29 * Math.sin(k * Math.PI) + .02);
      c.beginPath();
      c.moveTo(xx,yy + 2);
      c.quadraticCurveTo(xx - wing * .72,yy + 1,xx - wing,yy - 4);
      c.quadraticCurveTo(xx - wing * .45,yy - 4,xx,yy);
      c.quadraticCurveTo(xx + wing * .59,yy - 6,xx + wing,yy - 5);
      c.quadraticCurveTo(xx + wing * .63,yy,xx,yy + 2);
      c.fillStyle = p.grass[(i + j) % (front ? 3 : 2)];
      c.fill();
    }
    c.restore();
  }
  c.restore();
}

function artFlowers(c,p,r,x,y,size) {
  for (let i = 0; i < 4; i++) {
    const dx = (r() - .5) * size;
    const dy = -r() * size * .59 - 3;
    c.beginPath(); c.moveTo(x + dx * .47,y); c.quadraticCurveTo(x + dx * .43,y + dy * .7,x + dx,y + dy);
    c.strokeStyle = p.grass[1]; c.lineWidth = .77; c.stroke();
    artOval(c,x+dx,y+dy,1.25,.85,p.flora[i % 3],-.32);
    artOval(c,x+dx-.9,y+dy+.2,.48,.55,p.flora[(i+1)%3]);
  }
}

function artGround(c,p,r,stage) {
  c.fillStyle = artGradient(c,0,118,0,212,p.bank);
  c.fillRect(0,145,400,115);
  artFill(c,'M0 152 C49 141 85 147 124 145 Q160 135 215 136 L272 124 288 132 Q311 131 343 133 T400 133 V157 Q365 166 323 161 Q285 173 246 168 L0 192Z',artGradient(c,0,122,0,175,p.bank));
  for (let i = 0; i < 240; i++) {
    const x = r() * 400, y = 126 + r() * 48;
    artOval(c,x,y,.6+r()*4,.18+r()*.55,i % 4 ? p.moss[i % 3]+'80' : p.grass[i % 3]+'91',-.12);
  }
  const road = artRoads[stage];
  artFill(c,road,artGradient(c,172,131,195,252,p.road));
  c.save();
  c.clip(road);
  c.save();
  c.translate(p.opening[0]-44,171);
  c.rotate(-.30);
  c.scale(1,.20);
  c.fillStyle = artRadial(c,0,0,102,p.light+'30');
  c.fillRect(-102,-102,204,204);
  c.restore();
  for (let i = 0; i < 45; i++) {
    const x = r() * 435 - 17;
    const y = 132 + r() * 111;
    c.save();
    c.translate(x,y);
    c.scale(1,.13 + r() * .19);
    const rad = 8 + r() * 48;
    c.fillStyle = artRadial(c,0,0,rad,i % 2 ? p.road[0]+'48' : p.road[3]+'76');
    c.fillRect(-rad,-rad,rad*2,rad*2);
    c.restore();
  }
  c.strokeStyle = p.track;
  for (let i = 0; i < artRuts.length; i++) {
    c.lineWidth = 4.3 + i * 2.1;
    c.stroke(artRuts[i]);
  }
  c.save();
  c.translate(0,4.3);
  for (let i = 0; i < artRuts.length; i++) artLine(c,artRuts[i],p.trackLight,1.28+i*.38);
  c.restore();
  for (let i = 0; i < 1200; i++) {
    const x = r() * 400, y = 130 + r() * 130;
    const scale = .5 + (y - 130) * .007;
    artOval(c,x,y, (.20 + r()*3.3) * scale,(.12 + r()*.64)*scale,i % 3 ? p.road[3]+'51' : p.road[0]+'78',-.17 + r() * .3);
  }
  for (let i = 0; i < 46; i++) {
    const x = r()*400, y = 149 + r()*97;
    const n = .09 + r() * .16;
    artRock(c,p,r,x,y,n);
  }
  c.restore();
  const shoulders = [
    'M0 174 C47 161 92 169 134 157 Q166 149 190 144 M249 150 Q268 159 300 160 M329 162 Q364 155 400 161',
    'M0 178 C46 172 75 176 109 165 Q129 158 140 147 M224 159 Q276 167 309 163 M347 163 Q377 162 400 168',
    'M0 175 C44 167 105 173 151 166 Q188 155 208 153 M295 156 Q325 163 352 158 M365 157 Q389 156 400 159'
  ];
  artLine(c,shoulders[stage],p.grass[1]+'a8',1.5);
  for (let i = 0; i < 65; i++) {
    const x = r() * 400;
    const y = x < 177 ? 166 + 3 * Math.sin(x*.033) - x * .055 : 151 + 9 * Math.sin((x-200)*.008);
    artGrass(c,r,x,y + r() * 5,1.8 + r() * 4.5,p.grass,3);
  }
}

function artFrame(c,p,r,stage) {
  if (stage === 0) {
    artTrunk(c,p,78,13,161,184,16,-20,5);
    artTrunk(c,p,29,390,153,177,20,15,6);
    artTrunk(c,p,68,42,138,164,5,-7,3);
    artTree(c,r,-4,144,173,47,artGradient(c,0,-16,0,148,p.needles),p.grass[1]+'75',p.wood[0]);
    artTree(c,r,392,143,158,40,artGradient(c,0,0,0,150,p.needles),p.grass[1]+'68',p.wood[0]);
    artTree(c,r,41,145,149,26,artGradient(c,0,0,0,152,p.needles),p.grass[1]+'65',p.wood[0]);
    artRock(c,p,r,109,167,.67);
    artRock(c,p,r,113,164,.35);
    artFlowers(c,p,r,98,172,11);
  } else if (stage === 1) {
    artTrunk(c,p,301,12,167,188,39,-38,9);
    artTrunk(c,p,144,400,151,181,39,10,9);
    artBranch(c,p,r,27,76,116,1.06,3);
    artBranch(c,p,r,386,60,101,-1.03,3);
    artOverhang(c,p,r);
    artRock(c,p,r,92,160,1.25);
    artRock(c,p,r,107,165,.77);
    artRock(c,p,r,350,155,.86);
    for (let i=0; i<9; i++) {
      const x = 11 + i * 5 + r() * 5, y = 163 - r()*7, h = 3 + r()*4;
      c.fillStyle = p.rock[0]; c.fillRect(x-.4,y-h,.8,h);
      artOval(c,x,y-h,h*.46,1.25,i%2 ? '#5e9b9b' : '#a2c2aa');
      artOval(c,x-.55,y-h-.5,.85,.27,'#d7e1bb');
    }
  } else {
    artTrunk(c,p,263,6,160,184,18,-9,5);
    artTrunk(c,p,81,393,151,180,20,10,5);
    artBranch(c,p,r,0,84,105,1.0,3);
    artBranch(c,p,r,397,72,102,-1.05,3);
    artBranch(c,p,r,393,100,64,-.38,2);
    artBrambles(c,p,r,3,160,110,1);
    artBrambles(c,p,r,397,150,116,-1);
    artBrambles(c,p,r,335,148,66,1);
    artRock(c,p,r,324,154,.77);
    artRock(c,p,r,338,148,.63);
  }
}

function artForeground(c,p,r,stage) {
  artFill(c,artGroundLip,artGradient(c,0,233,0,260,p.moss));
  c.save();
  c.clip(artGroundLip);
  for (let i = 0; i < 510; i++) {
    const x = r()*400, y = 229 + r()*34;
    artOval(c,x,y,.2+r()*3.6,.2+r()*.72,(i%3 ? p.moss[i%3] : p.grass[1])+'87',-.35);
  }
  c.restore();
  for (let i = 0; i < 122; i++) {
    const x = r()*400, y = 246 + Math.sin(x * .022) * 4 + r()*17;
    artGrass(c,r,x,y,2.7 + r() * 9,p.grass,4);
  }
  artRock(c,p,r,17,243,1.01);
  artRock(c,p,r,25,248,.57);
  artRock(c,p,r,369,246,1.03);
  artRock(c,p,r,385,247,.65);
  artRock(c,p,r,208,248,.48);
  artFern(c,p,62,32,254,1.11,true);
  artFern(c,p,99,13,257,.88);
  artFern(c,p,136,379,254,1.1,true);
  artFern(c,p,69,352,251,.8);
  artFlowers(c,p,r,42,253,14);
  artFlowers(c,p,r,327,251,13);
  if (stage === 2) {
    artBrambles(c,p,r,-6,260,41,1);
    artBrambles(c,p,r,401,264,52,-1);
  }
  const g = c.createRadialGradient(204,135,88,202,135,240);
  g.addColorStop(0,'#14142200');
  g.addColorStop(.64,'#18162226');
  g.addColorStop(1,'#151321ad');
  c.fillStyle = g;
  c.fillRect(0,0,400,260);
}

function artPaintForest(c,p,stage) {
  const r = artRandom(p.seed);
  c.fillStyle = artGradient(c,0,-7,15,154,p.sky);
  c.fillRect(0,0,400,260);
  const [x,y] = p.opening;
  c.fillStyle = artRadial(c,x,y,100,p.light+'d7',p.light+'00');
  c.fillRect(x-100,y-100,200,200);
  artSkyWash(c,p,artRandom(p.seed+516),stage);
  if (stage !== 1) {
    artOval(c,x,y,stage === 0 ? 12.5 : 10.5,stage === 0 ? 12.5 : 10.5,p.light+'c5');
    artOval(c,x-.2,y-.3,stage === 0 ? 10.9 : 8.7,stage === 0 ? 10.9 : 8.7,artRadial(c,x-1,y-2,15,'#fff1c8',p.light+'af'));
  }
  artHills(c,p,r);
  artTreeLines(c,p,r);
  artShafts(c,p);
  artGround(c,p,r,stage);
  artFrame(c,p,r,stage);
  artForeground(c,p,r,stage);
}

function artGetScene(sky) {
  if (artLastScene && sky === artLastSky) return artLastScene;
  const key = sky ? sky[0] + '|' + sky[1] : '#2d5a45|#14301f';
  artLastSky = sky;
  let scene = artScenes.get(key);
  if (scene) return artLastScene = scene;
  const stage = Math.max(0,artForests.findIndex(p => key.startsWith(p.key)));
  const p = artForests[stage];
  scene = {
    view: artBake(0,0,400,260,c=>artPaintForest(c,p,stage),2),
    fernA: artBake(-32,-30,64,36,c=>artFern(c,p,223,0,0,.86,true),2),
    fernB: artBake(-32,-30,64,36,c=>artFern(c,p,885,0,0,.77,true),2),
    motes: [],
    lights: p.flora
  };
  const r = artRandom(p.seed + 74);
  for (let i = 0; i < 18; i++) {
    scene.motes.push({x:r()*400,y:24+r()*205,s:.3+r(),w:2+r()*12,a:r()*artTau,v:.36+r()*.77});
  }
  artScenes.set(key,scene);
  artLastScene = scene;
  return scene;
}

const artMoteGlow = artBake(-7,-7,14,14,c=>{
  c.fillStyle=artRadial(c,0,0,6,'#ffe49c8e','#ffe49c00');
  c.fillRect(-6,-6,12,12);
},2);
const artLeaf = new Path2D('M-4 0 Q-.8 -4.1 4 0 Q.5 2.6 -4 0Z');

function artAir(c,scene,t) {
  c.save();
  for (let i = 0; i < scene.motes.length; i++) {
    const m = scene.motes[i];
    const x = m.x + Math.sin(t*m.v + m.a)*m.w;
    const y = m.y + Math.sin(t*m.v*.62 + m.a*2)*m.w*.78;
    c.globalAlpha = .34 + .34*Math.sin(t*1.7 + m.a);
    if (i % 4 === 0) artPlace(c,artMoteGlow,x,y);
    artOval(c,x,y,m.s*.77,m.s*.54,scene.lights[i%3],-.24);
  }
  for (let i = 0; i < 4; i++) {
    const phase = (t*.115+i*.231)%1;
    c.save();
    c.translate(((i*137+105+t*(7+i*1.7))%440)-20,25+i*31+phase*47+Math.sin(t*1.7+i)*4);
    c.rotate(t*1.6+i);
    c.scale(.41+i*.07,.64);
    c.globalAlpha = Math.sin(phase*Math.PI)*.62;
    artFill(c,artLeaf,scene.lights[i%3]);
    c.restore();
  }
  c.globalAlpha = .86;
  c.translate(63,255);
  c.rotate(Math.sin(t*1.9)*.09);
  artPlace(c,scene.fernA);
  c.restore();
  c.save();
  c.globalAlpha = .86;
  c.translate(393,252);
  c.rotate(Math.sin(t*2.1+1.4)*.10);
  artPlace(c,scene.fernB);
  c.restore();
}

const artLane = artBake(0,-22,174,44,c=>{
  c.save();
  c.scale(1,.16);
  c.fillStyle=artRadial(c,94,0,84,'#fd6c465e','#ff694400');
  c.fillRect(5,-84,168,168);
  c.restore();
  artFill(c,'M6 0 24 -9 23 -6 163 -12 168 -8 168 8 163 12 23 6 24 10Z','#f34b302a');
  artLine(c,'M7 0 24 -9 24 -6 163 -12 M7 0 24 10 24 6 163 12','#ff8d59',.99);
  artLine(c,'M31 0 43 -.5 M51 -.9 73 -.7 M84 -1 106 -1 M118 -1.25 145 -2','#f7b578a5',.76);
},2);
const artCracks = new Path2D('M-28 2 -15 0 -5 4 0 1 9 5 17 2 23 5 35 4 M-19 5 -14 1 -10 -4 -5 -5 M-5 4 -7 8 -13 9 M10 4 7 -1 15 -4 M18 3 17 8 22 10 M-34 7 -29 5 -26 7 M30 -2 33 1 39 2');

function artCurrentBattle() {
  // The gallery also supplies B while drawing each landscape.
  return typeof B === 'undefined' ? null : B;
}

function artBattleCharge(x,y) {
  const battle=artCurrentBattle();
  if (!battle || !battle.enemies) return false;
  for (const e of battle.enemies) {
    if (e.type === 'boar' && e.x === x && e.y === y && e.lunge > 0 && e.lungeDur > .4) return true;
  }
  return false;
}

function artBattleGround(c,battle) {
  if (!battle || !battle.enemies) return;
  for (const e of battle.enemies) {
    if (!(typeof MON !== 'undefined' && MON[e.type] && MON[e.type].charge) || e.dead) continue;
    const scrape = e.kind === 'charge' && e.state === 'wind';
    const rush = e.lunge > 0 && e.lungeDur > .4;
    if (!scrape && !rush) continue;
    const progress = scrape ? artClamp(e.wt/e.wd) : e.lunge/e.lungeDur;
    const pulse = .74 + .26*Math.sin(battle.t*20);
    c.save();
    c.translate(132,e.y + 4);
    c.scale((e.x + 6 - 132)/170,1);
    c.globalAlpha = scrape ? (.32 + .67*progress)*pulse : progress*.84;
    artPlace(c,artLane);
    for (let i=0; i<4; i++) {
      const u = (battle.t * (scrape ? 1.7 : 3.8) + i*.25)%1;
      const x = 23+(1-u)*121;
      const y = 2 + Math.sin(i*2)*1.1;
      c.beginPath();
      c.moveTo(x+4,y-3); c.lineTo(x-2,y); c.lineTo(x+4,y+3);
      c.strokeStyle = '#ffd19e';
      c.lineWidth = .91 + progress*.6;
      c.stroke();
    }
    c.restore();
    c.save();
    c.translate(e.x-26,e.y+5);
    const size = .45 + .55*progress;
    c.scale(size,size);
    c.globalAlpha = .52 + .45*progress;
    artLine(c,artCracks,'#381f29',1.62);
    c.translate(0,1);
    artLine(c,artCracks,'#ed9b645f',.68);
    c.restore();
  }
}

function drawBackground(c) {
  const battle = artCurrentBattle();
  const scene = artGetScene(battle && battle.spec && battle.spec.sky);
  const t = battle && battle.t || 0;
  c.save();
  artPlace(c,scene.view);
  artAir(c,scene,t);
  artBattleGround(c,battle);
  c.restore();
}

/* Optional HUD and combat-effect hooks. The preview exercises these directly. */

const artHealthFrame = artBake(-23,-5,46,16,c=>{
  artPaint(c,'M-22 2 -17 -1.5 H17 L22 2 17 6.5 H-17Z',
    ['#af9371','#665551','#3a3138'],-2,7,'#271f2b',.65);
  artFill(c,'M-18 2 -16.7 .1 H16.7 L18 2 16.7 5 H-16.7Z','#28242d');
  artLine(c,'M-17 -.65 H17 M-16.6 5.9 H16.6','#d0ac78a0',.45);
  artOval(c,-20,2.2,.66,.7,'#f8db9e');
  artOval(c,20,2.2,.66,.7,'#f8db9e');
},2);
const artHealthLevels = [
  artHealthStrip(['#e7efaa','#a2d283','#59966d']),
  artHealthStrip(['#ffe0a0','#e78a62','#a84848'])
];

function artHealthStrip(colors) {
  return artBake(0,0,36,4,c=>{
    c.fillStyle=artGradient(c,0,0,0,4,colors);
    c.fillRect(0,0,36,4);
  },2);
}

function drawHpBar(c, x, y, w, frac, kind) {
  const level=artClamp(frac);
  const frameWidth=artHealthFrame.w*w/36;
  c.drawImage(artRaster(artHealthFrame),x-frameWidth/2,y+artHealthFrame.y,frameWidth,artHealthFrame.h);
  if (level > 0) {
    const fill=artRaster(artHealthLevels[kind==='enemy' ? 1 : 0]);
    c.drawImage(fill,0,0,fill.width*level,fill.height,x-w/2,y+.65,w*level,4);
  }
}

const artBarrierLight = artBake(-106,-88,212,176,c=>{
  c.save();
  c.scale(1,.82);
  const g=c.createRadialGradient(0,0,28,0,0,101);
  g.addColorStop(0,'#9ce8ff00');
  g.addColorStop(.59,'#6bbdfa0e');
  g.addColorStop(.90,'#81dafa33');
  g.addColorStop(1,'#adf3ffaa');
  artOval(c,0,0,100,100,g);
  c.restore();
  c.beginPath(); c.ellipse(0,0,100,82,0,0,artTau);
  c.strokeStyle='#69a8e69a'; c.lineWidth=4; c.stroke();
  c.strokeStyle='#c0f2ffdd'; c.lineWidth=1.1; c.stroke();
  c.beginPath(); c.ellipse(0,0,96,78,0,Math.PI*.91,Math.PI*1.72);
  c.strokeStyle='#ecfdffad'; c.lineWidth=.9; c.stroke();
},2);
const artBarrierRune = new Path2D('M0 -3 2.6 0 0 3 -2.6 0Z M0 -1 1 0 0 1 -1 0Z');

function drawBarrier(c, t, frac) {
  const strength=artClamp(frac);
  const pulse=.79+Math.sin(t*8)*.13;
  c.save();
  c.translate(95,168);
  c.scale(.93+.07*strength,1);
  c.globalAlpha *= pulse * Math.min(1,strength*5);
  artPlace(c,artBarrierLight);
  for (let i=0;i<12;i++) {
    const a=i*artTau/12+t*.48;
    c.save();
    c.translate(Math.cos(a)*98,Math.sin(a)*80);
    c.rotate(a);
    artFill(c,artBarrierRune,i%3 ? '#adeaffb0' : '#e4fdff');
    c.restore();
  }
  c.restore();
}

const artPetal = new Path2D('M0 2.4 C-1.6 .6 -5.6 -.6 -3.8 -2.2 C-2.6 -3.2 -.9 -1.8 0 -.75 C1.1 -2.3 3.1 -3.25 3.8 -1.7 C4.9 .2 1.6 1.6 0 2.4Z');
const artPetalColors = ['#f1a8bd','#fff0d5','#cec2f9'];
const artSeed = artBake(-8,-6,16,12,c=>{
  artPaint(c,'M-6 0 Q-3 -5 2 -3 Q5 -2 6 .4 L3 3 Q-2 5 -6 0Z',
    ['#f4df9b','#ccac60','#876344'],-4,4,'#59413f',.82);
  artLine(c,'M-4 .4 Q0 -2 4 -.3','#fff2bb',.62);
});
const artHitShard = new Path2D('M0 -1 11 0 0 1Z');

function drawHit(c, x, y, age) {
  const q=artClamp(age/.26);
  if (q >= 1) return;
  c.save();
  c.translate(x,y);
  c.globalAlpha *= (1-q)*.85;
  artPlace(c,artLanternGlow);
  c.save();
  const flash=.9+q*.42;
  c.scale(flash,flash);
  c.rotate(.11);
  artFill(c,artStar,'#fff1ba');
  c.restore();
  for (let i=0;i<5;i++) {
    c.save();
    c.rotate(i*1.36+.3);
    c.translate(5+q*(9+i*1.7),0);
    c.scale(.51+q*.4,.66);
    artFill(c,artHitShard,i%2 ? '#ffc47e' : '#fff1bf');
    c.restore();
  }
  c.restore();
}

const artFxFont = '800 15px Georgia, serif';
const artFxLabels = new Map();

function artFxLabel(c,text,color) {
  const key=color+'|'+text;
  let label=artFxLabels.get(key);
  if (label) return label;
  const priorFont=c.font;
  c.font=artFxFont;
  const radius=Math.ceil(c.measureText(text).width/2)+3;
  c.font=priorFont;
  label=artBake(-radius,-18,radius*2,24,b=>{
    b.font=artFxFont;
    b.textAlign='center';
    b.textBaseline='alphabetic';
    b.lineWidth=3.15;
    b.strokeStyle='#28202a';
    b.strokeText(text,0,0);
    b.fillStyle=color;
    b.fillText(text,0,0);
  },2);
  if (artFxLabels.size >= 64) artFxLabels.delete(artFxLabels.keys().next().value);
  artFxLabels.set(key,label);
  return label;
}

function drawFx(c, f, t) {
  if (f.k !== 'txt' && f.k !== 'proj' && f.k !== 'ring' && f.k !== 'petals') return false;
  if (f.k === 'proj' && f.kind !== 'arrow' && f.kind !== 'bolt' && f.kind !== 'seed') return false;
  const q=artClamp(f.t/(f.life||f.dur||1));
  c.save();
  c.lineCap=c.lineJoin='round';
  if (f.k === 'txt') {
    c.translate(f.x,f.y - q*25);
    const bounce=(1+.17*Math.sin(artClamp(q*4)*Math.PI))*(f.big?1.45:1);
    c.scale(bounce,bounce);
    c.globalAlpha *= 1-q*q;
    artPlace(c,artFxLabel(c,f.text,f.c||'#fff4dc'));
  } else if (f.k === 'proj') {
    const dx=f.x1-f.x0,dy=f.y1-f.y0;
    const x=f.x0+dx*q,y=f.y0+dy*q-Math.sin(q*Math.PI)*14;
    c.translate(x,y);
    c.rotate(Math.atan2(dy-14*Math.PI*Math.cos(q*Math.PI),dx));
    if (f.kind === 'arrow') {
      c.fillStyle='#ffe8a283';
      c.fillRect(-27,-.52,21,1.04);
      artPlace(c,artArrow);
    } else if (f.kind === 'bolt') {
      c.save(); c.scale(1.27,.69); artPlace(c,artLilacLight,-5,0); c.restore();
      c.save(); c.rotate(t*5); artFill(c,artStar,'#fce6ff'); c.restore();
      for (let i=0;i<4;i++) artOval(c,-8-i*4,Math.sin(t*17+i*1.8)*3.7,1.3-i*.22,.7,'#e5b2f2');
    } else {
      for (let i=0;i<3;i++) artOval(c,-9-i*4,Math.sin(t*14+i)*3.7,1.5-i*.33,.66,'#ffdf98a0');
      c.rotate(q*11);
      artPlace(c,artSeed);
    }
  } else if (f.k === 'ring') {
    c.translate(f.x,f.y);
    c.scale(1,.75);
    c.beginPath(); c.arc(0,0,21+89*q,0,artTau);
    c.strokeStyle=f.c||'#9bdcff'; c.lineWidth=3.6-2.8*q;
    c.globalAlpha *= 1-q; c.stroke();
    c.globalAlpha *= .55;
    c.beginPath(); c.arc(0,0,16+85*q,0,artTau);
    c.lineWidth=.8; c.stroke();
  } else {
    c.translate(f.x,f.y);
    c.globalAlpha *= 1-q*q;
    for (let i=0;i<11;i++) {
      const a=i*artTau/11+3.65*q, radius=13+21*q;
      c.save();
      c.translate(Math.cos(a)*radius,Math.sin(a)*radius*.56-5*q);
      c.rotate(a+.34*i);
      c.scale(.73+.22*Math.sin(i*2),.75+.22*Math.cos(i));
      artFill(c,artPetal,artPetalColors[i%3]);
      c.restore();
      if (i%3===0) artOval(c,Math.cos(a+.24)*radius,Math.sin(a+.24)*radius*.56-8*q,.74,.67,'#fff0ce');
    }
  }
  c.restore();
  return true;
}
