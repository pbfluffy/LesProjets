import { registerSW } from 'virtual:pwa-register'
import { BUILD } from '../../shared/appVersion.js'

// Auto-update, same idea as Cloudlingo's. Every build writes version.json next to the app naming the build
// version it contains (vite.config.js). When that names something other than the build that is running, the
// app reloads onto the new one by itself, with a small "Updating…" pill, so nobody has to notice a toast or
// close and reopen the Home Screen app to get a fix.
//
// Never while the person is mid-task: with a dialog open or a field focused (typing a holding, a price, a
// ticker) the reload waits and is retried every few seconds until they are done.
//
// Why version.json and not just the service worker: the worker updates on its own schedule, and a reload
// that races it is served the OLD precached page again. So before reloading, the new worker is fetched and
// given a moment to take over (it calls skipWaiting itself, see sw.js).

const CHECK_MS = 5 * 60 * 1000 // a tab left open for hours still notices a deploy
const RETRY_MS = 5 * 1000 // how often a deferred update re-checks whether the person is still busy
const SW_WAIT_MS = 8000 // give up waiting for the new worker after this long and reload anyway
const TRIED_KEY = 'sr-update'

let registration = null
let pending = false

registerSW({
  onRegisteredSW(_swUrl, reg) { registration = reg || null },
  // Fallback if the worker announced itself before version.json did.
  onNeedRefresh() { queueUpdate() },
})

function isBusy() {
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return true
  const a = document.activeElement
  if (!a || a === document.body) return false
  return a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)
}

function queueUpdate() {
  if (pending) return
  pending = true
  tryApply()
}

function tryApply() {
  if (isBusy()) { setTimeout(tryApply, RETRY_MS); return }
  applyUpdate()
}

// Fetch the newest worker and wait (bounded) until it is the active one, so the reload loads the new build.
async function activateLatestWorker() {
  try {
    if (!registration) return
    await registration.update()
    const sw = registration.installing || registration.waiting
    if (!sw || sw.state === 'activated') return
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, SW_WAIT_MS)
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') { clearTimeout(timer); resolve() }
      })
    })
  } catch { /* best effort: a plain reload still follows */ }
}

async function applyUpdate() {
  await activateLatestWorker()
  if (isBusy()) { setTimeout(tryApply, RETRY_MS); return } // they started typing while we waited
  showPill()
  setTimeout(() => window.location.reload(), 1200)
}

function showPill() {
  if (document.getElementById('pwa-update-pill')) return
  let th = false
  try { th = localStorage.getItem('lang') === 'th' } catch { /* default English */ }
  const pill = document.createElement('div')
  pill.id = 'pwa-update-pill'
  pill.setAttribute('role', 'status')
  pill.textContent = th ? 'กำลังอัปเดตเป็นเวอร์ชันล่าสุด…' : 'Updating to the latest version…'
  pill.style.cssText =
    'position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);left:50%;transform:translateX(-50%);z-index:9999;' +
    'background:var(--color-accent,#1a1916);color:var(--color-accent-text,#fff);font:600 13px/1.2 sans-serif;' +
    'padding:10px 18px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.25);'
  document.body.appendChild(pill)
}

async function checkForUpdate() {
  if (!import.meta.env.PROD || BUILD.version === 'dev' || !navigator.onLine || pending) return
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { v } = await res.json()
    if (!v || v === BUILD.version) return
    // At most one automatic reload per new version, in case a stale cache serves the old page again.
    let tried = null
    try { tried = sessionStorage.getItem(TRIED_KEY) } catch { /* ignore */ }
    if (tried === v) return
    try { sessionStorage.setItem(TRIED_KEY, v) } catch { /* ignore */ }
    queueUpdate()
  } catch { /* offline or not JSON: try again later */ }
}

window.addEventListener('load', () => setTimeout(checkForUpdate, 3000))
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate() })
setInterval(checkForUpdate, CHECK_MS)
