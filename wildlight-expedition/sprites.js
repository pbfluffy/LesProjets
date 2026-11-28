/* Wildlight Expedition – bitmap sprite renderer.
 *
 * Loaded after art.js and before game.js. When assets/meta.json and the images exist it replaces
 *   drawHero(c,id,x,y,o)   drawMon(c,type,x,y,o)   drawBackground(c)   and adds   drawMap(c,st,t)
 * with illustrated versions; anything that is missing falls back to the vector art in art.js (or to
 * game.js's SVG map), so the game always runs.
 *
 * Conventions (see codex-art-brief-v4.md): hero sprites face right, monster sprites face left, and every
 * frame of one character shares one canvas size with the feet at (feetX, feetY) of that canvas.
 */
(function () {
  'use strict';

  const script = document.currentScript;
  const ver = script && script.src.includes('?') ? script.src.slice(script.src.indexOf('?')) : '';
  const url = p => 'assets/' + p + ver;
  window.assetUrl = url;                       // game.js uses the same (versioned) URLs for the stage art on the home cards

  const meta = { loaded: false, data: null };
  const imgs = new Map();            // path -> HTMLImageElement (only when fully decoded)
  const flashes = new WeakMap();     // image -> white-silhouette canvas
  const vec = { hero: window.drawHero, mon: window.drawMon, bg: window.drawBackground };

  /* Logical height (in the 400x260 battle space) of each standing idle figure, feet to head. */
  const HEIGHT = { milo: 90, bren: 98, tavi: 98, iona: 94, rook: 92, elric: 96, maren: 101, tobin: 100, brushfang: 46, beetle: 54, spitter: 66, boar: 130,
    bogtoad: 44, reedwisp: 58, mossturtle: 46, bogking: 130, frostwolf: 48, icegolem: 78, frostgiant: 150, emberimp: 54, magmacrab: 38, stormdrake: 96,
    hornet: 40, barkbear: 62, mireadder: 36, mistheg: 60, rimesprite: 50, snowyeti: 82, cinderbat: 44, sentinel: 80,
    gscrapper: 48, garcher: 52, gshaman: 56, gking: 120, ogrunt: 106, oberserker: 108, obrute: 134, owarlord: 156 };

  // Every weapon has its own picture of the hero (idle + attack). The first five are PNG, the newer ones WebP.
  const HERO_FILES = {
    bren: ['sword', 'twin', 'great', 'falchion', 'saber', 'rapier', 'buckler'],
    tavi: ['bow', 'shortbow', 'longbow', 'crossbow'],
    iona: ['staff', 'heartwood', 'stormstaff', 'frostwand'],
    milo: ['pitchfork', 'woodaxe'],
    rook: ['dagger', 'twindaggers'],
    elric: ['tome', 'grimoire'],
    maren: ['spear', 'halberd'],
    tobin: ['wraps', 'gauntlets'],
  };
  const PHASE = { bren: 0, tavi: 1.3, iona: 2.6, milo: 3.9, rook: 5.2, elric: 6.5, maren: 7.8, tobin: 9.1 };
  const HERO_PNG = [];                 // every hero picture is a WebP now (the first three heroes used PNG before the simple-outfit redraw)
  /* Armor is drawn over the hero as a transparent layer with the same canvas as the hero pictures (idle and attack, one per tier). 'garb' is the base outfit: no layer. */
  const ARMOR_TIERS = ['leatherarmor', 'chainmail', 'platearmor'];
  const armorPath = (id, a, p, w) => `armor/${id}-${a}${w ? '-' + w : ''}-${p}.webp`;            // with w: the layer made for that weapon's picture
  /* The generic layers (no weapon in the name) fit the hero's FIRST weapon. The other weapons' attack pictures stand differently, so each has its own layers (v15 art);
     until a weapon's own layer exists the armor is left out during that attack instead of floating in the wrong place. */
  const ARMOR_FIT = { bren: ['twin', 'great', 'falchion', 'saber', 'rapier', 'buckler'], tavi: ['shortbow', 'longbow', 'crossbow'], iona: ['heartwood', 'stormstaff', 'frostwand'],
    milo: ['woodaxe'], rook: ['twindaggers'], elric: ['grimoire'], maren: ['halberd'], tobin: ['gauntlets'] };
  const heroPath = (id, w, p) => `heroes/${id}-${w}-${p}.${HERO_PNG.includes(w) ? 'png' : 'webp'}`;

  function load(path) {
    return new Promise(resolve => {
      const im = new Image();
      im.onload = () => { imgs.set(path, im); resolve(true); };
      im.onerror = () => resolve(false);
      im.src = url(path);
    });
  }
  const get = path => imgs.get(path) || null;

  /* ------------------------------ helpers ----------------------------- */
  function shadow(c, x, y, w, h, a) {
    c.save();
    c.translate(x, y);
    c.scale(1, h / w);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, `rgba(10,8,12,${a || 0.42})`);
    g.addColorStop(1, 'rgba(10,8,12,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, w, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function flashOf(im) {
    let f = flashes.get(im);
    if (!f) {
      f = document.createElement('canvas');
      f.width = im.naturalWidth; f.height = im.naturalHeight;
      const g = f.getContext('2d');
      g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(0, 0, f.width, f.height);
      flashes.set(im, f);
    }
    return f;
  }

  /* Draw `im` so its ground contact point (feetX/feetY fractions) lands on (x,y); returns scale. */
  function stand(c, im, m, targetH, x, y, flash) {
    // targetH is the standing figure's height; the whole frame is figureH-times taller than that.
    const s = (targetH / m.figureH) / im.naturalHeight;
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    c.drawImage(flash ? flashOf(im) : im, x - m.feetX * dw, y - m.feetY * dh, dw, dh);
    return s;
  }

  /* ------------------------------- heroes ------------------------------ */
  /* How each weapon moves. p = how far the attack is (0 to 1, about a quarter of a second); every weapon returns a small offset, tilt and squash of the figure
     (dx forward, dy up, rot tilt forward, sx / sy squash) and 'ghost' = how strongly a motion trail is drawn behind a very fast attack. */
  const pulse = (p, a, b) => (p <= a || p >= b ? 0 : Math.sin((p - a) / (b - a) * Math.PI));
  const HEAVY = { great: 1, halberd: 1, woodaxe: 0.9, falchion: 0.6, club: 0.7 };
  const THRUST = { spear: 13, rapier: 11, pitchfork: 9 };
  const QUICK = { dagger: 1, twindaggers: 2, saber: 3, twin: 2 };
  function motion(w, p) {
    const m = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, ghost: 0 }, W = (typeof WEAPONS !== 'undefined' && WEAPONS[w]) || {}, fam = W.fam;
    if (HEAVY[w]) {                                           // wind up and slam
      const k = HEAVY[w], back = pulse(p, 0, 0.42), slam = pulse(p, 0.3, 0.85);
      m.dx = -5 * k * back + 11 * k * slam; m.rot = -0.1 * k * back + 0.13 * k * slam; m.dy = 2 * back * k; m.sy = 1 - 0.07 * slam * k; m.sx = 1 + 0.06 * slam * k;
    } else if (THRUST[w]) {                                   // pull back, then a long jab
      const back = pulse(p, 0, 0.3), jab = pulse(p, 0.2, 0.7);
      m.dx = -3.5 * back + THRUST[w] * jab; m.rot = 0.04 * jab; m.sx = 1 + 0.03 * jab;
    } else if (QUICK[w]) {                                    // fast darting cuts, one hop per hit
      const n = QUICK[w], hop = Math.abs(Math.sin(p * n * Math.PI));
      m.dx = 5.5 * hop; m.dy = 2.2 * hop; m.rot = 0.05 * hop; m.ghost = 0.22 * hop;
    } else if (w === 'wraps') {                               // two jabs
      const hop = Math.abs(Math.sin(p * 2 * Math.PI));
      m.dx = 6 * hop; m.rot = 0.04 * hop; m.sy = 1 - 0.02 * hop; m.ghost = 0.16 * hop;
    } else if (w === 'gauntlets') {                           // a heavy straight punch
      const back = pulse(p, 0, 0.3), hit = pulse(p, 0.25, 0.75);
      m.dx = -3 * back + 10 * hit; m.sx = 1 + 0.06 * hit; m.sy = 1 - 0.05 * hit; m.rot = 0.05 * hit;
    } else if (w === 'buckler') {                             // a shield bash
      const hit = pulse(p, 0.1, 0.7); m.dx = 6 * hit; m.sx = 1 + 0.05 * hit; m.rot = 0.03 * hit;
    } else if (fam === 'sword') {                             // a clean forward cut
      const f = pulse(p, 0, 0.75); m.dx = 8 * f; m.rot = 0.06 * f; m.dy = 0.8 * f;
    } else if (fam === 'staff' || fam === 'tome') {           // casters rise a little and lean back as they gather the spell
      const up = pulse(p, 0, 1); m.dy = 3 * up; m.rot = -0.05 * up; m.sy = 1 + 0.02 * up;
    }
    return m;
  }
  /* each hero idles in their own way: breathing speed and size, a weight shift or a hover */
  const IDLE = {
    milo: { sp: 3.2, a: 0.018, sway: 0.7, bob: 0 },       // nervous, shifts his weight
    bren: { sp: 2.2, a: 0.012, sway: 0, bob: 0 },         // steady
    tavi: { sp: 2.8, a: 0.014, sway: 0.5, bob: 0 },
    iona: { sp: 2.4, a: 0.014, sway: 0.4, bob: 0.4 },
    rook: { sp: 3.6, a: 0.016, sway: 0.9, bob: 0 },       // restless, ready to spring
    elric: { sp: 2.0, a: 0.01, sway: 0, bob: 1.4 },       // hovers a little
    maren: { sp: 2.0, a: 0.011, sway: 0, bob: 0 },        // planted
    tobin: { sp: 1.6, a: 0.02, sway: 0, bob: 0 },         // slow, deep breaths
  };
  function drawHeroSprite(c, id, x, y, o) {
    const m = meta.data && meta.data[id];
    if (!m) return false;
    const attacking = id === 'tavi' ? ((o.lean || 0) > 0.2 || (o.swing || 0) > 0.7) : (o.swing || 0) > 0.3;
    const files = HERO_FILES[id] || [], kind = attacking ? 'attack' : 'idle';
    const pick = w => files.includes(w) && (get(heroPath(id, w, kind)) || get(heroPath(id, w, 'idle')));
    const near = (typeof WEAPONS !== 'undefined' && WEAPONS[o.weapon] && WEAPONS[o.weapon].pose) || o.weapon;     // the nearest older picture, if a new one is missing
    const pw = [o.weapon, near, files[0]].find(w => pick(w));                                                 // the weapon whose picture is drawn
    const im = pw ? pick(pw) : null;
    if (!im) return false;
    const t = o.t || 0, phase = PHASE[id] || 0;

    shadow(c, x, y + 1, 26, 6.5);
    c.save();
    c.translate(x, y);
    let mv = null;
    if (o.dead) { c.globalAlpha = 0.45; c.rotate(-0.9); c.translate(-10, 6); }
    else {
      const I = IDLE[id] || IDLE.bren, breathe = 1 + I.a * Math.sin(t * I.sp + phase);
      c.translate(I.sway * Math.sin(t * 1.3 + phase), -I.bob * (0.5 + 0.5 * Math.sin(t * 1.7 + phase)));
      c.scale(1 / breathe, breathe);                                   // grows up from the feet
      if (o.brace) c.scale(1.05, 0.93);
      if (id === 'tavi') { if ((o.lean || 0) > 0) c.translate(-(o.lean) * 2.5, 0); c.rotate(-(o.lean || 0) * 0.03); }     // lean back while drawing the bow
      else if ((o.swing || 0) > 0) {
        mv = motion(o.weapon, 1 - Math.min(1, o.swing));
        c.translate(mv.dx, -mv.dy); c.rotate(mv.rot); c.scale(mv.sx, mv.sy);
      }
      if (o.hit > 0) c.translate(-Math.min(1, o.hit / 0.25) * 4 + (Math.random() - 0.5) * 2.2, 0);     // knocked back a little
    }
    let layer = null;
    if (ARMOR_TIERS.includes(o.armor)) {
      layer = get(armorPath(id, o.armor, kind, pw));                                               // made for this weapon's picture
      if (!layer && (kind === 'idle' || pw === files[0])) layer = get(armorPath(id, o.armor, kind)) || get(armorPath(id, o.armor, 'idle'));       // the generic layer (first weapon; standing pictures)
    }
    const putLayer = flash => {                                       // the armor, placed exactly like the hero picture
      if (!layer) return;
      const sc = (HEIGHT[id] / m.figureH) / im.naturalHeight, dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      c.drawImage(flash ? flashOf(layer) : layer, -m.feetX * dw, -m.feetY * dh, dw, dh);
    };
    if (mv && mv.ghost > 0.02) {                                      // a motion trail behind very fast attacks (with the armor, like the hero)
      c.save(); c.globalAlpha = mv.ghost; c.translate(-9, 0); stand(c, im, m, HEIGHT[id], 0, 0, false); putLayer(false); c.restore();
    }
    stand(c, im, m, HEIGHT[id], 0, 0, o.hit > 0.12 && !o.dead);
    putLayer(o.hit > 0.12 && !o.dead);
    c.restore();
    return true;
  }

  function drawHero(c, id, x, y, o) {
    if (!drawHeroSprite(c, id, x, y, o) && vec.hero) vec.hero(c, id, x, y, o);
  }

  /* ------------------------------ monsters ----------------------------- */
  function drawMonSprite(c, type, x, y, o) {
    const m = meta.data && meta.data[type];
    if (!m) return false;
    const lunge = o.lunge || 0, wind = o.dead ? 0 : (o.wind || 0), scrape = o.dead ? 0 : (o.scrape || 0);
    const info = (typeof MON !== 'undefined' && MON[type]) || {}, boss = !!info.boss, ranged = info.tgt === 'back', ext = m.ext || 'png';
    let pose = 'idle';
    if (!o.dead) {
      if (boss) pose = (scrape > 0.05 || lunge > 4) ? 'attack' : 'idle';
      else if (ranged) pose = wind > 0.35 ? 'attack' : 'idle';
      else pose = (wind > 0.3 || lunge > 2) ? 'attack' : 'idle';
    }
    const im = get(`monsters/${type}-${pose}.${ext}`) || get(`monsters/${type}-idle.${ext}`);
    if (!im) return false;
    const fade = o.dead ? Math.max(0, 1 - (o.fade || 0) * 1.5) : 1;
    if (!fade) return true;
    const t = o.t || 0;

    shadow(c, x - lunge, y + 1, boss ? 52 : Math.max(20, HEIGHT[type] * 0.5), boss ? 11 : 6, 0.45 * fade);
    c.save();
    c.translate(x - lunge, y);
    c.globalAlpha *= fade;
    if (o.dead) { c.rotate(0.22); c.scale(1, 0.92); }
    else {
      const bob = Math.sin(t * 4 + x) * (boss ? 0.5 : 0.9);
      c.translate(0, bob);
      if (type === 'spitter' || type === 'reedwisp' || type === 'emberimp' || type === 'mistheg' || type === 'rimesprite') { const s = 1 + 0.16 * wind; c.scale(s, s); }
      if (type === 'brushfang' || type === 'frostwolf' || type === 'mireadder' || type === 'hornet' || type === 'cinderbat') c.scale(1 + wind * 0.05, 1 - wind * 0.08);
      if (boss && scrape > 0) c.translate((Math.random() - 0.5) * 1.4 * scrape, 0);   // trembling before the charge
    }
    stand(c, im, m, HEIGHT[type], 0, 0, o.flash > 0.06 && !o.dead);
    c.restore();
    if (o.flash > 0.06 && !o.dead && typeof drawHit === 'function') {
      drawHit(c, x - lunge - (boss ? 16 : 4), y - (boss ? 43 : 24), 0.15 - o.flash);
    }
    return true;
  }

  function drawMon(c, type, x, y, o) {
    if (!drawMonSprite(c, type, x, y, o) && vec.mon) vec.mon(c, type, x, y, o);
  }

  /* ---------------------------- battle scenery ------------------------- */
  function cover(c, im, w, h, alignY) {
    const k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    c.drawImage(im, (w - dw) / 2, (h - dh) * (alignY == null ? 0.5 : alignY), dw, dh);
  }

  const motes = Array.from({ length: 14 }, (_, i) => ({ x: (i * 97) % 400, y: 40 + (i * 53) % 150, s: 0.5 + (i % 4) * 0.35, p: i * 1.7 }));

  function drawBackground(c) {
    const battle = typeof B === 'undefined' ? null : B;
    const im = get(`bg/${(battle && battle.spec && battle.spec.bg) || 'path'}.jpg`) || get('bg/path.jpg');
    const cam = battle && battle.cam;
    if (!im) {
      if (!vec.bg) return;
      if (!cam) { vec.bg(c); return; }
      const s = Math.max(cam.w / 400, cam.h / 260);
      c.save(); c.translate(cam.x + (cam.w - 400 * s) / 2, cam.y + cam.h - 260 * s); c.scale(s, s); vec.bg(c); c.restore(); return;
    }
    if (cam) {                                                       // portrait phone: the picture fills the tall window, anchored at the bottom
      const k = Math.max(cam.w / im.naturalWidth, cam.h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
      c.drawImage(im, cam.x + (cam.w - dw) / 2, cam.y + cam.h - dh, dw, dh);
    } else cover(c, im, 400, 260, 1);
    const t = battle ? battle.t : 0;
    // drifting light motes for a little life
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      let px = (m.x + t * 6 * m.s) % 420 - 10, py = m.y + Math.sin(t * 0.8 + m.p) * 6;
      if (cam) { px = cam.x + px * cam.w / 400; py = cam.y + cam.h * 0.3 + (py - 40) * 1.4; }
      c.fillStyle = `rgba(255,240,190,${0.10 + 0.08 * Math.sin(t * 1.6 + m.p)})`;
      c.beginPath(); c.arc(px, py, 1.1 * m.s, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    if (battle && typeof artBattleGround === 'function') artBattleGround(c, battle);   // boar charge lane + cracks (art.js)
  }

  /* --------------------------------- map ------------------------------- */
  /* Draw a map overlay so its ground point (baseX/baseY fractions) lands on (x,y); targetH is the whole frame's height. */
  function place(c, im, m, x, y, targetH) {
    const s = targetH / im.naturalHeight;
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    c.drawImage(im, x - (m.baseX != null ? m.baseX : 0.5) * dw, y - (m.baseY != null ? m.baseY : 1) * dh, dw, dh);
  }

  function glow(c, x, y, r, rgb, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function label(c, text, x, y, size) {
    c.save();
    c.font = `700 ${size || 9}px Georgia, serif`;
    c.textAlign = 'center'; c.lineJoin = 'round';
    c.lineWidth = 3; c.strokeStyle = 'rgba(20,14,10,.85)'; c.strokeText(text, x, y);
    c.fillStyle = '#fbe9c0'; c.fillText(text, x, y);
    c.restore();
  }

  /* Draws one region's map on a 360 x 150 canvas.
     st = { map: 'map/mire.jpg', pins: [{ x, y, n, state: 'locked' | 'open' | 'cleared', id }], tower: { x, y, lit },
            farming: stage id | null, home: 'Village' | undefined, more: bool (dim distant towers: the road goes on) }
     x / y are fractions of the map. */
  function drawMap(c, st, t) {
    const bg = get(st.map);
    t = t || 0;
    c.clearRect(0, 0, 360, 150);
    if (!bg) {                                       // this region's map has not arrived yet
      const g = c.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, '#1c2e24'); g.addColorStop(1, '#101a15');
      c.fillStyle = g; c.fillRect(0, 0, 360, 150);
      label(c, 'Unrolling the map…', 180, 78, 10);
      return;
    }
    cover(c, bg, 360, 150, 0.5);
    const mm = meta.data, X = f => f * 360, Y = f => f * 150;
    const tw = { x: X(st.tower.x), y: Y(st.tower.y) }, lit = !!st.tower.lit;

    if (st.more) {                                   // dim distant towers beyond: "later roads"
      const tu = get('map/tower-unlit.png');
      if (tu && mm.tower) { c.save(); c.globalAlpha = 0.3; place(c, tu, mm.tower, 352, 36, 28); place(c, tu, mm.tower, 340, 22, 18); c.restore(); }
    }
    const tower = get(lit ? 'map/tower-lit.png' : 'map/tower-unlit.png');
    if (tower && mm.tower) {
      if (lit) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, tw.x, tw.y - 46, 70 + 4 * Math.sin(t * 5), '255,190,90', 0.22 + 0.05 * Math.sin(t * 7)); c.restore(); }
      place(c, tower, mm.tower, tw.x, tw.y + 4, 66);
      if (lit) {
        c.save(); c.globalCompositeOperation = 'lighter';
        glow(c, tw.x, tw.y - 52, 18 + 2 * Math.sin(t * 9), '255,214,120', 0.5);
        for (let i = 0; i < 6; i++) {
          const u = (t * 0.8 + i * 0.17) % 1;
          c.fillStyle = `rgba(255,200,110,${(1 - u) * 0.8})`;
          c.fillRect(tw.x - 3 + Math.sin(i * 5 + t * 3) * 6, tw.y - 54 - u * 24, 1.2, 1.2);
        }
        c.restore();
      }
    }

    // stage markers
    for (const p of st.pins) {
      const px = X(p.x), py = Y(p.y), open = p.state === 'open', done = p.state === 'cleared';
      const im = get(`map/marker-${p.state}.png`);
      if (open) {
        c.save(); c.globalCompositeOperation = 'lighter';
        glow(c, px, py - 6, 22 + 3 * Math.sin(t * 3), '255,200,90', 0.30 + 0.12 * Math.sin(t * 3));
        c.restore();
      }
      const MH = 42, baseY = py + 6;
      if (im && mm.marker) place(c, im, mm.marker, px, baseY, MH);
      else {
        c.fillStyle = done ? '#6cc37c' : open ? '#f2b84b' : '#53635a';
        c.beginPath(); c.arc(px, py - 6, 8, 0, Math.PI * 2); c.fill();
      }
      label(c, String(p.n), px, baseY - 0.665 * MH + 4, 12);   // the number sits on the signpost plaque
    }

    // the party's camp where they are farming
    if (st.farming) {
      const p = st.pins.find(q => q.id === st.farming), im = get('map/camp.png');
      if (p && im && mm.camp) {
        const px = X(p.x), py = Y(p.y);
        c.save(); c.globalCompositeOperation = 'lighter';
        glow(c, px + 24, py + 4, 18 + 2 * Math.sin(t * 8), '255,170,70', 0.28 + 0.08 * Math.sin(t * 11));
        c.restore();
        place(c, im, mm.camp, px + 26, py + 12, 36);
      }
    }

    if (st.home) label(c, st.home, 34, 140, 9);
    label(c, lit ? 'Relit!' : 'Watchtower', tw.x - 6, tw.y + 18, 9);

    // soft vignette
    const v = c.createRadialGradient(180, 75, 70, 180, 75, 230);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,10,8,.38)');
    c.fillStyle = v; c.fillRect(0, 0, 360, 150);
  }

  /* -------------------------------- boot ------------------------------- */
  // game.js shows a loading placeholder (never the drawn fallback art) while a state is 'loading'.
  //   map:   the region maps and their pieces      units: heroes, weapon pictures, and the first region's monsters and backgrounds
  // Every other region's monsters and backgrounds load on demand (ensureRegion), so a new player does not download them all.
  window.spriteState = { map: 'loading', units: 'loading' };
  const refresh = () => { if (typeof render === 'function') render(); };

  const REGION_ART = {
    vale:  { mon: ['brushfang', 'beetle', 'spitter', 'boar', 'hornet', 'barkbear'], bg: ['path', 'hollow', 'crossing'] },
    mire:  { mon: ['bogtoad', 'reedwisp', 'mossturtle', 'bogking', 'mireadder', 'mistheg'], bg: ['mirewood', 'causeway', 'toadking'] },
    frost: { mon: ['frostwolf', 'icegolem', 'frostgiant', 'rimesprite', 'snowyeti'], bg: ['frostfall', 'glimmer', 'rimecrown'] },
    ember: { mon: ['emberimp', 'magmacrab', 'stormdrake', 'cinderbat', 'sentinel'], bg: ['cinder', 'quarry', 'magmagate', 'skyreach'] },
    warrens: { mon: ['gscrapper', 'garcher', 'gshaman', 'gking'], bg: ['scrapheap', 'gobmines', 'kinghall'] },
    highlands: { mon: ['ogrunt', 'oberserker', 'obrute', 'owarlord'], bg: ['ridge', 'warcamp', 'throne'] },
  };
  /* the skill buttons' painted icons and the hero portraits next to them (skills.js) */
  const SKILL_ART = [...['whirlwind', 'ironguard', 'arrowrain', 'snipe', 'bloom', 'storm', 'hardswing', 'rally', 'backstab', 'smoke', 'fireball', 'meteor', 'lance', 'bulwark', 'ironpalm', 'innerpeace'].map(id => `skills/${id}.webp`),
    ...['milo', 'bren', 'tavi', 'iona', 'rook', 'elric', 'maren', 'tobin'].map(id => `ui/hero-${id}.webp`)];
  const MAP_PATHS = ['map/map.jpg', 'map/mire.jpg', 'map/frost.jpg', 'map/ember.jpg', 'map/warrens.jpg', 'map/highlands.jpg', 'map/tower-unlit.png', 'map/tower-lit.png',
    'map/marker-locked.png', 'map/marker-open.png', 'map/marker-cleared.png', 'map/camp.png'];
  window.regionArt = { vale: 'loading', mire: 'idle', frost: 'idle', ember: 'idle', warrens: 'idle', highlands: 'idle' };       // idle | loading | ready
  const regionLoads = {};

  // Only the first four monsters are PNG; every newer one is WebP (meta.json says so too, but it may not have loaded yet on the first screen).
  const monExt = id => (meta.data && meta.data[id] && meta.data[id].ext) || (['brushfang', 'beetle', 'spitter', 'boar'].includes(id) ? 'png' : 'webp');
  const monPaths = id => ['idle', 'attack'].map(p => `monsters/${id}-${p}.${monExt(id)}`);
  /* Loads a region's monsters and battle backgrounds once; resolves when they are ready (missing pictures fall back to the drawn art). */
  window.monIdleUrl = id => url(monPaths(id)[0]);                 // the picture of a monster for the home cards
  /* Every picture of the game (used by pwa.js so the installed app can run offline). */
  window.artUrls = () => Object.values(REGION_ART).flatMap(a => [...a.mon.flatMap(monPaths), ...a.bg.map(b => `bg/${b}.jpg`)])
    .concat(MAP_PATHS, ['meta.json', 'sfx/index.json', 'sfx/pack.bin', ...SKILL_ART, 'music/village1.mp3', 'music/village2.mp3', 'music/fight.mp3', 'music/boss.mp3'], (typeof WEAPONS !== 'undefined' ? Object.keys(WEAPONS) : ['sword', 'twin', 'great', 'bow', 'staff']).map(w => `items/${w}.png`),
      Object.entries(HERO_FILES).flatMap(([id, ws]) => ws.flatMap(w => ['idle', 'attack'].map(p => heroPath(id, w, p)))),
      Object.keys(HERO_FILES).flatMap(id => ARMOR_TIERS.flatMap(a => ['idle', 'attack'].map(p => armorPath(id, a, p)))),
      Object.entries(ARMOR_FIT).flatMap(([id, ws]) => ws.flatMap(w => ARMOR_TIERS.map(a => armorPath(id, a, 'attack', w)))),
      ['garb', ...ARMOR_TIERS.map(a => a)].map(a => `items/${a === 'garb' ? 'garb' : a}.png`)).map(url);
  window.ensureRegion = id => {
    if (!REGION_ART[id] || !meta.data) return Promise.resolve(false);
    if (window.regionArt[id] === 'ready') return Promise.resolve(true);
    if (regionLoads[id]) return regionLoads[id];
    window.regionArt[id] = 'loading';
    const a = REGION_ART[id];
    regionLoads[id] = Promise.all([...a.mon.flatMap(monPaths), ...a.bg.map(b => `bg/${b}.jpg`)].map(load)).then(() => {
      window.regionArt[id] = 'ready';
      refresh();                                   // the home cards can show this region's pictures now
      return true;
    });
    return regionLoads[id];
  };

  async function boot() {
    // The first screen is the map, so fetch its pictures straight away, alongside meta.json.
    const mapLoads = Promise.all(MAP_PATHS.map(load));
    let data;
    try {
      const r = await fetch(url('meta.json'));
      if (!r.ok) throw new Error('meta.json ' + r.status);
      data = await r.json();
    } catch (e) {                                  // no assets: fall back to the drawn art
      window.spriteState.map = window.spriteState.units = 'failed';
      refresh();
      return;
    }
    meta.data = data; meta.loaded = true;

    await mapLoads;
    if (get('map/map.jpg') && data.tower && data.marker) { window.drawMap = drawMap; window.spriteState.map = 'ready'; }
    else window.spriteState.map = 'failed';
    refresh();                                     // the map can show now; the rest keeps loading

    const paths = [];
    for (const [id, weapons] of Object.entries(HERO_FILES))
      for (const w of weapons) for (const pose of ['idle', 'attack']) paths.push(heroPath(id, w, pose));
    for (const w of (typeof WEAPONS !== 'undefined' ? Object.keys(WEAPONS) : ['sword', 'twin', 'great', 'bow', 'staff'])) paths.push(`items/${w}.png`);
    for (const a of ['garb', ...ARMOR_TIERS]) paths.push(`items/${a}.png`);
    for (const p of SKILL_ART) paths.push(p);                                                                  // skill icons and hero portraits (battle buttons, hero sheet)                                   // armor pictures (forge, hero cards, drops)
    for (const id of Object.keys(HERO_FILES)) for (const a of ARMOR_TIERS) for (const pose of ['idle', 'attack']) paths.push(armorPath(id, a, pose));
    for (const [id, ws] of Object.entries(ARMOR_FIT)) for (const w of ws) for (const a of ARMOR_TIERS) paths.push(armorPath(id, a, 'attack', w));       // weapon pictures (drop lists, forge, rewards)
    await Promise.all([...paths.map(load), window.ensureRegion('vale')]);

    window.drawHero = drawHero;
    window.drawMon = drawMon;
    window.drawBackground = drawBackground;
    window.spriteHeight = id => HEIGHT[id] || 0;       // lets game.js put health bars and numbers above the sprite
    window.spriteState.units = 'ready';
    refresh();                                     // repaint the hero portraits
  }
  boot();
})();
