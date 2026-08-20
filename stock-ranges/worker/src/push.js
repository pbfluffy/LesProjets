// Sends one Web Push notification. @block65/webcrypto-web-push builds the
// VAPID JWT (ES256) and RFC 8291 (aes128gcm) encrypted payload entirely on
// Web Crypto — the standard `web-push` npm package needs Node's `crypto`
// module and doesn't run in Workers, and hand-rolling ECDH/HKDF/AES-GCM
// ourselves is real cryptography not worth re-deriving.
import { buildPushPayload } from '@block65/webcrypto-web-push'

// Shown to a push service (Google/Mozilla/Apple) if they ever need to
// reach the app operator about abuse — required by the VAPID spec.
const VAPID_SUBJECT = 'mailto:pbfluffygaming@gmail.com'

// Returns 'ok', 'gone' (404/410 — caller should prune this subscription,
// the device unsubscribed or the endpoint expired), or 'error' (transient
// — leave the subscription alone, this attempt just didn't land).
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
