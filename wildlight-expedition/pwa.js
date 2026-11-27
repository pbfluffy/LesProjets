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

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try { await navigator.serviceWorker.register('sw.js'); } catch (e) { return; }
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
