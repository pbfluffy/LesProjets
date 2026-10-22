import { auth } from './firebase'
import { WORKER_URL } from './config'
import { BUILD } from '../../shared/appVersion.js'

// Error reports: when something fails on someone's phone, send a short note
// to the village-77 Worker, which writes it to its log (Cloudflare dashboard →
// Workers → village-77 → Logs). Covers the app's own "[village] … failed"
// messages, uncaught errors and failed promises. Best effort and capped, so
// a broken loop can't flood it; never includes what people typed.
const MAX_PER_PAGE = 15
const sent = new Set()

function send(kind, message) {
  const msg = String(message || '').slice(0, 500)
  if (!msg || sent.size >= MAX_PER_PAGE || sent.has(msg)) return
  sent.add(msg)
  const body = JSON.stringify({
    kind,
    msg,
    page: location.pathname + location.search.replace(/([?&]code=)[^&]+/, '$1…'),
    version: BUILD.version,
    uid: auth.currentUser?.uid || null,
    ua: navigator.userAgent.slice(0, 200),
  })
  try {
    // sendBeacon survives the page closing; fetch as a fallback
    if (!navigator.sendBeacon?.(WORKER_URL + '/log', new Blob([body], { type: 'text/plain' }))) {
      fetch(WORKER_URL + '/log', { method: 'POST', body, keepalive: true }).catch(() => {})
    }
  } catch { /* never let reporting break the app */ }
}

const text = (args) => args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : (a?.code || JSON.stringify(a)))).join(' ')

export function startErrorReports() {
  if (import.meta.env.DEV) return // only from the real site
  const original = console.error
  console.error = (...args) => {
    original.apply(console, args)
    const first = typeof args[0] === 'string' ? args[0] : ''
    if (first.startsWith('[village]') || first.startsWith('Village error boundary')) send('app', text(args))
  }
  window.addEventListener('error', (e) => send('error', (e.message || '') + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : '')))
  window.addEventListener('unhandledrejection', (e) => send('promise', e.reason?.message || e.reason?.code || String(e.reason)))
}
