/* Achievements and play stats. Counters live in save.stats, unlocked goals in save.ach (1 = done, 2 = reward taken).
   game.js calls ach.count(name) from the fight (wins, kills, bosses), drops, merges; skills.js counts skills.
   The page is a dialog opened from the Map tab card or Settings (actions.achievements). */
(function () {
  'use strict';
  const S = () => save.stats;
  const maxHeroLevel = () => Math.max(...HERO_ORDER.filter(id => save.hired.includes(id)).map(id => save.heroes[id].lvl));
  const bestGradeOf = list => Math.max(-1, ...list.map(x => bestGradeAny(x)));
  const bestGradeAny = id => { const a = (save.items[id] || save.armors[id] || []); for (let g = GRADES.length - 1; g >= 0; g--) if (a[g] > 0) return g; return -1; };
  const trainedTotal = () => HERO_ORDER.reduce((a, id) => a + trTotal(id), 0);
  const maxedStat = () => HERO_ORDER.some(id => TRAIN_KEYS.some(k => trLv(id, k) >= TRAIN_MAX)) ? 1 : 0;
  const clearedN = () => Object.keys(STAGE).filter(k => save.cleared[k]).length;
  // [id, group, name, what to do, current value, goal, reward]
  const LIST = [
    ['win1', 'Battle', 'First blood', 'Win a fight', () => S().wins, 1, { gold: 100 }],
    ['win10', 'Battle', 'Seasoned', 'Win 10 fights', () => S().wins, 10, { gold: 400 }],
    ['win50', 'Battle', 'Veteran', 'Win 50 fights', () => S().wins, 50, { gold: 2000, lumber: 40 }],
    ['win250', 'Battle', 'Warband', 'Win 250 fights', () => S().wins, 250, { gold: 9000, lumber: 150 }],
    ['kill100', 'Battle', 'Monster hunter', 'Defeat 100 monsters', () => S().kills, 100, { gold: 500 }],
    ['kill1000', 'Battle', 'Beast slayer', 'Defeat 1,000 monsters', () => S().kills, 1000, { gold: 6000, lumber: 100 }],
    ['kill10000', 'Battle', 'Legend of the wild', 'Defeat 10,000 monsters', () => S().kills, 10000, { gold: 40000, lumber: 500 }],
    ['boss1', 'Battle', 'Giant killer', 'Defeat a boss', () => S().bosses, 1, { gold: 300 }],
    ['boss10', 'Battle', 'Crown breaker', 'Defeat 10 bosses', () => S().bosses, 10, { gold: 5000, lumber: 80 }],
    ['skill25', 'Battle', 'Trick of the trade', 'Use hero skills 25 times', () => S().skills, 25, { gold: 300 }],
    ['skill300', 'Battle', 'Skill master', 'Use hero skills 300 times', () => S().skills, 300, { gold: 5000, lumber: 80 }],
    ['clear3', 'Journey', 'First steps', 'Clear 3 adventures', clearedN, 3, { gold: 300 }],
    ['clear10', 'Journey', 'On the road', 'Clear 10 adventures', clearedN, 10, { gold: 3000, lumber: 60 }],
    ['clearAll', 'Journey', 'Every flag raised', 'Clear every adventure', clearedN, Object.keys(STAGE).length, { gold: 50000, lumber: 600 }],
    ['hire4', 'Journey', 'A full party', 'Hire 4 heroes', () => save.hired.length, 4, { gold: 1500 }],
    ['hireAll', 'Journey', 'The whole company', 'Hire every hero', () => save.hired.length, HERO_ORDER.length, { gold: 40000, lumber: 400 }],
    ['lv10', 'Journey', 'Rising star', 'Reach hero level 10', maxHeroLevel, 10, { gold: 500 }],
    ['lv25', 'Journey', 'Champion', 'Reach hero level 25', maxHeroLevel, 25, { gold: 6000, lumber: 100 }],
    ['lv50', 'Journey', 'Living legend', 'Reach hero level 50', maxHeroLevel, 50, { gold: 40000, lumber: 500 }],
    ['drop1', 'Gear', 'Something shiny', 'Find a weapon or armor', () => S().drops, 1, { gold: 150 }],
    ['drop25', 'Gear', 'Treasure hunter', 'Find 25 weapons or armors', () => S().drops, 25, { gold: 3000, lumber: 60 }],
    ['merge1', 'Gear', 'Forged anew', 'Merge 3 copies into a better one', () => S().merges, 1, { gold: 300 }],
    ['merge15', 'Gear', 'Master smith', 'Merge 15 times', () => S().merges, 15, { gold: 6000, lumber: 100 }],
    ['epic', 'Gear', 'Epic find', 'Own an Epic weapon or armor', () => bestGradeOf([...Object.keys(WEAPONS), ...ARMOR_IDS]) >= 3 ? 1 : 0, 1, { gold: 3000, lumber: 50 }],
    ['legend', 'Gear', 'Legendary', 'Own a Legendary weapon or armor', () => bestGradeOf([...Object.keys(WEAPONS), ...ARMOR_IDS]) >= 4 ? 1 : 0, 1, { gold: 20000, lumber: 300 }],
    ['train10', 'Training', 'Student', 'Train 10 stat levels in total', trainedTotal, 10, { gold: 1000, lumber: 20 }],
    ['train50', 'Training', 'Disciplined', 'Train 50 stat levels in total', trainedTotal, 50, { gold: 12000, lumber: 200 }],
    ['trainMax', 'Training', 'Specialist', 'Max out one stat of a hero', maxedStat, 1, { gold: 6000, lumber: 100 }],
  ];
  const BY = Object.fromEntries(LIST.map(a => [a[0], a]));
  const val = a => Math.min(a[5], Math.max(0, Math.floor(Number(a[4]()) || 0)));

  function count(k, n) { if (!save.stats) return; save.stats[k] = (save.stats[k] || 0) + (n || 1); }
  function check() {                                                       // newly reached goals become "ready"
    if (!save || !save.ach || !save.stats) return;
    for (const a of LIST) if (!save.ach[a[0]] && val(a) >= a[5]) { save.ach[a[0]] = 1; if (typeof toast === 'function') toast('Achievement: ' + a[2] + '. Reward waiting.'); try { persist(true); } catch (e) { /* ignore */ } }
  }
  const ready = () => LIST.filter(a => save.ach && save.ach[a[0]] === 1).length;
  const doneN = () => LIST.filter(a => save.ach && save.ach[a[0]]).length;
  const rewardHtml = r => [r.gold ? `<i class="ico gold"></i>${fmt(r.gold)}` : '', r.lumber ? `<i class="ico lumber"></i>${fmt(r.lumber)}` : ''].filter(Boolean).join(' ');

  function claim(id) {
    const a = BY[id];
    if (!a || !save.ach || save.ach[id] !== 1) return;
    save.gold += a[6].gold || 0; save.lumber += a[6].lumber || 0; save.ach[id] = 2;
    persist(); if (typeof snd === 'function') snd('claim'); if (typeof render === 'function') render(); refresh();
  }
  function claimAll() { for (const a of LIST) if (save.ach[a[0]] === 1) { save.gold += a[6].gold || 0; save.lumber += a[6].lumber || 0; save.ach[a[0]] = 2; } persist(); if (typeof snd === 'function') snd('claim'); render(); refresh(); }

  function html() {
    check();
    const st = S(), stat = (n, v) => `<div class="astat"><b>${fmt(v)}</b><small>${n}</small></div>`;
    const groups = [...new Set(LIST.map(a => a[1]))];
    return `<div class="box achbox"><div class="sethead"><h2>Achievements</h2><button type="button" class="setx" data-act="achclose" aria-label="Close">×</button></div>
      <p class="note">${doneN()} of ${LIST.length} done${ready() ? ` · <b>${ready()} reward${ready() > 1 ? 's' : ''} ready</b>` : ''}</p>
      <div class="astats">${stat('Fights won', st.wins)}${stat('Monsters defeated', st.kills)}${stat('Bosses defeated', st.bosses)}${stat('Items found', st.drops)}${stat('Merges', st.merges)}${stat('Skills used', st.skills)}</div>
      ${ready() > 1 ? '<button type="button" class="btn good small achall" data-act="achclaimall">Take all rewards</button>' : ''}
      ${groups.map(g => `<h3 class="agroup">${g}</h3>${LIST.filter(a => a[1] === g).map(a => {
        const v = val(a), s = save.ach[a[0]] || 0, pct = Math.round(100 * v / a[5]);
        return `<div class="ach ${s ? 'done' : ''}"><div class="atext"><b>${a[2]}</b><small>${a[3]}</small>${s ? '' : `<div class="abar"><i style="width:${pct}%"></i></div><small class="aprog">${fmt(v)} / ${fmt(a[5])}</small>`}</div>
          <div class="areward">${s === 2 ? '<span class="tag lock">Taken</span>' : s === 1 ? `<button type="button" class="btn primary small" data-act="achclaim" data-arg="${a[0]}">Take ${rewardHtml(a[6])}</button>` : `<span class="aprize">${rewardHtml(a[6])}</span>`}</div></div>`;
      }).join('')}`).join('')}
      <button type="button" class="btn primary small achdone" data-act="achclose">Done</button></div>`;
  }
  function open() {
    close();
    const d = document.createElement('div');
    d.className = 'result dialog achdlg'; d.id = 'ach-dialog'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Achievements');
    d.innerHTML = html();
    d.addEventListener('click', e => { if (e.target === d) close(); });
    document.body.appendChild(d);
  }
  function close() { const d = document.getElementById('ach-dialog'); if (d) d.remove(); }
  function refresh() { const d = document.getElementById('ach-dialog'); if (!d) return; const b = d.querySelector('.achbox'), top = b ? b.scrollTop : 0; d.innerHTML = html(); const nb = d.querySelector('.achbox'); if (nb) nb.scrollTop = top; }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* the small card at the bottom of the Map tab */
  function card() {
    if (!save.ach) return '';
    check();
    return `<button type="button" class="card achcard" data-act="achievements"><span class="achtrophy" aria-hidden="true">★</span><span class="achtxt"><b>Achievements</b><small>${doneN()} of ${LIST.length} done${ready() ? ` · ${ready()} reward${ready() > 1 ? 's' : ''} ready` : ''}</small></span>${ready() ? '<i class="achdot" aria-label="Rewards ready"></i>' : ''}<i class="chev">›</i></button>`;
  }

  actions.achievements = () => open();
  actions.achclose = () => close();
  actions.achclaim = id => claim(id);
  actions.achclaimall = () => claimAll();
  window.ach = { count, check, open, close, card, ready };
})();
