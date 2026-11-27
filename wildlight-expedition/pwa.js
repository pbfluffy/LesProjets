/* Wildlight Expedition – installable app (PWA).
 * Registers the service worker (sw.js), saves all the pictures for offline play once the game is idle, and shows
 * an "Install" card on the Map tab: a real Install button where the browser allows it (Android, desktop Chrome / Edge),
 * and the "Add to Home Screen" steps on iPhone / iPad. The card is hidden inside the installed app and can be dismissed.
 * Loaded last (after cloud.js); game.js draws the card with window.pwaCard(). */
(function () {
  'use strict';

  const KEY = 'wl-pwa-dismissed';
  let deferred = null, installed = false;

  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const dismissed = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  // Draw the Map tab again so the card shows up or goes away (never in the middle of a fight).
  function redraw() { try { if (typeof B !== 'undefined' && B) return; if (typeof render === 'function') render(); } catch (e) { /* ignore */ } }

  window.pwaCard = function () {
    if (standalone() || installed || dismissed()) return '';
    const how = deferred
      ? '<button class="btn" data-act="pwainstall">Install</button>'
      : ios ? '<p class="sub">On iPhone or iPad: tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>' : '';
    if (!how) return '';
    const icon = window.assetUrl ? window.assetUrl('pwa/icon-192.png') : 'assets/pwa/icon-192.png';
    return `<div class="card pwa-card"><img src="${icon}" alt="" width="48" height="48">
      <div class="pwa-text"><h3>Install the game</h3><p class="sub">Play full screen from your home screen. Works offline too.</p>${how}</div>
      <button class="pwa-x" data-act="pwadismiss" aria-label="Hide this">&times;</button></div>`;
  };

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; redraw(); });
  window.addEventListener('appinstalled', () => {
    installed = true; deferred = null; redraw();
    if (typeof toast === 'function') toast('Installed. Find Wildlight on your home screen.');
  });

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act="pwainstall"], [data-act="pwadismiss"]');
    if (!b) return;
    if (b.dataset.act === 'pwadismiss') {
      try { localStorage.setItem(KEY, '1'); } catch (err) { /* ignore */ }
      redraw();
    } else if (deferred) {
      const p = deferred; deferred = null;
      try { await p.prompt(); await p.userChoice; } catch (err) { /* ignore */ }
      redraw();
    }
  });

  /* ---- Auto-update (same idea as Cloudlingo) ----
   * Every deploy writes version.json ({"v": "<commit>"}). When it names a newer build than the one running (the ?v= of this script),
   * the page reloads onto the new version. Never in the middle of a fight: then it waits until the player is back in the village. */
  const script = document.currentScript;
  const APP_VERSION = (script && /[?&]v=([^&#]+)/.exec(script.src) || [])[1] || 'dev';
  let updatePending = false;
  // Busy = in the middle of a fight. Safe moments: between two fights of a Repeat run, and a result screen that has been sitting there for 45 s (everything is already paid and saved).
  const busy = () => {
    try {
      if (typeof B === 'undefined' || !B) return false;
      if (B.resolved && typeof repeatOn !== 'undefined' && repeatOn && B.result === 'win') return false;
      if (B.resolved && Date.now() - (B.resolvedAt || 0) > 45000) return false;
      return true;
    } catch (e) { return false; }
  };
  function showPill() {
    if (document.querySelector('.update-pill')) return;
    const b = document.createElement('button');
    b.className = 'update-pill'; b.type = 'button';
    b.innerHTML = 'New version ready <b>Update now</b>';
    b.addEventListener('click', () => applyUpdate(true));            // only the fight in progress is lost; everything won so far is saved
    document.body.appendChild(b);
  }
  function applyUpdate(force) {
    if (!force && busy()) { updatePending = true; showPill(); return; }
    updatePending = false;
    const pill = document.querySelector('.update-pill'); if (pill) pill.remove();
    if (document.querySelector('.update-bar')) return;
    try { if (typeof repeatOn !== 'undefined' && repeatOn && B && B.spec && B.spec.stageId) sessionStorage.setItem('wl-resume', B.spec.stageId); } catch (e) { /* ignore */ }
    const bar = document.createElement('div');
    bar.className = 'update-bar'; bar.setAttribute('role', 'status');
    bar.textContent = 'Updating to the newest version…';
    document.body.appendChild(bar);
    setTimeout(() => location.reload(), force ? 700 : 1200);
  }
  window.wlOnSafePoint = () => { if (updatePending) applyUpdate(true); };
  async function checkForUpdate() {
    if (APP_VERSION === 'dev' || !navigator.onLine) return;
    try {
      const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const v = (await res.json()).v;
      if (!v || v === APP_VERSION) return;
      let tried = null; try { tried = sessionStorage.getItem('wl-update'); } catch (e) { /* ignore */ }
      if (tried === v) return;                                   // reload at most once per new version (a stale cache could serve the old page again)
      try { sessionStorage.setItem('wl-update', v); } catch (e) { /* ignore */ }
      applyUpdate();
    } catch (e) { /* offline: try again later */ }
  }
  window.addEventListener('load', () => setTimeout(checkForUpdate, 3000));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
  setInterval(checkForUpdate, 5 * 60 * 1000);
  setInterval(() => { if (updatePending && !busy()) applyUpdate(); }, 4000);          // the fight is over: now it is safe
  window.wlCheckForUpdate = checkForUpdate;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      // The worker's address carries the version, so a cached copy of sw.js at the CDN can never hide a new deploy.
      try { await navigator.serviceWorker.register(APP_VERSION === 'dev' ? 'sw.js' : 'sw.js?v=' + APP_VERSION); } catch (e) { return; }
      // Once the game is idle, hand the worker every picture to keep (skipped on data saver).
      const warm = async () => {
        const c = navigator.connection;
        if ((c && c.saveData) || typeof window.artUrls !== 'function') return;
        try {
          const sw = (await navigator.serviceWorker.ready).active;
          if (sw) sw.postMessage({ type: 'warm', urls: window.artUrls().map(u => new URL(u, location.href).href) });
        } catch (e) { /* ignore */ }
      };
      (window.requestIdleCallback || (f => setTimeout(f, 4000)))(() => setTimeout(warm, 3000));
    });
  }
})();
