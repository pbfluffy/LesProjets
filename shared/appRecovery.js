// Shared by every PWA app's crash screen (React error boundary).
//
// A plain location.reload() is not enough after a bad deploy: the service
// worker keeps serving the cached (crashing) build, so the user lands right
// back on the crash screen. hardReload() gets them onto the newest build:
//   - if a newer service worker is already downloaded and waiting, activate
//     it (workbox's SKIP_WAITING message) and reload once it takes control;
//   - otherwise unregister this app's service worker and delete only this
//     app's caches (all apps share the pumbafluffycorgi.com origin, so other
//     apps' offline copies are left alone), then reload from the network.
export async function hardReload() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg?.waiting) {
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      setTimeout(() => window.location.reload(), 3000) // fallback if controllerchange never fires
      return
    }
    if (reg) {
      const scope = reg.scope
      await reg.unregister()
      const keys = (await window.caches?.keys()) || []
      await Promise.all(keys.filter(k => k.includes(scope)).map(k => window.caches.delete(k)))
    }
  } catch {
    // best effort — fall through to a plain reload
  }
  window.location.reload()
}
