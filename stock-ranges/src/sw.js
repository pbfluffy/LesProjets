// Custom service worker (vite-plugin-pwa's injectManifest strategy) —
// the previous auto-generated sw.js (generateSW strategy) couldn't host a
// `push` listener, so this replaces it. Precaching + the one existing
// runtime-caching rule are recreated manually here since injectManifest
// doesn't generate either for you.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

// Recreates the app-shell navigation caching the old generateSW config had.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'stock-ranges-pages',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
)

// Price-alert push notifications — see worker/scripts/check-alerts.mjs
// for what sends these. Payload shape: { title, body, icon, tag, symbol }.
// `icon` is the ticker's own logo when one resolves (falls back to the
// app icon otherwise); `badge` stays the app icon always, same as any
// app whose notifications show a small consistent status-bar mark next
// to a per-item image. `tag` replaces any still-showing notification for
// the same ticker instead of stacking a second one.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    return
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Stock Ranges', {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || data.symbol,
      data: { symbol: data.symbol },
    }),
  )
})

// Deep-links into the ticker the notification was about — TickerCard.jsx
// already renders id={`ticker-${symbol}`}, so the browser's own in-page
// anchor scroll does the rest once the app loads.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const symbol = event.notification.data?.symbol
  const url = symbol ? `/stock-ranges/#ticker-${symbol}` : '/stock-ranges/'
  event.waitUntil(self.clients.openWindow(url))
})
