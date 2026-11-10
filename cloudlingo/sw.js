// Cloudlingo service worker: lets the installed app open and run lessons offline.
// Scope is this folder only (/cloudlingo/), and every cache name starts with
// "cloudlingo-", because all apps on the site share one origin.
// VERSION is replaced with the commit at deploy (see deploy.yml); a new version
// clears the old cache.
const VERSION = 'dev';
const CACHE = 'cloudlingo-' + VERSION;
const POSES = ['hero', 'cool', 'laugh', 'think', 'angry', 'tired', 'proud', 'idea', 'laptop', 'shocked', 'sleep'];
// Firebase SDK and Google Fonts are cached so the app shell works offline;
// sign-in and database requests always go to the network.
const CDN = ['https://www.gstatic.com/firebasejs/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cache the page plus every local script and stylesheet it links to.
    const res = await fetch('./', { cache: 'no-cache' });
    const html = await res.clone().text();
    await cache.put('./', res);
    const local = [...html.matchAll(/(?:src|href)="((?:js|css|img)\/[^"]+)"/g)].map(m => m[1]);
    const SOUNDS = ['correct', 'wrong', 'complete', 'streak', 'badge', 'freeze', 'pass', 'tryagain'];
    const extra = POSES.map(p => `img/nimbus/${p}.webp`).concat(SOUNDS.map(n => `sounds/${n}.mp3`), 'manifest.webmanifest', 'img/icons/icon-192.png');
    await Promise.all([...new Set(local.concat(extra))].map(u => cache.add(u).catch(() => { /* optional */ })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('cloudlingo-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);

  // Pages: network first so a new deploy shows up right away; cache when offline.
  if (req.mode === 'navigate' && url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put('./', res.clone());
        return res;
      } catch {
        return (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  // App files (versioned with ?v=) and the CDN files above: cache first.
  const ours = url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  if (ours || CDN.some(p => req.url.startsWith(p))) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});

// Daily reminders (sent by cloudlingo/reminders/send.mjs).
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Cloudlingo', {
    body: d.body || '', icon: 'img/icons/icon-192.png', badge: 'img/icons/icon-192.png',
    tag: 'cloudlingo-reminder', renotify: false, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const tab = open.find(c => c.url.startsWith(self.registration.scope));
    if (tab) { await tab.focus(); return; }
    await self.clients.openWindow(url);
  })());
});
