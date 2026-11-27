// Wildlight Expedition service worker: lets the installed game open and run offline.
// Scope is this folder only (/wildlight-expedition/) and every cache name starts with "wildlight-",
// because all apps on the site share one origin. VERSION is replaced with the commit at deploy
// (see deploy.yml); a new version clears the old cache. With VERSION 'dev' (local play) nothing is
// served from the cache while the network works, so edits show up straight away.
const VERSION = 'dev';
const CACHE = 'wildlight-' + VERSION;
const DEV = VERSION === 'dev';
// The Firebase SDK (cloud save) is cached so the game shell starts offline; sign-in and database requests always go to the network.
const CDN = ['https://www.gstatic.com/firebasejs/'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // The page plus every local script, stylesheet and icon it links to (their ?v= is the deploy's commit).
    const res = await fetch('./', { cache: 'no-cache' });
    const html = await res.clone().text();
    await cache.put('./', res);
    const local = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('//'));
    await Promise.all([...new Set(local)].map(u => cache.add(u).catch(() => { /* optional */ })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('wildlight-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// The page sends the list of all its pictures once it is idle; they are saved so every area works offline.
self.addEventListener('message', event => {
  const d = event.data;
  if (!d || d.type !== 'warm' || !Array.isArray(d.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = d.urls.filter(u => typeof u === 'string' && u.startsWith(self.registration.scope));
    for (let i = 0; i < urls.length; i += 6) {
      await Promise.all(urls.slice(i, i + 6).map(async u => {
        try { if (!(await cache.match(u))) await cache.add(u); } catch (e) { /* offline or missing: skipped */ }
      }));
    }
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  const ours = url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  if (url.pathname.endsWith('/version.json')) return;     // the update check always goes to the network

  // The page: network first so a new deploy shows up right away; the saved copy when offline.
  if (req.mode === 'navigate' && ours) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req.url, { cache: 'no-cache' });          // revalidate: never an hour-old copy from the browser cache
        if (res.ok) (await caches.open(CACHE)).put('./', res.clone());
        return res;
      } catch (e) {
        return (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  // Versioned files (?v=<commit>) never change, so saved copies win. Files without a version (manifest, ...) try the network first.
  if (ours || CDN.some(p => req.url.startsWith(p))) {
    const versioned = !DEV && (url.searchParams.has('v') || !ours);
    event.respondWith((async () => {
      if (versioned) {
        const hit = await caches.match(req);
        if (hit) return hit;
      }
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch (e) {
        return (await caches.match(req)) || Response.error();
      }
    })());
  }
});
