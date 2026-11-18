import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDeviceSubscription } from '../worker/src/pushTarget.js'

const KEYS = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' }
const sub = (endpoint, extra = {}) => ({ endpoint, keys: { ...KEYS }, ...extra })

test('accepts the real push-service hosts and normalizes the shape', () => {
  for (const endpoint of [
    'https://fcm.googleapis.com/fcm/send/abc123',
    'https://web.push.apple.com/QGzS_XyZ',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ]) {
    const out = parseDeviceSubscription(sub(endpoint, { expirationTime: 123, extra: 'dropped' }))
    assert.deepEqual(out, { endpoint, expirationTime: null, keys: KEYS }, endpoint)
  }
})

// The Worker will POST an encrypted payload to this URL, so anything that is not a
// genuine push service must be refused (otherwise a signed-in user could aim the
// Worker at arbitrary servers).
test('refuses anything that is not a push service', () => {
  for (const endpoint of [
    'http://fcm.googleapis.com/fcm/send/abc',            // not https
    'https://example.com/push',                            // unknown host
    'https://fcm.googleapis.com.evil.com/fcm/send/abc',    // look-alike suffix
    'https://evilfcm.googleapis.com/fcm/send/abc',         // other subdomain of an allowed domain
    'https://evil.com/?https://fcm.googleapis.com/',       // allowed host only in the query
    'https://user:pw@fcm.googleapis.com/fcm/send/abc',     // credentials in the URL
    'https://fcm.googleapis.com:8443/fcm/send/abc',        // odd port
    'https://127.0.0.1/push',
    'https://notify.windows.com/w/abc',                    // bare domain, not a wns subdomain
    'https://xnotify.windows.com.evil.com/w/abc',
    'javascript:alert(1)',
    'not a url',
    '',
  ]) assert.equal(parseDeviceSubscription(sub(endpoint)), null, endpoint)
})

test('refuses malformed subscriptions and keys', () => {
  const ok = 'https://fcm.googleapis.com/fcm/send/abc'
  assert.equal(parseDeviceSubscription(null), null)
  assert.equal(parseDeviceSubscription('x'), null)
  assert.equal(parseDeviceSubscription({}), null)
  assert.equal(parseDeviceSubscription({ endpoint: ok }), null)
  assert.equal(parseDeviceSubscription({ endpoint: 42, keys: KEYS }), null)
  assert.equal(parseDeviceSubscription({ endpoint: ok, keys: { p256dh: KEYS.p256dh } }), null)
  assert.equal(parseDeviceSubscription({ endpoint: ok, keys: { auth: KEYS.auth } }), null)
  assert.equal(parseDeviceSubscription({ endpoint: ok, keys: { p256dh: 'has spaces!', auth: KEYS.auth } }), null)
  assert.equal(parseDeviceSubscription({ endpoint: ok, keys: { p256dh: KEYS.p256dh, auth: 'x'.repeat(500) } }), null)
  assert.equal(parseDeviceSubscription({ endpoint: ok + 'a'.repeat(600), keys: KEYS }), null)
})
