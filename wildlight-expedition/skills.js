/* Wildlight Expedition – hero skills and the magic / weapon effects of a fight.
 * Each hero has two skills (the first at hero level 3, the second at level 10) with a cooldown. In a fight they sit in a grid of buttons under the battle scene
 * (keys 1-8); with "Auto" on they are cast by themselves when they would help, which is what a Repeat run uses.
 * Also here: the drawn effects (slash arcs, lightning, ice shards, leaves, novas...) for weapon hits and spells. Loaded before game.js; everything it needs from
 * the game (B, save, hitEnemy, ...) is only used when a function is called, so the load order does not matter. */
(function () {
  'use strict';

  const SKILLS = {
    whirlwind: { hero: 'bren', name: 'Whirlwind', lvl: 3, cd: 14, mult: 1.2, desc: 'Spin and hit every monster for 120% damage.' },
    ironguard: { hero: 'bren', name: 'Iron Guard', lvl: 10, cd: 24, desc: 'Take 40% less damage for 6 seconds and recover some health.' },
    arrowrain: { hero: 'tavi', name: 'Arrow Rain', lvl: 3, cd: 16, mult: 0.7, desc: 'Six arrows fall on the monsters, 70% damage each.' },
    snipe: { hero: 'tavi', name: 'Piercing Shot', lvl: 10, cd: 22, mult: 3.5, desc: 'One huge arrow at the toughest monster: 350% damage, ignores armor, always a critical hit.' },
    bloom: { hero: 'iona', name: 'Radiant Bloom', lvl: 3, cd: 20, mult: 1.0, desc: 'Heals the whole party for a full heal.' },
    storm: { hero: 'iona', name: 'Storm Call', lvl: 10, cd: 22, mult: 1.6, desc: 'Lightning strikes every monster for 160% damage.' },
    hardswing: { hero: 'milo', name: 'Hard Swing', lvl: 3, cd: 12, mult: 2.4, desc: 'Puts his back into it: 240% damage to the toughest monster.' },
    rally: { hero: 'milo', name: 'Rally Cry', lvl: 10, cd: 28, desc: 'The whole party attacks 30% faster for 8 seconds.' },
    backstab: { hero: 'rook', name: 'Backstab', lvl: 3, cd: 10, mult: 1.2, desc: 'Three lightning stabs at the weakest monster: 120% each, always critical.' },
    smoke: { hero: 'rook', name: 'Smoke Bomb', lvl: 10, cd: 26, desc: 'Monsters are stunned for 3 seconds.' },
    fireball: { hero: 'elric', name: 'Fireball', lvl: 3, cd: 14, mult: 2.2, desc: 'A blazing ball: 220% damage to one monster, half of that to the others.' },
    meteor: { hero: 'elric', name: 'Meteor Shower', lvl: 10, cd: 26, mult: 1.1, desc: 'Five meteors fall on the monsters, 110% damage each.' },
    lance: { hero: 'maren', name: 'Spear Sweep', lvl: 3, cd: 14, mult: 1.5, desc: 'A long sweep hits every monster for 150% damage and ignores armor.' },
    bulwark: { hero: 'maren', name: 'Bulwark', lvl: 10, cd: 26, desc: 'The whole party takes 40% less damage for 6 seconds.' },
    ironpalm: { hero: 'tobin', name: 'Iron Palm', lvl: 3, cd: 12, mult: 2.6, desc: 'A crushing palm: 260% damage to one monster, and it is stunned for 2 seconds.' },
    innerpeace: { hero: 'tobin', name: 'Inner Peace', lvl: 10, cd: 26, desc: 'Tobin and his friends recover 30% of their health.' },
  };
  /* the short line on a button: what the skill does */
  const TAG = { whirlwind: 'Hits all', ironguard: 'Defend', arrowrain: 'Hits all', snipe: 'Big hit', bloom: 'Heals all', storm: 'Hits all', hardswing: 'Big hit', rally: 'Faster', backstab: 'Weakest foe',
    smoke: 'Stuns all', fireball: 'Fire', meteor: 'Hits all', lance: 'Hits all', bulwark: 'Defend all', ironpalm: 'Stun', innerpeace: 'Heals all' };
  const ICON = {
    whirlwind: '<path d="M12 4a8 8 0 0 1 8 8M12 20a8 8 0 0 1-8-8M8 5.2 4.5 5 5.4 8.4M16 18.8l3.5.2-.9-3.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
    ironguard: '<path d="M12 3l7 3v6c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z" fill="currentColor"/><path d="M12 7v10M8 11h8" stroke="#1a2a22" stroke-width="1.8" stroke-linecap="round"/>',
    arrowrain: '<path d="M5 3v9M12 2v10M19 3v9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2.5 10l2.5 4 2.5-4zM9.5 10l2.5 4 2.5-4zM16.5 10l2.5 4 2.5-4z" fill="currentColor"/><path d="M3 20h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    snipe: '<circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
    bloom: '<circle cx="12" cy="7" r="3.4" fill="currentColor"/><circle cx="17" cy="12" r="3.4" fill="currentColor"/><circle cx="12" cy="17" r="3.4" fill="currentColor"/><circle cx="7" cy="12" r="3.4" fill="currentColor"/><circle cx="12" cy="12" r="2.4" fill="#1a2a22"/>',
    storm: '<path d="M13.5 2 5 13.5h6L10 22l9-12h-6z" fill="currentColor"/>',
    hardswing: '<path d="M4 20 17 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M13 3l8 8-3 1-6-6z" fill="currentColor"/><path d="M3 12h4M5 16h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    rally: '<path d="M4 9v6l9 4V5z" fill="currentColor"/><path d="M16 8c2 1.2 2 6.8 0 8M19 6c3.4 2.4 3.4 9.6 0 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    backstab: '<path d="M4 20l9-9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M13 11l3-8 2 4 4 2z" fill="currentColor"/><path d="M5 5l3 3M3 10l4 1M10 3l1 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    smoke: '<circle cx="8" cy="14" r="4.6" fill="currentColor"/><circle cx="15" cy="11" r="5.2" fill="currentColor"/><circle cx="12" cy="17" r="4" fill="currentColor"/><circle cx="18" cy="16" r="3.2" fill="currentColor"/>',
    fireball: '<path d="M12 3c1 4 6 5 6 11a6 6 0 0 1-12 0c0-2 1-3.4 2.2-4.6C8.4 11 10 10 10 7c.9.7 1.6 1.6 1.6 3C13 8 13.2 5.6 12 3z" fill="currentColor"/>',
    meteor: '<circle cx="16" cy="16" r="4.6" fill="currentColor"/><path d="M12 12 3 3M14 9 7 2M9 14 2 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    lance: '<path d="M3 21 19 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M15 3h6v6z" fill="currentColor"/><path d="M5 9c3 .4 6 2.4 8 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    bulwark: '<path d="M12 3 4 6v6c0 4.6 3.4 7.4 8 9 4.6-1.6 8-4.4 8-9V6z" fill="currentColor"/><path d="M12 7.5 8.5 9v3c0 2 1.6 3.4 3.5 4.2 1.9-.8 3.5-2.2 3.5-4.2V9z" fill="#1a2a22"/>',
    ironpalm: '<path d="M7 20v-8l-2-3 1.6-1.2 2.4 2.4V5.5a1.2 1.2 0 0 1 2.4 0V10V4.5a1.2 1.2 0 0 1 2.4 0V10V5.5a1.2 1.2 0 0 1 2.4 0V12l2-1.6 1 1.4L17 15v5z" fill="currentColor"/>',
    innerpeace: '<path d="M12 21C5 16 3 12 3 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 1.5C21 12 19 16 12 21z" fill="currentColor"/><path d="M12 9v7M8.5 12.5h7" stroke="#1a2a22" stroke-width="1.9" stroke-linecap="round"/>',
  };
  const ORDER = Object.keys(SKILLS);
  /* Monsters have more HP because the heroes cast skills. Areas below the level of the first skill (recommended level < 3) are unchanged (tuned by simulation, see CLAUDE.md). */
  const skillHp = rec => (rec >= 10 ? 1.65 : rec >= 3 ? 1.4 : 1);
  let auto = true;
  try { auto = localStorage.getItem('wl-autoskill') !== '0'; } catch (e) { /* ignore */ }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const heroOf = id => B.heroes.find(h => h.id === SKILLS[id].hero);
  const centerOf = e => ({ x: e.x, y: e.y - unitTop(e.type, 56 * MON[e.type].scale) * 0.5 });
  const fx = o => B.fx.push(Object.assign({ t: 0 }, o));
  const unlocked = id => inParty(SKILLS[id].hero) && save.heroes[SKILLS[id].hero].lvl >= SKILLS[id].lvl;
  const slots = () => ORDER.filter(id => inParty(SKILLS[id].hero));
  function winCheck() { if (B && !B.over && aliveE().length === 0) endBattle('win'); }
  function jag(x0, y0, x1, y1, n, amp) {
    const pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const q = i / n; pts.push([x0 + (x1 - x0) * q + rnd(-amp, amp), y0 + (y1 - y0) * q + rnd(-amp, amp)]); }
    pts.push([x1, y1]);
    return pts;
  }

  /* ------------------------------ casting ------------------------------ */
  function cast(id, byAuto) {
    const S = SKILLS[id];
    if (!S || !B || B.over || B.t < B.intro || !unlocked(id) || (B.skillCd[id] || 0) > 0) return false;
    const h = heroOf(id);
    if (!h || h.dead) return false;
    const st = heroStats(h.id), foes = aliveE();
    if (!foes.length && id !== 'bloom' && id !== 'innerpeace' && id !== 'bulwark' && id !== 'rally') return false;
    B.skillCd[id] = S.cd;
    h.swing = 1;
    snd('skill_' + id);
    floater(h.x, h.y - unitTop(h.id, 70) - 18, S.name + '!', '#ffe9a8', true);
    const dmg = (e, mult, i, pierce, crit, wid) => { if (e.dead) return; B.mute = i > 0; hitEnemy(e, st.atk * mult, i, pierce, crit, wid); B.mute = false; };
    if (id === 'whirlwind') {
      fx({ k: 'whirl', x: h.x, y: h.y - 30, life: 0.7 }); fx({ k: 'nova', x: h.x, y: h.y - 24, r0: 8, r1: 70, c: '255,226,150', life: 0.45 });
      foes.forEach((e, i) => later(0.2 + i * 0.05, () => { dmg(e, S.mult, i, 0, st.crit, 'great'); if (i === foes.length - 1) winCheck(); }));
    } else if (id === 'ironguard') {
      h.guard = 6; h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.15));
      fx({ k: 'dome', hid: h.id, life: 6 }); fx({ k: 'nova', x: h.x, y: h.y - 26, r0: 10, r1: 60, c: '255,214,110', life: 0.5 });
      fx({ k: 'burst', x: h.x, y: h.y - 30, kind: 'spark', n: 10, life: 0.6 });
    } else if (id === 'arrowrain') {
      const n = 6, targets = Array.from({ length: n }, () => pick(foes));
      targets.forEach((tg, i) => {
        const at = 0.1 + i * 0.12;
        later(at, () => { const e = tg.dead ? pick(aliveE().length ? aliveE() : [tg]) : tg, p = centerOf(e); fx({ k: 'rain', x: p.x + rnd(-8, 8), y: p.y, life: 0.28 }); });
        later(at + 0.26, () => { const e = tg.dead ? pick(aliveE().length ? aliveE() : [tg]) : tg; dmg(e, S.mult, i % 3, 0, st.crit, 'bow'); if (i === n - 1) winCheck(); });
      });
    } else if (id === 'snipe') {
      const tg = foes.reduce((a, b) => (b.hp > a.hp ? b : a)), p = centerOf(tg);
      fx({ k: 'beam', x0: h.x + 22, y0: h.y - 32, x1: p.x, y1: p.y, life: 0.4 });
      later(0.3, () => { dmg(tg, S.mult, 0, 1, 1, 'longbow'); fx({ k: 'nova', x: p.x, y: p.y, r0: 6, r1: 48, c: '255,240,200', life: 0.35 }); winCheck(); });
    } else if (id === 'bloom') {
      const amt = Math.round(st.heal * S.mult * ((WEAPONS[save.heroes[h.id].weapon] || {}).healMult || 1));
      for (const a of aliveH()) {
        a.hp = Math.min(a.maxHp, a.hp + amt);
        floater(a.x, a.y - unitTop(a.id, 70) - 4, '+' + amt, '#8ff0a4');
        fx({ k: 'nova', x: a.x, y: a.y - 22, r0: 8, r1: 46, c: '143,240,164', life: 0.55 }); fx({ k: 'burst', x: a.x, y: a.y - 26, kind: 'leaf', n: 9, life: 0.8 });
      }
    } else if (id === 'hardswing') {
      const tg = foes.reduce((a, b) => (b.hp > a.hp ? b : a)), p = centerOf(tg);
      fx({ k: 'slash', x: p.x, y: p.y, a: -0.3, r: 30, w: 6, life: 0.3 }); fx({ k: 'burst', x: p.x, y: p.y + 12, kind: 'dust', n: 9, life: 0.5 });
      later(0.2, () => { dmg(tg, S.mult, 0, 0, st.crit, 'woodaxe'); winCheck(); });
    } else if (id === 'rally') {
      B.haste = 8;
      for (const a of aliveH()) { fx({ k: 'nova', x: a.x, y: a.y - 24, r0: 8, r1: 44, c: '255,226,150', life: 0.5 }); fx({ k: 'burst', x: a.x, y: a.y - 30, kind: 'spark', n: 6, life: 0.5 }); }
    } else if (id === 'backstab') {
      const tg = foes.reduce((a, b) => (b.hp < a.hp ? b : a));
      for (let i = 0; i < 3; i++) later(0.1 + i * 0.12, () => {
        if (tg.dead) { winCheck(); return; }
        const p = centerOf(tg); fx({ k: 'thrust', x: p.x, y: p.y + rnd(-6, 6), life: 0.18 }); fx({ k: 'slash', x: p.x, y: p.y, a: rnd(-0.8, 0.8), r: 15, w: 2.4, life: 0.16 });
        dmg(tg, S.mult, i, 0, 1, 'twindaggers'); if (i === 2) winCheck();
      });
    } else if (id === 'smoke') {
      const sp = B.cam ? camPt(270, 190, true) : [270, 190]; fx({ k: 'smoke', x: sp[0], y: sp[1], life: 1.4 }); fx({ k: 'burst', x: h.x, y: h.y - 24, kind: 'dust', n: 10, life: 0.6 });
      for (const e of foes) { e.stun = 3; fx({ k: 'burst', x: e.x, y: e.y - 34, kind: 'dust', n: 6, life: 0.7 }); }
    } else if (id === 'fireball') {
      const tg = foes.reduce((a, b) => (b.hp > a.hp ? b : a)), p = centerOf(tg);
      fx({ k: 'fireball', x0: h.x + 22, y0: h.y - 34, x1: p.x, y1: p.y, life: 0.4 });
      later(0.38, () => {
        fx({ k: 'nova', x: p.x, y: p.y, r0: 6, r1: 56, c: '255,150,70', life: 0.45 }); fx({ k: 'burst', x: p.x, y: p.y, kind: 'ember', n: 12, life: 0.6 }); fx({ k: 'flash', life: 0.12, a: 0.25 });
        dmg(tg, S.mult, 0, 0, st.crit, 'grimoire');
        aliveE().filter(o => o !== tg).forEach((o, i) => dmg(o, S.mult * 0.5, i + 1, 0, st.crit, 'grimoire'));
        winCheck();
      });
    } else if (id === 'meteor') {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const tg = pick(foes);
        later(0.1 + i * 0.18, () => { const e = tg.dead ? pick(aliveE().length ? aliveE() : [tg]) : tg, p = centerOf(e); fx({ k: 'meteor', x: p.x + rnd(-6, 6), y: p.y, life: 0.34 }); });
        later(0.1 + i * 0.18 + 0.32, () => {
          const e = tg.dead ? pick(aliveE().length ? aliveE() : [tg]) : tg, p = centerOf(e);
          fx({ k: 'nova', x: p.x, y: p.y, r0: 5, r1: 38, c: '255,140,60', life: 0.4 }); fx({ k: 'burst', x: p.x, y: p.y, kind: 'ember', n: 8, life: 0.5 });
          dmg(e, S.mult, i % 3, 0, st.crit, 'grimoire'); if (i === n - 1) winCheck();
        });
      }
    } else if (id === 'lance') {
      fx({ k: 'beam', x0: h.x + 20, y0: h.y - 34, x1: 395, y1: h.y - 34, life: 0.35 }); fx({ k: 'nova', x: h.x + 40, y: h.y - 30, r0: 8, r1: 64, c: '255,236,190', life: 0.4 });
      foes.forEach((e, i) => later(0.18 + i * 0.05, () => { dmg(e, S.mult, i, 1, st.crit, 'halberd'); if (i === foes.length - 1) winCheck(); }));
    } else if (id === 'bulwark') {
      for (const a of aliveH()) { a.guard = 6; fx({ k: 'dome', hid: a.id, life: 6 }); fx({ k: 'nova', x: a.x, y: a.y - 26, r0: 10, r1: 52, c: '255,214,110', life: 0.5 }); }
    } else if (id === 'ironpalm') {
      const tg = foes.reduce((a, b) => (b.hp > a.hp ? b : a)), p = centerOf(tg);
      fx({ k: 'nova', x: p.x, y: p.y, r0: 4, r1: 34, c: '255,226,150', life: 0.3 }); fx({ k: 'burst', x: p.x, y: p.y, kind: 'dust', n: 9, life: 0.5 });
      later(0.18, () => { dmg(tg, S.mult, 0, 0, st.crit, 'gauntlets'); if (!tg.dead) tg.stun = 2; winCheck(); });
    } else if (id === 'innerpeace') {
      for (const a of aliveH()) {
        const amt = Math.round(a.maxHp * 0.3); a.hp = Math.min(a.maxHp, a.hp + amt);
        floater(a.x, a.y - unitTop(a.id, 70) - 4, '+' + amt, '#8ff0a4');
        fx({ k: 'nova', x: a.x, y: a.y - 22, r0: 8, r1: 46, c: '255,226,150', life: 0.6 }); fx({ k: 'burst', x: a.x, y: a.y - 26, kind: 'spark', n: 7, life: 0.7, c: '#fff0b8' });
      }
    } else if (id === 'storm') {
      foes.forEach((e, i) => {
        const p = centerOf(e);
        later(i * 0.1, () => { fx({ k: 'strike', x: p.x, y: p.y, pts: jag(p.x + rnd(-14, 14), -10, p.x, p.y, 8, 11), life: 0.34 }); });
        later(i * 0.1 + 0.08, () => { dmg(e, S.mult, i, 0, st.crit, 'stormstaff'); if (i === foes.length - 1) winCheck(); });
      });
    }
    return true;
  }
  /* the auto-cast rules: use a skill when it would help */
  function wants(id) {
    const foes = aliveE(), boss = foes.some(e => MON[e.type].boss), hurt = aliveH().some(a => a.hp < a.maxHp * 0.7);
    if (id === 'whirlwind') return foes.length >= 2 || boss;
    if (id === 'ironguard') { const b = B.heroes.find(h => h.id === 'bren'); return !!b && !b.dead && (b.hp < b.maxHp * 0.8 || foes.some(e => e.state === 'wind' && e.kind === 'charge')); }
    if (id === 'arrowrain' || id === 'snipe') return foes.length >= 1;
    if (id === 'bloom') return hurt;
    if (id === 'storm') return foes.length >= 2 || boss;
    if (id === 'hardswing' || id === 'ironpalm' || id === 'backstab') return foes.length >= 1;
    if (id === 'rally') return foes.length >= 2 || boss;
    if (id === 'smoke') return boss ? foes.some(e => e.state === 'wind' && e.kind === 'charge') || aliveH().some(a => a.hp < a.maxHp * 0.5) : (foes.length >= 3 && aliveH().some(a => a.hp < a.maxHp * 0.6));
    if (id === 'fireball') return foes.length >= 2 || boss;
    if (id === 'meteor') return foes.length >= 3 || boss;
    if (id === 'lance') return foes.length >= 2 || boss;
    if (id === 'bulwark') return foes.some(e => e.state === 'wind' && e.kind === 'charge') || (foes.length >= 3 && hurt);
    if (id === 'innerpeace') return aliveH().some(a => a.hp < a.maxHp * 0.6);
    return false;
  }

  window.SKILLS = SKILLS; window.skillHp = skillHp;
  window.skillSlots = slots;
  window.castSkill = id => cast(id, false);
  window.castSkillSlot = n => { const id = slots()[n]; return id ? cast(id, false) : false; };
  window.autoSkillOn = () => auto;
  window.setAutoSkill = on => { auto = !!on; try { localStorage.setItem('wl-autoskill', auto ? '1' : '0'); } catch (e) { /* ignore */ } paintAuto(); };
  window.initSkills = function () {
    B.skillCd = {}; B.skillGap = 0;
    for (const id of ORDER) B.skillCd[id] = SKILLS[id].cd * 0.3;            // not at the very first second
    buildBar(); paintAuto();
  };
  window.skillsStep = function (dt) {
    for (const id in B.skillCd) if (B.skillCd[id] > 0) B.skillCd[id] = Math.max(0, B.skillCd[id] - dt);
    for (const h of B.heroes) if (h.guard > 0) h.guard = Math.max(0, h.guard - dt);
    if (B.haste > 0) B.haste = Math.max(0, B.haste - dt);
    for (const e of B.enemies) if (e.stun > 0) e.stun = Math.max(0, e.stun - dt);
    for (const e of B.enemies) if (e.chill > 0) e.chill = Math.max(0, e.chill - dt);
    B.skillGap = Math.max(0, (B.skillGap || 0) - dt);
    if (auto && B.skillGap <= 0 && B.t >= B.intro) for (const id of slots()) if (unlocked(id) && wants(id) && cast(id, true)) { B.skillGap = 0.6; break; }
  };

  /* ------------------------------ the button row ------------------------------ */
  function buildBar() {
    const bar = document.getElementById('skills');
    if (!bar) return;
    const col = typeof HERO_ACCENT !== 'undefined' ? HERO_ACCENT : {};
    bar.innerHTML = slots().map((id, i) => `<button class="skill" data-act="skill" data-arg="${id}" data-id="${id}" style="--hc:${col[SKILLS[id].hero]}" title="${SKILLS[id].name}: ${SKILLS[id].desc}" aria-label="${SKILLS[id].name}">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${ICON[id]}</svg><b class="sk-name${SKILLS[id].name.length > 12 ? ' long' : ''}">${SKILLS[id].name}</b><span class="sk-st"></span><i class="cd"></i><small>${i + 1}</small></button>`).join('');
    bar.hidden = !bar.children.length || !B.spec.repeatable;
  }
  window.clearSkillBar = () => { const bar = document.getElementById('skills'); if (bar) { bar.innerHTML = ''; bar.hidden = true; } };
  window.skillsUi = function () {
    const bar = document.getElementById('skills');
    if (!bar || bar.hidden || !B) return;
    for (const b of bar.children) {
      const id = b.dataset.id, S = SKILLS[id], cd = B.skillCd[id] || 0, h = heroOf(id), ok = unlocked(id), dead = !h || h.dead;
      b.classList.toggle('locked', !ok); b.classList.toggle('dead', ok && dead);
      b.classList.toggle('ready', ok && !dead && cd <= 0 && !B.over);
      b.style.setProperty('--cd', ok ? (cd / S.cd).toFixed(3) : '1');
      const cool = ok && !dead && cd > 0;
      b.classList.toggle('cooling', cool);
      const st = !ok ? 'Unlocks Lv ' + S.lvl : dead ? 'Fallen' : cool ? Math.ceil(cd) + 's' : TAG[id];
      if (b.lastSt !== st) { b.lastSt = st; b.querySelector('.sk-st').textContent = st; }
    }
  };
  function paintAuto() {
    const b = document.getElementById('auto-skill');
    if (!b) return;
    b.hidden = !(B && B.spec && B.spec.repeatable);
    b.classList.toggle('on', auto);
    b.setAttribute('aria-pressed', String(auto));
    b.textContent = auto ? 'Auto on' : 'Auto';
    b.title = auto ? 'Skills are cast automatically: tap to cast them yourself' : 'Skills wait for you: tap to cast them automatically';
  }

  /* the skill list on a hero card (folded) */
  window.skillsCardHtml = function (hero) {
    const ids = ORDER.filter(id => SKILLS[id].hero === hero), lv = save.heroes[hero].lvl, key = 'skills-' + hero;
    return `<details class="drops" data-key="${key}" ${uiOpen.has(key) ? 'open' : ''}><summary><span>Skills</span><em>${ids.filter(id => lv >= SKILLS[id].lvl).length} of ${ids.length}</em></summary>
      <div class="skilllist">${ids.map(id => { const S = SKILLS[id], on = lv >= S.lvl;
        return `<div class="skillrow ${on ? '' : 'off'}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${ICON[id]}</svg><div><b>${S.name}</b>${on ? '' : `<span class="tag lock">Level ${S.lvl}</span>`}<p>${S.desc} Ready again after ${S.cd} seconds.</p></div></div>`; }).join('')}</div>
      <p class="fine">In a fight your skills sit under the scene (keys 1 to 8): each button shows the skill name, what it does and when it is ready. "Auto" casts them for you.</p></details>`;
  };

  /* ------------------------------ effects of weapon hits ------------------------------ */
  window.projKind = wid => ({ stormstaff: 'zap', frostwand: 'shard', heartwood: 'leaf', tome: 'fire', grimoire: 'fire' }[wid] || 'bolt');
  window.projDur = wid => ({ stormstaff: 0.1, frostwand: 0.28, heartwood: 0.3, tome: 0.26, grimoire: 0.4 }[wid] || 0.25);
  window.fxOnHit = function (e, wid, crit) {
    if (!B) return;
    const p = centerOf(e), W = WEAPONS[wid] || WEAPONS.sword;
    if (W.fam === 'sword') {
      if (wid === 'rapier') fx({ k: 'thrust', x: p.x, y: p.y, life: 0.18 });
      else if (wid === 'buckler') fx({ k: 'nova', x: p.x, y: p.y, r0: 4, r1: 22, c: '255,230,170', life: 0.22 });
      else fx({ k: 'slash', x: p.x, y: p.y, a: rnd(-0.5, 0.5), r: wid === 'great' ? 26 : wid === 'saber' ? 15 : 19, w: wid === 'great' ? 5 : wid === 'saber' ? 2 : 3.2, life: wid === 'saber' ? 0.16 : 0.24 });
      if (wid === 'great') fx({ k: 'burst', x: p.x, y: p.y + 14, kind: 'dust', n: 7, life: 0.45 });
    } else if (W.fam === 'tool') {
      if (wid === 'pitchfork') fx({ k: 'thrust', x: p.x, y: p.y, life: 0.18 });
      else fx({ k: 'slash', x: p.x, y: p.y, a: rnd(-0.3, 0.3), r: wid === 'woodaxe' ? 24 : 18, w: wid === 'woodaxe' ? 5 : 4, life: 0.24 });
      fx({ k: 'burst', x: p.x, y: p.y + 10, kind: 'dust', n: wid === 'woodaxe' ? 7 : 4, life: 0.4 });
    } else if (W.fam === 'dagger') {
      fx({ k: 'slash', x: p.x, y: p.y, a: rnd(-1, 1), r: 13, w: 2, life: 0.14 });
    } else if (W.fam === 'spear') {
      fx({ k: 'thrust', x: p.x, y: p.y, life: 0.2 });
      if (wid === 'halberd') fx({ k: 'slash', x: p.x, y: p.y, a: rnd(-0.4, 0.4), r: 26, w: 4.5, life: 0.26 });
    } else if (W.fam === 'fist') {
      fx({ k: 'nova', x: p.x, y: p.y, r0: 3, r1: wid === 'gauntlets' ? 28 : 18, c: '255,226,170', life: 0.22 }); fx({ k: 'burst', x: p.x, y: p.y, kind: wid === 'gauntlets' ? 'spark' : 'dust', n: 5, life: 0.3 });
    } else if (W.fam === 'tome') {
      fx({ k: 'burst', x: p.x, y: p.y, kind: 'ember', n: wid === 'grimoire' ? 10 : 6, life: 0.4 }); fx({ k: 'nova', x: p.x, y: p.y, r0: 4, r1: wid === 'grimoire' ? 40 : 24, c: '255,150,70', life: 0.3 });
    } else if (W.fam === 'bow') {
      fx({ k: 'burst', x: p.x, y: p.y, kind: wid === 'crossbow' ? 'spark' : 'dust', n: 5, life: 0.3 });
    } else if (wid === 'stormstaff') {
      fx({ k: 'burst', x: p.x, y: p.y, kind: 'spark', n: 7, life: 0.35, c: '#bfe6ff' });
      if (W.splash) aliveE().filter(o => o !== e).slice(0, 2).forEach(o => { const q = centerOf(o); fx({ k: 'zap', pts: jag(p.x, p.y, q.x, q.y, 6, 6), life: 0.2 }); });
    } else if (wid === 'frostwand') {
      fx({ k: 'burst', x: p.x, y: p.y, kind: 'ice', n: 9, life: 0.5 }); fx({ k: 'nova', x: p.x, y: p.y, r0: 5, r1: 30, c: '170,225,255', life: 0.3 });
    } else if (wid === 'heartwood') {
      fx({ k: 'burst', x: p.x, y: p.y, kind: 'leaf', n: 8, life: 0.6 });
    } else {
      fx({ k: 'burst', x: p.x, y: p.y, kind: 'spark', n: 7, life: 0.4, c: '#e6d8ff' });
    }
    if (crit) { fx({ k: 'nova', x: p.x, y: p.y, r0: 6, r1: 40, c: '255,226,130', life: 0.3 }); fx({ k: 'burst', x: p.x, y: p.y, kind: 'spark', n: 10, life: 0.45 }); fx({ k: 'flash', life: 0.12, a: 0.3 }); }
  };

  /* ------------------------------ drawing ------------------------------ */
  window.drawMagicFx = function (c, f) {
    const k = f.life ? f.t / f.life : 0, a = Math.max(0, 1 - k);
    switch (f.k) {
      case 'slash': {
        c.save(); c.globalAlpha = a; c.lineCap = 'round';
        c.strokeStyle = '#fff6d8'; c.lineWidth = f.w * (1 - k * 0.5); c.beginPath(); c.arc(f.x - f.r * 0.5, f.y, f.r * (0.8 + k * 0.4), f.a - 1.1, f.a + 1.1); c.stroke();
        c.strokeStyle = 'rgba(255,214,110,.7)'; c.lineWidth = f.w * 0.5; c.beginPath(); c.arc(f.x - f.r * 0.5, f.y, f.r * (1 + k * 0.4), f.a - 1, f.a + 1); c.stroke();
        c.restore(); return true;
      }
      case 'thrust': {
        c.save(); c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(f.x - 34 + k * 14, f.y - 2); c.lineTo(f.x + 6, f.y); c.stroke();
        c.strokeStyle = 'rgba(190,230,255,.6)'; c.lineWidth = 5; c.beginPath(); c.moveTo(f.x - 24 + k * 14, f.y - 1); c.lineTo(f.x + 4, f.y); c.stroke(); c.restore(); return true;
      }
      case 'zap': case 'strike': {
        const pts = f.pts; if (!pts) return true;
        c.save(); c.globalAlpha = a; c.lineJoin = 'round'; c.lineCap = 'round';
        const draw = w => { c.lineWidth = w; c.beginPath(); pts.forEach((p, i) => { const j = Math.floor(f.t * 40) % 2 ? 1.5 : -1.5; i ? c.lineTo(p[0] + (i % 2 ? j : -j), p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); };
        c.strokeStyle = 'rgba(120,180,255,.55)'; draw(f.k === 'strike' ? 8 : 6); c.strokeStyle = '#ffffff'; draw(2.2);
        if (f.k === 'strike') { const g = c.createRadialGradient(f.x, f.y, 2, f.x, f.y, 30); g.addColorStop(0, `rgba(210,235,255,${0.8 * a})`); g.addColorStop(1, 'rgba(120,180,255,0)'); c.fillStyle = g; c.fillRect(f.x - 32, f.y - 32, 64, 64); }
        c.restore(); return true;
      }
      case 'nova': {
        const r = f.r0 + (f.r1 - f.r0) * Math.sin(Math.min(1, k) * Math.PI / 2);
        c.save(); c.globalAlpha = a; c.strokeStyle = `rgba(${f.c},.9)`; c.lineWidth = 3 * (1 - k * 0.6);
        c.beginPath(); c.ellipse(f.x, f.y, r, r * 0.55, 0, 0, 7); c.stroke();
        c.fillStyle = `rgba(${f.c},${0.18 * a})`; c.fill(); c.restore(); return true;
      }
      case 'burst': {
        if (!f.ps) f.ps = Array.from({ length: f.n }, (_, i) => ({ a: (i / f.n) * 6.283 + rnd(-0.3, 0.3), s: rnd(18, 42), r: rnd(0, 6.28) }));
        c.save();
        for (const p of f.ps) {
          const d = p.s * Math.sin(Math.min(1, k) * Math.PI / 2), x = f.x + Math.cos(p.a) * d, y = f.y + Math.sin(p.a) * d * 0.7 + (f.kind === 'leaf' ? k * 12 : f.kind === 'dust' ? -k * 4 : 0);
          c.globalAlpha = a; c.translate(x, y); c.rotate(p.r + k * 3);
          if (f.kind === 'ice') { c.fillStyle = '#c8ecff'; c.beginPath(); c.moveTo(0, -4); c.lineTo(2.2, 0); c.lineTo(0, 4); c.lineTo(-2.2, 0); c.fill(); }
          else if (f.kind === 'leaf') { c.fillStyle = '#7fd68a'; c.beginPath(); c.ellipse(0, 0, 4, 2, 0, 0, 7); c.fill(); }
          else if (f.kind === 'ember') { c.fillStyle = Math.random() < 0.5 ? '#ffb347' : '#ff6a2e'; c.beginPath(); c.arc(0, 0, 2.4 * (1 - k * 0.5), 0, 7); c.fill(); }
          else if (f.kind === 'dust') { c.fillStyle = 'rgba(205,180,140,.7)'; c.beginPath(); c.arc(0, 0, 2.5 * (1 + k), 0, 7); c.fill(); }
          else { c.fillStyle = f.c || '#ffe58a'; c.fillRect(-1.5, -4, 3, 8); c.fillRect(-4, -1.5, 8, 3); }
          camSet(c);
        }
        c.restore(); return true;
      }
      case 'whirl': {
        c.save(); c.globalAlpha = a; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ang = k * 12 + i * 2.09, r = 34 + k * 14;
          c.strokeStyle = i ? 'rgba(255,214,110,.8)' : '#fff6d8'; c.lineWidth = 4 * (1 - k * 0.5);
          c.beginPath(); c.ellipse(f.x, f.y, r, r * 0.5, 0, ang, ang + 1.4); c.stroke();
        }
        c.restore(); return true;
      }
      case 'rain': {
        const q = Math.min(1, f.t / f.life), x = f.x + 26 * (1 - q), y = f.y - 170 * (1 - q * q);
        c.save(); c.strokeStyle = '#f4ead0'; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 6, y - 22); c.lineTo(x, y); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(x - 10, y - 40); c.lineTo(x - 6, y - 22); c.stroke();
        c.fillStyle = '#cfd8e3'; c.beginPath(); c.moveTo(x + 1, y + 4); c.lineTo(x - 3, y - 3); c.lineTo(x + 3, y - 3); c.fill(); c.restore(); return true;
      }
      case 'beam': {
        c.save(); c.globalAlpha = a; c.lineCap = 'round';
        c.strokeStyle = 'rgba(255,226,140,.5)'; c.lineWidth = 12 * a; c.beginPath(); c.moveTo(f.x0, f.y0); c.lineTo(f.x1, f.y1); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 3.5 * a; c.beginPath(); c.moveTo(f.x0, f.y0); c.lineTo(f.x1, f.y1); c.stroke(); c.restore(); return true;
      }
      case 'dome': {
        const h = B.heroes.find(x => x.id === f.hid); if (!h || h.dead) return true;
        const pulse = 0.5 + 0.5 * Math.sin(B.t * 6), fade = Math.min(1, (f.life - f.t) / 0.6);
        c.save(); c.globalAlpha = fade;
        const g = c.createRadialGradient(h.x, h.y - 30, 6, h.x, h.y - 30, 42); g.addColorStop(0, 'rgba(255,214,110,0)'); g.addColorStop(1, `rgba(255,214,110,${0.22 + 0.12 * pulse})`);
        c.fillStyle = g; c.beginPath(); c.ellipse(h.x, h.y - 30, 34, 44, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(255,226,150,${0.55 + 0.3 * pulse})`; c.lineWidth = 2; c.stroke(); c.restore(); return true;
      }
      case 'smoke': {
        c.save();
        for (let i = 0; i < 9; i++) {
          const r = 22 + i * 4 + k * 26, x = f.x - 90 + i * 22 + Math.sin(i * 1.7 + f.t * 2) * 10, y = f.y - 20 - (i % 3) * 20 - k * 12;
          c.globalAlpha = Math.max(0, 0.5 * (1 - k * k)); c.fillStyle = i % 2 ? '#7d7487' : '#a8a0b0'; c.beginPath(); c.ellipse(x, y, r, r * 0.7, 0, 0, 7); c.fill();
        }
        c.restore(); return true;
      }
      case 'fireball': case 'meteor': {
        const q = Math.min(1, f.t / f.life);
        const x = f.k === 'meteor' ? f.x + 60 * (1 - q) : f.x0 + (f.x1 - f.x0) * q, y = f.k === 'meteor' ? f.y - 190 * (1 - q * q) : f.y0 + (f.y1 - f.y0) * q - Math.sin(q * Math.PI) * 16;
        const r = f.k === 'meteor' ? 7 : 9;
        c.save();
        const g = c.createRadialGradient(x, y, 1, x, y, r * 2.4); g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(0.4, 'rgba(255,150,60,.7)'); g.addColorStop(1, 'rgba(255,90,30,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.4, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,150,60,.5)'; c.lineWidth = r * 0.9; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - (f.k === 'meteor' ? 26 : 18) * (f.k === 'meteor' ? 0.4 : 1), y - (f.k === 'meteor' ? 26 : 0)); c.stroke();
        c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(x, y, r * 0.5, 0, 7); c.fill();
        c.restore(); return true;
      }
      case 'flash': { c.save(); c.globalAlpha = f.a * a; c.fillStyle = '#fff'; c.fillRect(...viewRect()); c.restore(); return true; }
      case 'proj': {
        if (f.kind !== 'zap' && f.kind !== 'shard' && f.kind !== 'leaf' && f.kind !== 'fire') return false;
        const q = Math.min(1, f.t / f.dur), x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q - (f.kind === 'zap' ? 0 : Math.sin(q * Math.PI) * 14);
        c.save();
        if (f.kind === 'zap') {
          if (!f.pts) f.pts = jag(f.x0, f.y0, f.x1, f.y1, 7, 8);
          const n = Math.max(2, Math.ceil(f.pts.length * q));
          c.lineJoin = 'round'; c.lineCap = 'round';
          c.strokeStyle = 'rgba(120,180,255,.55)'; c.lineWidth = 6; c.beginPath(); f.pts.slice(0, n).forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
        } else if (f.kind === 'fire') {
          const g = c.createRadialGradient(x, y, 1, x, y, 12); g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(0.45, 'rgba(255,150,60,.75)'); g.addColorStop(1, 'rgba(255,90,30,0)');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill();
        } else if (f.kind === 'shard') {
          c.translate(x, y); c.rotate(Math.atan2(f.y1 - f.y0, f.x1 - f.x0));
          c.fillStyle = 'rgba(160,220,255,.35)'; c.beginPath(); c.arc(-4, 0, 8, 0, 7); c.fill();
          c.fillStyle = '#d8f2ff'; c.beginPath(); c.moveTo(9, 0); c.lineTo(0, -3.5); c.lineTo(-8, 0); c.lineTo(0, 3.5); c.fill();
          c.strokeStyle = '#7fc8ff'; c.lineWidth = 1; c.stroke();
        } else {
          c.translate(x, y); c.rotate(q * 9);
          c.fillStyle = 'rgba(143,240,164,.3)'; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill();
          c.fillStyle = '#7fd68a'; c.beginPath(); c.ellipse(0, 0, 6, 3, 0, 0, 7); c.fill();
          c.fillStyle = '#c9f5b4'; c.beginPath(); c.ellipse(-1, -1, 3, 1.2, 0, 0, 7); c.fill();
        }
        c.restore(); return true;
      }
      default: return false;
    }
  };
})();
