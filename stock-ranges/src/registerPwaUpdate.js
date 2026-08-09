import { registerSW } from 'virtual:pwa-register'

// Prompt-to-reload on new deploy, same pattern as bill-splitter/dog-near-me:
// poll for a new service worker every 60s so a long-lived tab notices a
// deploy, and show a toast instead of auto-reloading so a refresh can't fire
// mid-edit of the watchlist.

const POLL_MS = 60 * 1000

const updateSW = registerSW({
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    setInterval(() => {
      registration.update().catch(() => {})
    }, POLL_MS)
  },
  onNeedRefresh() {
    showReloadToast(() => updateSW(true))
  },
})

function showReloadToast(onReload) {
  if (document.getElementById('pwa-update-toast')) return
  const toast = document.createElement('div')
  toast.id = 'pwa-update-toast'
  toast.style.cssText =
    'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;' +
    'background:#1a1916;color:#fff;padding:10px 16px;border-radius:999px;' +
    'display:flex;align-items:center;gap:10px;font-size:13px;font-family:sans-serif;' +
    'box-shadow:0 4px 16px rgba(0,0,0,0.25);'
  toast.innerHTML = '<span>New version available</span>'
  const btn = document.createElement('button')
  btn.textContent = 'Reload'
  btn.style.cssText =
    'background:#fff;color:#1a1916;border:none;border-radius:999px;padding:5px 12px;' +
    'font-size:12px;font-weight:600;cursor:pointer;'
  btn.onclick = () => {
    toast.remove()
    onReload()
  }
  toast.appendChild(btn)
  document.body.appendChild(toast)
}
