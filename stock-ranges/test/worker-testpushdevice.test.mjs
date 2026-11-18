import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'

// End to end through the Worker's real fetch handler: a locally generated key stands
// in for Google's token-signing key, and the network is stubbed so nothing is sent.
const PROJECT = 'test-project'
const require = createRequire(import.meta.url)

// The Worker's own dependencies (jose, the push library) live in worker/node_modules, which
// the deploy gate does not install. Without them this file skips itself, so it runs locally
// (and wherever the Worker's dependencies are installed) without ever blocking a deploy.
const workerRequire = createRequire(new URL('../worker/package.json', import.meta.url))
let jose = null
try { jose = await import(pathToFileURL(workerRequire.resolve('jose')).href) } catch { /* not installed */ }
const { SignJWT, exportJWK } = jose || {}
const opts = { skip: jose ? false : 'Worker dependencies are not installed (run npm install in stock-ranges/worker)' }
const b64u = (buf) => Buffer.from(buf).toString('base64url')

const realFetch = globalThis.fetch
let worker, privateKey, jwk, env, pushCalls, pushStatus

class FakeKV {
  constructor() { this.m = new Map() }
  async get(k, type) { const v = this.m.get(k); return v === undefined ? null : (type === 'json' ? JSON.parse(v) : v) }
  async put(k, v) { this.m.set(k, String(v)) }
  async delete(k) { this.m.delete(k) }
  async list() { return { keys: [] } }
}

async function token(uid = 'user-1', claims = {}) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setSubject(uid).setIssuer(`https://securetoken.google.com/${PROJECT}`).setAudience(PROJECT)
    .setIssuedAt().setExpirationTime('1h').sign(privateKey)
}

async function deviceSubscription(endpoint = 'https://fcm.googleapis.com/fcm/send/device-abc') {
  const ecdh = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  return { endpoint, expirationTime: null, keys: { p256dh: b64u(await webcrypto.subtle.exportKey('raw', ecdh.publicKey)), auth: b64u(webcrypto.getRandomValues(new Uint8Array(16))) } }
}

async function call(body, { uid = 'user-1', auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) headers.Authorization = `Bearer ${await token(uid)}`
  const res = await worker.fetch(new Request('https://worker.test/alerts', { method: 'POST', headers, body: JSON.stringify(body) }), env, { waitUntil() {} })
  return { status: res.status, body: await res.json() }
}

before(async () => {
  if (!jose) return
  worker = (await import('../worker/src/index.js')).default
  const pair = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  privateKey = pair.privateKey
  jwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-kid', alg: 'RS256', use: 'sig' }

  const webpush = require('../worker/node_modules/web-push')
  const vapid = webpush.generateVAPIDKeys()
  env = { FIREBASE_PROJECT_ID: PROJECT, VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey }

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.includes('googleapis.com/service_accounts/v1/jwk')) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'content-type': 'application/json' } })
    pushCalls.push({ url, init })
    return new Response('', { status: pushStatus })
  }
})
beforeEach(() => { if (!jose) return; env.ALERTS = new FakeKV(); pushCalls = []; pushStatus = 201 })
after(() => { if (jose) globalThis.fetch = realFetch })

test('a valid request sends exactly one signed, encrypted push to that device', opts, async () => {
  const subscription = await deviceSubscription()
  const r = await call({ type: 'testPushDevice', subscription, lang: 'en' })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { result: 'ok' })
  assert.equal(pushCalls.length, 1)
  assert.equal(pushCalls[0].url, subscription.endpoint)
  assert.match(pushCalls[0].init.headers.authorization || pushCalls[0].init.headers.Authorization, /^(WebPush|vapid) /i)
  assert.ok(pushCalls[0].init.body.byteLength > 50, 'payload is encrypted bytes, not empty')
})

test('a second test within a minute is refused without contacting the push service', opts, async () => {
  const subscription = await deviceSubscription()
  assert.equal((await call({ type: 'testPushDevice', subscription })).status, 200)
  const again = await call({ type: 'testPushDevice', subscription })
  assert.equal(again.status, 429)
  assert.equal(pushCalls.length, 1)
})

test('the cooldown is per user', opts, async () => {
  const subscription = await deviceSubscription()
  assert.equal((await call({ type: 'testPushDevice', subscription }, { uid: 'user-1' })).status, 200)
  assert.equal((await call({ type: 'testPushDevice', subscription }, { uid: 'user-2' })).status, 200)
})

test('an endpoint that is not a push service is refused and never contacted', opts, async () => {
  const bad = await deviceSubscription('https://evil.example.com/steal')
  const r = await call({ type: 'testPushDevice', subscription: bad })
  assert.equal(r.status, 400)
  assert.equal(pushCalls.length, 0)
})

test('an invalid request does not use up the cooldown', opts, async () => {
  assert.equal((await call({ type: 'testPushDevice', subscription: { endpoint: 'nope' } })).status, 400)
  const good = await deviceSubscription()
  assert.equal((await call({ type: 'testPushDevice', subscription: good })).status, 200)
})

test('no token, or a token for another project, is unauthorized', opts, async () => {
  const subscription = await deviceSubscription()
  assert.equal((await call({ type: 'testPushDevice', subscription }, { auth: false })).status, 401)
  const wrong = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'test-kid' }).setSubject('u').setIssuer('https://securetoken.google.com/other').setAudience('other').setExpirationTime('1h').sign(privateKey)
  const res = await worker.fetch(new Request('https://worker.test/alerts', { method: 'POST', headers: { Authorization: `Bearer ${wrong}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'testPushDevice', subscription }) }), env, { waitUntil() {} })
  assert.equal(res.status, 401)
  assert.equal(pushCalls.length, 0)
})

test('reports an expired device ("gone") and a push-service failure ("error")', opts, async () => {
  const subscription = await deviceSubscription()
  pushStatus = 410
  assert.deepEqual((await call({ type: 'testPushDevice', subscription }, { uid: 'u-gone' })).body, { result: 'gone' })
  pushStatus = 500
  assert.deepEqual((await call({ type: 'testPushDevice', subscription }, { uid: 'u-err' })).body, { result: 'error' })
})
