import { registerSW } from 'virtual:pwa-register'

// #80 — prompt-to-reload on new deploy.
//
// #63 shipped a silent autoUpdate service worker, but an already-open tab
// never re-checked for a new build, so after a deploy it kept serving the
// stale bundle until a manual unregister + cache wipe. Two changes fix that:
//   (a) poll for a new SW every 60s so long-lived tabs notice a deploy, and
//   (b) show a reload toast instead of auto-reloading — a refresh can't fire
//       mid-edit and wipe an in-progress bill / unsaved in-memory state.
// The reload happens only when the user taps. Paired with vite.config.js:
// registerType 'prompt' + injectRegister false (manual registration here).

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

  const bar = document.createElement('div')
  bar.id = 'pwa-update-toast'
  bar.setAttribute('role', 'status')
  Object.assign(bar.style, {
    position: 'fixed',
    top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: 'calc(100vw - 24px)',
    padding: '10px 12px 10px 16px',
    borderRadius: '999px',
    background: '#1f2430',
    color: '#fff',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.28)',
    font: '500 14px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif',
  })

  const msg = document.createElement('span')
  msg.textContent = 'New version available · มีเวอร์ชันใหม่'
  Object.assign(msg.style, {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = 'Reload'
  Object.assign(btn.style, {
    flex: '0 0 auto',
    border: '0',
    borderRadius: '999px',
    padding: '7px 14px',
    background: '#4f8cff',
    color: '#fff',
    font: '600 14px/1 system-ui, -apple-system, "Segoe UI", sans-serif',
    cursor: 'pointer',
  })
  btn.addEventListener('click', () => {
    btn.disabled = true
    btn.textContent = '…'
    onReload()
  })

  bar.appendChild(msg)
  bar.appendChild(btn)
  document.body.appendChild(bar)
}
