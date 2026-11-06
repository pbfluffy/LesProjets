import { useState } from 'react'

const WORKER_URL = import.meta.env.VITE_STOCK_WORKER_URL
const VAPID_PUBLIC_KEY = import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY

// pushManager.subscribe() needs the VAPID public key as a raw byte array,
// not the base64url string it's distributed as.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

// Every step that talks to the browser's push machinery or the network gets a
// time limit. Without one, a step that never settles (a service worker that
// isn't ready, a push service Chrome can't reach, a stalled request) leaves
// the alert buttons locked "busy" forever: later taps silently do nothing and
// send nothing.
const STEP_TIMEOUT_MS = 12000

function withTimeout(promise, ms, label) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms) }),
  ]).finally(() => clearTimeout(timer))
}

async function authedPost(user, body) {
  const idToken = await withTimeout(user.getIdToken(), STEP_TIMEOUT_MS, 'sign-in token')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS)
  try {
    return await fetch(`${WORKER_URL}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function postAlerts(user, body) {
  if (!WORKER_URL || !user) return false
  try {
    const res = await authedPost(user, body)
    return !!res?.ok
  } catch (e) {
    console.warn('[alerts] request failed:', body?.type, e?.message || e)
    return false
  }
}

// Same call, but returns { ok, status, data } for routes that answer with JSON.
async function postAlertsJson(user, body) {
  if (!WORKER_URL || !user) return null
  try {
    const res = await authedPost(user, body)
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    console.warn('[alerts] request failed:', body?.type, e?.message || e)
    return null
  }
}

// Narrowly scoped to the browser-permission/push-subscription mechanics
// and the Worker calls themselves — mirrors useInstallPrompt.js's shape.
// The actual alert *state* (which symbols, which directions) is owned by
// App.jsx the same way tags/knownFor are, not by this hook — this just
// does the "make sure the browser + Worker both know about it" plumbing.
export function usePriceAlerts() {
  const [permission, setPermission] = useState(() => (
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  ))

  // Ensures Notification permission is granted and a push subscription is
  // registered with the Worker — called the first time a user toggles any
  // alert on, so there's nothing to set up ahead of time. Returns false on
  // any failure (permission denied, unsupported browser, no service
  // worker yet) so the caller can skip the setAlert call that follows.
  async function ensureSubscribed(user) {
    if (typeof Notification === 'undefined' || !navigator.serviceWorker) {
      console.warn('[alerts] this browser has no Notification / service worker support')
      return false
    }
    if (!user || !VAPID_PUBLIC_KEY) {
      console.warn('[alerts] not signed in, or the push key is missing from this build')
      return false
    }

    try {
      let perm = Notification.permission
      // No time limit here on purpose: this waits on the person answering the
      // browser's permission prompt, which can take as long as they like.
      if (perm === 'default') {
        perm = await Notification.requestPermission()
        setPermission(perm)
      }
      if (perm !== 'granted') {
        console.warn('[alerts] notification permission is', perm)
        return false
      }

      const registration = await withTimeout(navigator.serviceWorker.ready, STEP_TIMEOUT_MS, 'service worker')
      let subscription = await withTimeout(registration.pushManager.getSubscription(), STEP_TIMEOUT_MS, 'push subscription lookup')
      if (!subscription) {
        subscription = await withTimeout(registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }), STEP_TIMEOUT_MS * 2, 'push subscribe')
      }
      if (!subscription) return false

      return await postAlerts(user, { type: 'subscribe', subscription: subscription.toJSON() })
    } catch (e) {
      // e.g. Chrome can't reach its push service, or a step timed out.
      console.warn('[alerts] could not set up notifications:', e?.message || e)
      return false
    }
  }

  async function setAlert(user, { symbol, buy, sell, move, range, currency, lang }) {
    return postAlerts(user, { type: 'setAlert', symbol, buy, sell, move, range, currency, lang })
  }

  // Sends a test push to every registered device. Registers this device
  // first (asking for permission if needed) so the test reaches the one in
  // the user's hand. Returns { status: 'ok', sent, devices } |
  // { status: 'denied' | 'tooSoon' | 'error' }.
  async function sendTest(user) {
    const subscribed = await ensureSubscribed(user)
    if (!subscribed && typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return { status: 'denied' }
    }
    const res = await postAlertsJson(user, { type: 'testPush' })
    if (res?.status === 429) return { status: 'tooSoon' }
    if (!res?.ok) return { status: 'error' }
    return { status: 'ok', sent: res.data.sent ?? 0, devices: res.data.devices ?? 0 }
  }

  // Newest-first notification history (real buy/sell alerts + tests), or
  // null if it couldn't be loaded.
  async function loadHistory(user) {
    const res = await postAlertsJson(user, { type: 'history' })
    return res?.ok && Array.isArray(res.data?.items) ? res.data.items : null
  }

  // Mirrors the wallet (holdings + per-holding cost alerts + wallet
  // notification prefs) into the Worker's KV for the scheduled job — see
  // worker/scripts/portfolio-checks.mjs.
  async function setPortfolio(user, { holdings, prefs, currency, lang }) {
    return postAlerts(user, { type: 'setPortfolio', holdings, prefs, currency, lang })
  }

  // The stored portfolio settings (to restore toggles on a new device):
  // the object, null if nothing is saved, or undefined if the request
  // failed — the caller must not treat a failure as "nothing saved".
  async function getPortfolio(user) {
    const res = await postAlertsJson(user, { type: 'getPortfolio' }).catch(() => null)
    if (!res?.ok) return undefined
    return res.data?.portfolio ?? null
  }

  // Daily portfolio values the scheduled job recorded, as chart entries
  // [{ date, marketValue, costBasis, currency, updatedAt }].
  async function loadScheduledHistory(user) {
    const res = await postAlertsJson(user, { type: 'portfolioHistory' })
    const map = res?.ok ? res.data?.history : null
    return map && typeof map === 'object' ? Object.entries(map).map(([date, e]) => ({ date, ...e })) : []
  }

  return { permission, ensureSubscribed, setAlert, sendTest, loadHistory, setPortfolio, getPortfolio, loadScheduledHistory }
}
