/* First-time tutorial: six short cards with a spotlight on the part of the screen they talk about.
   Shows once on a new game (flag `wl-tutorial` on this device); players with progress never see it unasked.
   Replay: Settings > How to play (window.tutorial.start(true)). */
(function () {
  'use strict';
  const KEY = 'wl-tutorial';
  const tab = t => `.tabs [data-arg="${t}"]`;
  const STEPS = [
    { title: 'Welcome, adventurer', text: 'Lead a party of heroes through the wild. Fights play out on their own: you choose where to go, who to train and what they wear.' },
    { title: 'Pick an adventure', text: 'The Map tab shows your next adventure. Check the Danger meter, then tap Fight. Your heroes attack by themselves.', hl: '#view [data-act="fight"]', go: 'map' },
    { title: 'Use skills in battle', text: 'Each hero has two skill buttons under the battlefield. Tap one for a strong move, or leave Auto on and they fire when ready.' },
    { title: 'Train your party', text: 'In the Party tab, spend gold to level heroes up and to hire new ones. Use Positions to put your sturdiest hero in the front line: it takes the melee hits.', hl: tab('party'), go: 'party' },
    { title: 'Gear from the Forge', text: 'Weapons and armor drop from your wins. Equip them in the Party tab. In the Forge, merge 3 copies of the same grade into a better one.', hl: tab('forge'), go: 'forge' },
    { title: 'Farm while you are away', text: 'Clear an adventure, then send your party to farm it. They gather gold and lumber while you are gone, and rare drops can turn up.', hl: tab('map'), go: 'map' },
  ];
  let i = 0, root = null, ring = null, card = null, wasTab = null;
  /* game.js declares `save` and `actions` with let / const: shared by every script, but not properties of window */
  const sv = () => (typeof save !== 'undefined' ? save : null), ac = () => (typeof actions !== 'undefined' ? actions : null);

  const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ } };
  const inBattle = () => { const b = document.getElementById('battle'); return !!(b && !b.hidden); };

  function place() {
    if (!root) return;
    const s = STEPS[i], el = s.hl && document.querySelector(s.hl), W = window.innerWidth, H = window.innerHeight;
    if (el) {
      const r = el.getBoundingClientRect(), pad = 6;
      ring.hidden = false; root.classList.remove('plain');
      Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const low = r.top + r.height / 2 > H / 2;                                // target in the lower half: the card goes up top
      card.style.top = low ? 'auto' : Math.min(H - 20, r.bottom + 22) + 'px'; card.style.bottom = low ? Math.max(20, H - r.top + 22) + 'px' : 'auto';
    } else {
      ring.hidden = true; root.classList.add('plain');
      card.style.top = '50%'; card.style.bottom = 'auto'; card.style.transform = 'translate(-50%,-50%)';
      return;
    }
    card.style.transform = 'translateX(-50%)'; card.style.maxWidth = Math.min(380, W - 28) + 'px';
  }

  function show() {
    const s = STEPS[i];
    if (s.go && ac() && sv() && sv().tab !== s.go && !inBattle()) ac().tab(s.go);   // show the tab the card talks about
    card.innerHTML = `<h2>${s.title}</h2><p>${s.text}</p>
      <div class="tutfoot"><span class="tutdots" aria-hidden="true">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
      <span class="tutbtns">${i > 0 ? '<button type="button" class="btn alt small" data-tut="back">Back</button>' : '<button type="button" class="btn alt small" data-tut="skip">Skip</button>'}
      <button type="button" class="btn primary small" data-tut="next">${i === STEPS.length - 1 ? 'Got it' : 'Next'}</button></span></div>`;
    place();
    const nb = card.querySelector('[data-tut="next"]'); if (nb) nb.focus({ preventScroll: true });
  }

  function end() {
    mark();
    if (root) { root.remove(); root = ring = card = null; }
    window.removeEventListener('resize', place); document.removeEventListener('keydown', onKey);
    if (wasTab && ac() && sv() && sv().tab !== wasTab && !inBattle()) ac().tab(wasTab);
    wasTab = null;
  }
  function onKey(e) { if (e.key === 'Escape') end(); else if (e.key === 'ArrowRight' || e.key === 'Enter') next(); else if (e.key === 'ArrowLeft') back(); }
  function next() { if (i >= STEPS.length - 1) end(); else { i++; show(); } }
  function back() { if (i > 0) { i--; show(); } }

  function start(force) {
    if (root || (!force && seen()) || inBattle()) return;
    i = 0; wasTab = sv() && sv().tab || null;
    root = document.createElement('div'); root.className = 'tut'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'How to play');
    root.innerHTML = '<div class="tutring" hidden></div><div class="tutcard"></div>';
    ring = root.querySelector('.tutring'); card = root.querySelector('.tutcard');
    root.addEventListener('click', e => { const b = e.target.closest('[data-tut]'); if (!b) return; const a = b.dataset.tut; if (a === 'next') next(); else if (a === 'back') back(); else end(); });
    document.body.appendChild(root);
    window.addEventListener('resize', place); document.addEventListener('keydown', onKey);
    show();
  }

  /* A new game shows it once; anyone who already has progress is marked as having seen it. */
  function auto() {
    if (seen() || !sv()) return;
    const cleared = Object.keys(sv().cleared || {}).length;
    if (cleared > 0 || (sv().hired || []).length > 1) { mark(); return; }
    setTimeout(() => start(false), 900);
  }
  window.tutorial = { start };
  window.addEventListener('load', () => setTimeout(auto, 300));
})();
