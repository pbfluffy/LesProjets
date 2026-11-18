import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { upsertSubscription, getAlerts } from '../worker/src/alerts.js'

// The "register a device" route stores a push address that the hourly job (and the Worker's
// test button) later POST an encrypted message to. So only genuine browser push services may be
// stored; anything else would let a signed-in user aim those senders at an arbitrary server.
const KEYS = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' }
const sub = (endpoint, extra = {}) => ({ endpoint, keys: { ...KEYS }, ...extra })

class FakeKV {
  constructor() { this.m = new Map() }
  async get(k, type) { const v = this.m.get(k); return v === undefined ? null : (type === 'json' ? JSON.parse(v) : v) }
  async put(k, v) { this.m.set(k, String(v)) }
  async delete(k) { this.m.delete(k) }
}
let env
beforeEach(() => { env = { ALERTS: new FakeKV() } })

test('a real push-service address is stored, normalized, with a timestamp', async () => {
  const ok = await upsertSubscription(env, 'u1', sub('https://web.push.apple.com/abc', { expirationTime: 5, junk: 'dropped' }))
  assert.equal(ok, true)
  const [stored] = (await getAlerts(env, 'u1')).subscriptions
  assert.equal(stored.endpoint, 'https://web.push.apple.com/abc')
  assert.equal(stored.expirationTime, null)
  assert.deepEqual(stored.keys, KEYS)
  assert.equal('junk' in stored, false)
  assert.ok(stored.addedAt)
})

test('addresses that are not push services are refused and nothing is stored', async () => {
  for (const endpoint of [
    'https://example.com/steal',
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.com/fcm/send/abc',
    'https://user:pw@fcm.googleapis.com/fcm/send/abc',
    'https://127.0.0.1/push',
    'https://169.254.169.254/latest/meta-data',
    'not a url',
  ]) {
    assert.equal(await upsertSubscription(env, 'u1', sub(endpoint)), false, endpoint)
  }
  assert.equal(env.ALERTS.m.size, 0, 'nothing written to the store')
})

test('malformed keys are still refused', async () => {
  assert.equal(await upsertSubscription(env, 'u1', { endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }), false)
  assert.equal(await upsertSubscription(env, 'u1', sub('https://fcm.googleapis.com/fcm/send/abc', { keys: { p256dh: '', auth: '' } })), false)
})

test('re-registering the same device replaces it; at most 5 devices are kept (newest win)', async () => {
  await upsertSubscription(env, 'u1', sub('https://fcm.googleapis.com/fcm/send/same'))
  await upsertSubscription(env, 'u1', sub('https://fcm.googleapis.com/fcm/send/same'))
  assert.equal((await getAlerts(env, 'u1')).subscriptions.length, 1)
  for (let i = 0; i < 7; i++) await upsertSubscription(env, 'u1', sub(`https://fcm.googleapis.com/fcm/send/dev-${i}`))
  const subs = (await getAlerts(env, 'u1')).subscriptions
  assert.equal(subs.length, 5)
  assert.equal(subs.at(-1).endpoint, 'https://fcm.googleapis.com/fcm/send/dev-6')
})
