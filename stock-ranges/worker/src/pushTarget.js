// Validation for a push subscription that the *client* hands the Worker for a
// one-off test send (the "Send a test notification" button in Cloudlingo's
// reminder card). The Worker will POST an encrypted payload to the subscription's
// endpoint, so the endpoint must be a genuine browser push service — otherwise any
// signed-in user could aim the Worker at an arbitrary server.
//
// Kept free of imports so it can be unit-tested in plain Node.

// Exact hosts of the push services the browsers use: Chrome/Android (FCM),
// Safari/iOS/macOS (Apple), Firefox (Mozilla). Edge/Windows use per-region
// subdomains of notify.windows.com, matched by suffix below.
const PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'web.push.apple.com',
  'updates.push.services.mozilla.com',
])
const PUSH_HOST_SUFFIXES = ['.notify.windows.com']

const MAX_ENDPOINT_LENGTH = 500
const KEY_RE = /^[A-Za-z0-9_-]{16,200}$/ // base64url, as PushSubscription.toJSON() produces

function isPushServiceUrl(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return false
  let url
  try { url = new URL(endpoint) } catch { return false }
  if (url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  if (url.port && url.port !== '443') return false
  const host = url.hostname.toLowerCase()
  return PUSH_HOSTS.has(host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length)
}

// Returns a clean { endpoint, expirationTime, keys } or null if anything is off.
// Only the fields needed to send are kept; everything else the client sent is dropped.
export function parseDeviceSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') return null
  const { endpoint, keys } = subscription
  if (!isPushServiceUrl(endpoint)) return null
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null
  if (!KEY_RE.test(keys.p256dh) || !KEY_RE.test(keys.auth)) return null
  return { endpoint, expirationTime: null, keys: { p256dh: keys.p256dh, auth: keys.auth } }
}
