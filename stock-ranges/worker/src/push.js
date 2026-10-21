// Sends one Web Push notification from inside the Worker — used only for the
// app's "Send test notification" button (the real buy/sell alerts are sent
// by scripts/check-alerts.mjs on GitHub Actions, with the Node web-push
// package). @block65/webcrypto-web-push builds the VAPID JWT (ES256) and the
// RFC 8291 (aes128gcm) encrypted payload entirely on Web Crypto, since the
// standard web-push package needs Node's crypto module. Restored from the
// original in-Worker alert sender (see git history, commit 4cb67e79).
import { buildPushPayload } from '@block65/webcrypto-web-push'

// Shown to a push service (Google/Mozilla/Apple) if they ever need to reach
// the app operator about abuse — required by the VAPID spec.
const VAPID_SUBJECT = 'mailto:pbfluffygaming@gmail.com'

// Returns 'ok', 'gone' (404/410 — the device unsubscribed or the endpoint
// expired; caller should prune it), or 'error' (transient — leave it alone).
export async function sendPush(env, subscription, data) {
  const vapid = {
    subject: VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  }

  let request
  try {
    request = await buildPushPayload({ data, options: { ttl: 3600, urgency: 'normal' } }, subscription, vapid)
  } catch (err) {
    console.error('[push] buildPushPayload failed', err)
    return 'error'
  }

  let res
  try {
    res = await fetch(subscription.endpoint, request)
  } catch {
    return 'error'
  }
  if (res.status === 404 || res.status === 410) return 'gone'
  if (!res.ok) return 'error'
  return 'ok'
}
