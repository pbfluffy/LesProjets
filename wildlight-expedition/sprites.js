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
  const HEIGHT = { bren: 98, tavi: 98, iona: 94, brushfang: 46, beetle: 54, spitter: 66, boar: 130 };
  const SKY_STAGE = { '#2d5a45': 'path', '#27495a': 'hollow', '#5a4a3a': 'crossing' };

  const HERO_FILES = {
    bren: ['sword', 'twin', 'great'], tavi: ['bow'], iona: ['staff'],
  };
  const MON_IDS = ['brushfang', 'beetle', 'spitter', 'boar'];

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
  function drawHeroSprite(c, id, x, y, o) {
    const m = meta.data && meta.data[id];
    if (!m) return false;
    const weapon = (HERO_FILES[id] || []).includes(o.weapon) ? o.weapon : HERO_FILES[id][0];
    const attacking = id === 'tavi' ? ((o.lean || 0) > 0.2 || (o.swing || 0) > 0.7) : (o.swing || 0) > 0.3;
    const im = get(`heroes/${id}-${weapon}-${attacking ? 'attack' : 'idle'}.png`) || get(`heroes/${id}-${weapon}-idle.png`);
    if (!im) return false;
    const t = o.t || 0, phase = id === 'bren' ? 0 : id === 'tavi' ? 1.3 : 2.6;

    shadow(c, x, y + 1, 26, 6.5);
    c.save();
    c.translate(x, y);
    if (o.dead) { c.globalAlpha = 0.45; c.rotate(-0.9); c.translate(-10, 6); }
    else {
      const breathe = 1 + 0.014 * Math.sin(t * 2.6 + phase);
      c.scale(1 / breathe, breathe);                                   // grows up from the feet
      if (o.brace) c.scale(1.05, 0.93);
      if (attacking && id !== 'tavi') c.translate((o.swing || 0) * 6, 0);   // lunge into the swing
      if (id === 'tavi' && (o.lean || 0) > 0) c.translate(-(o.lean) * 2, 0); // lean back while drawing
      if (o.hit > 0) c.translate((Math.random() - 0.5) * 3, 0);
    }
    stand(c, im, m, HEIGHT[id], 0, 0, o.hit > 0.12 && !o.dead);
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
    const boss = type === 'boar';
    let pose = 'idle';
    if (!o.dead) {
      if (boss) pose = (scrape > 0.05 || lunge > 4) ? 'attack' : 'idle';
      else if (type === 'brushfang' || type === 'beetle') pose = (wind > 0.3 || lunge > 2) ? 'attack' : 'idle';
      else pose = wind > 0.35 ? 'attack' : 'idle';
    }
    const im = get(`monsters/${type}-${pose}.png`) || get(`monsters/${type}-idle.png`);
    if (!im) return false;
    const fade = o.dead ? Math.max(0, 1 - (o.fade || 0) * 1.5) : 1;
    if (!fade) return true;
    const t = o.t || 0;

    shadow(c, x - lunge, y + 1, boss ? 52 : type === 'brushfang' ? 26 : 22, boss ? 11 : 6, 0.45 * fade);
    c.save();
    c.translate(x - lunge, y);
    c.globalAlpha *= fade;
    if (o.dead) { c.rotate(0.22); c.scale(1, 0.92); }
    else {
      const bob = Math.sin(t * 4 + x) * (boss ? 0.5 : 0.9);
      c.translate(0, bob);
      if (type === 'spitter') { const s = 1 + 0.16 * wind; c.scale(s, s); }
      if (type === 'brushfang') c.scale(1 + wind * 0.05, 1 - wind * 0.08);
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
    const stage = SKY_STAGE[battle && battle.spec && battle.spec.sky && battle.spec.sky[0]] || 'path';
    const im = get(`bg/${stage}.jpg`);
    if (!im) { if (vec.bg) vec.bg(c); return; }
    cover(c, im, 400, 260, 1);
    const t = battle ? battle.t : 0;
    // drifting light motes for a little life
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const px = (m.x + t * 6 * m.s) % 420 - 10, py = m.y + Math.sin(t * 0.8 + m.p) * 6;
      c.fillStyle = `rgba(255,240,190,${0.10 + 0.08 * Math.sin(t * 1.6 + m.p)})`;
      c.beginPath(); c.arc(px, py, 1.1 * m.s, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    if (battle && typeof artBattleGround === 'function') artBattleGround(c, battle);   // boar charge lane + cracks (art.js)
  }

  /* --------------------------------- map ------------------------------- */
  const PINS = [
    { id: 'path', x: 90, y: 108, n: '1' },
    { id: 'hollow', x: 165, y: 100, n: '2' },
    { id: 'crossing', x: 238, y: 90, n: '3' },
  ];
  const TOWER = { x: 320, y: 55 };

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

  function drawMap(c, st, t) {
    const bg = get('map/map.jpg');
    if (!bg) return;
    t = t || 0;
    const cl = st.cleared || {};
    c.clearRect(0, 0, 360, 150);
    cover(c, bg, 360, 150, 0.5);

    const lit = !!cl.crossing;
    const mm = meta.data;
    // dim distant towers beyond the watchtower ("later roads")
    const tu = get('map/tower-unlit.png');
    if (tu && mm.tower) {
      c.save(); c.globalAlpha = 0.32;
      place(c, tu, mm.tower, 352, 36, 28);
      place(c, tu, mm.tower, 340, 22, 18);
      c.restore();
    }
    const tower = get(lit ? 'map/tower-lit.png' : 'map/tower-unlit.png');
    if (tower && mm.tower) {
      if (lit) {
        c.save(); c.globalCompositeOperation = 'lighter';
        glow(c, TOWER.x, TOWER.y - 46, 70 + 4 * Math.sin(t * 5), '255,190,90', 0.22 + 0.05 * Math.sin(t * 7));
        c.restore();
      }
      place(c, tower, mm.tower, TOWER.x, TOWER.y + 4, 66);
      if (lit) {
        c.save(); c.globalCompositeOperation = 'lighter';
        glow(c, TOWER.x, TOWER.y - 52, 18 + 2 * Math.sin(t * 9), '255,214,120', 0.5);
        for (let i = 0; i < 6; i++) {
          const u = (t * 0.8 + i * 0.17) % 1;
          c.fillStyle = `rgba(255,200,110,${(1 - u) * 0.8})`;
          c.fillRect(TOWER.x - 3 + Math.sin(i * 5 + t * 3) * 6, TOWER.y - 54 - u * 24, 1.2, 1.2);
        }
        c.restore();
      }
    }

    // stage markers
    PINS.forEach((p, i) => {
      const open = i === 0 || (i === 1 && cl.path) || (i === 2 && cl.hollow);
      const done = !!cl[p.id];
      const key = done ? 'cleared' : open ? 'open' : 'locked';
      const im = get(`map/marker-${key}.png`);
      if (open && !done) {
        c.save(); c.globalCompositeOperation = 'lighter';
        glow(c, p.x, p.y - 6, 22 + 3 * Math.sin(t * 3), '255,200,90', 0.30 + 0.12 * Math.sin(t * 3));
        c.restore();
      }
      const MH = 42, baseY = p.y + 6;
      if (im && mm.marker) place(c, im, mm.marker, p.x, baseY, MH);
      else {
        c.fillStyle = done ? '#6cc37c' : open ? '#f2b84b' : '#53635a';
        c.beginPath(); c.arc(p.x, p.y - 6, 8, 0, Math.PI * 2); c.fill();
      }
      label(c, p.n, p.x, baseY - 0.665 * MH + 4, 12);   // number sits on the signpost plaque
    });

    // the party's camp where they are farming
    if (st.farming) {
      const p = PINS.find(q => q.id === st.farming), im = get('map/camp.png');
      if (p && im && mm.camp) {
        c.save(); c.globalCompositeOperation = 'lighter';
        glow(c, p.x + 24, p.y + 4, 18 + 2 * Math.sin(t * 8), '255,170,70', 0.28 + 0.08 * Math.sin(t * 11));
        c.restore();
        place(c, im, mm.camp, p.x + 26, p.y + 12, 36);
      }
    }

    label(c, 'Village', 34, 140, 9);
    label(c, lit ? 'Relit!' : 'Watchtower', TOWER.x - 6, TOWER.y + 18, 9);

    // soft vignette
    const v = c.createRadialGradient(180, 75, 70, 180, 75, 230);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,10,8,.38)');
    c.fillStyle = v; c.fillRect(0, 0, 360, 150);
  }

  /* -------------------------------- boot ------------------------------- */
  // game.js shows a loading placeholder (never the drawn fallback art) while a state is 'loading'.
  //   map:   the village map and its pieces      units: heroes, monsters and battle backgrounds
  window.spriteState = { map: 'loading', units: 'loading' };
  const refresh = () => { if (typeof render === 'function') render(); };

  const MAP_PATHS = ['map/map.jpg', 'map/tower-unlit.png', 'map/tower-lit.png', 'map/marker-locked.png', 'map/marker-open.png',
    'map/marker-cleared.png', 'map/camp.png'];

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
      for (const w of weapons) for (const pose of ['idle', 'attack']) paths.push(`heroes/${id}-${w}-${pose}.png`);
    for (const id of MON_IDS) for (const pose of ['idle', 'attack']) paths.push(`monsters/${id}-${pose}.png`);
    paths.push('bg/path.jpg', 'bg/hollow.jpg', 'bg/crossing.jpg');
    await Promise.all(paths.map(load));

    window.drawHero = drawHero;
    window.drawMon = drawMon;
    window.drawBackground = drawBackground;
    window.spriteHeight = id => HEIGHT[id] || 0;       // lets game.js put health bars and numbers above the sprite
    window.spriteState.units = 'ready';
    refresh();                                     // repaint the hero portraits
  }
  boot();
})();
