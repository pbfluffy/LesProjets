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

async function postAlerts(user, body) {
  if (!WORKER_URL || !user) return false
  const idToken = await user.getIdToken()
  const res = await fetch(`${WORKER_URL}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  }).catch(() => null)
  return !!res?.ok
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
    if (typeof Notification === 'undefined' || !navigator.serviceWorker) return false
    if (!user || !VAPID_PUBLIC_KEY) return false

    let perm = Notification.permission
    if (perm === 'default') {
      perm = await Notification.requestPermission()
      setPermission(perm)
    }
    if (perm !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }).catch(() => null)
    }
    if (!subscription) return false

    return postAlerts(user, { type: 'subscribe', subscription: subscription.toJSON() })
  }

  async function setAlert(user, { symbol, buy, sell, range, currency }) {
    return postAlerts(user, { type: 'setAlert', symbol, buy, sell, range, currency })
  }

  return { permission, ensureSubscribed, setAlert }
}
