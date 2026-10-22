// village-77 Worker for the village app:
//
//   POST /line-auth   { code, redirectUri }  or  { idToken }  (from LIFF, inside LINE)
//       With { handoff } (iPhone home-screen app) the sign-in is parked for
//   POST /line-handoff { handoff }  — the app collects it after LINE ends in Safari.
//       Sign in with LINE. Trades the LINE Login authorization code for the
//       user's LINE profile, then mints a Firebase custom token (uid
//       "line:<LINE user id>") the app signs in with. Firebase has no LINE
//       provider, so this is the bridge.
//
//   POST /upload      multipart "file"  (Authorization: Bearer <Firebase ID token>)
//       Stores a post photo in R2 and returns its URL. Photos used to live
//       inside the Firestore post as data URLs, which made every visitor
//       download every photo on open; now cards lazy-load real image URLs.
//
//   POST /delete      { urls }  (Authorization: Bearer <Firebase ID token>)
//       Deletes the caller's own photos that a post no longer uses.
//
//   POST /log         error reports from the app (src/errorReport.js), written to the log.
//
//   GET  /s/<postId>  (also pumbafluffycorgi.com/village-77/s/<postId>)
//       A shared post link: og: tags for LINE's preview, then on to the app.
//
//   POST /upload may also carry "thumb": a small JPEG for list cards, stored as <name>-t.jpg.
//
//   GET  /p/<key>
//       Serves a stored photo (immutable, cached by the browser / CDN).
//
// Config (wrangler.toml / secrets — see README.md):
//   BUCKET                     R2 bucket "village-77-photos"
//   LINE_CHANNEL_ID            var  — LINE Login channel id (public)
//   LINE_CHANNEL_SECRET        secret
//   FIREBASE_SERVICE_ACCOUNT   secret — the pumgoda service-account JSON key

const PROJECT_ID = 'pumgoda'
const ALLOWED_ORIGINS = ['https://pumbafluffycorgi.com', 'http://localhost:5184']
// LINE only redirects back to callback URLs registered on the channel; this
// list must match that setting.
const ALLOWED_REDIRECTS = ['https://pumbafluffycorgi.com/village-77/', 'http://localhost:5184/village-77/']
const MAX_BYTES = 3 * 1024 * 1024 // app shrinks photos well below this first
const EXT = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const CUSTOM_TOKEN_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit'

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  })
}

// ── base64url helpers ──
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
const b64urlToString = (s) => new TextDecoder().decode(b64urlToBytes(s))
function bytesToB64url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const strToB64url = (s) => bytesToB64url(new TextEncoder().encode(s))

// ── Verify a Firebase ID token (same as dog-near-me / pumgoda workers) ──
async function verifyIdToken(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('malformed token')
  const header = JSON.parse(b64urlToString(parts[0]))
  const payload = JSON.parse(b64urlToString(parts[1]))

  const jwks = await (await fetch(JWKS_URL)).json()
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('signing key not found')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const data = new TextEncoder().encode(parts[0] + '.' + parts[1])
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), data))) throw new Error('bad signature')

  const now = Math.floor(Date.now() / 1000)
  if (payload.aud !== PROJECT_ID) throw new Error('bad aud')
  if (payload.iss !== 'https://securetoken.google.com/' + PROJECT_ID) throw new Error('bad iss')
  if (payload.exp <= now) throw new Error('expired')
  if (payload.iat > now + 300) throw new Error('iat in future')
  if (!payload.sub) throw new Error('no sub')
  return payload
}

// ── Mint a Firebase custom token, signed with the service-account key ──
async function mintCustomToken(env, uid, claims) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])

  const now = Math.floor(Date.now() / 1000)
  const header = strToB64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = strToB64url(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: CUSTOM_TOKEN_AUD,
    iat: now,
    exp: now + 3600,
    uid,
    claims,
  }))
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(header + '.' + payload))
  return header + '.' + payload + '.' + bytesToB64url(new Uint8Array(sig))
}

async function handleLineAuth(request, env, origin) {
  if (!env.LINE_CHANNEL_ID || !env.LINE_CHANNEL_SECRET || !env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'LINE sign-in is not configured yet' }, 503, origin)
  }
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'expected JSON' }, 400, origin)
  }
  const { code, redirectUri, idToken: liffIdToken, lineError, handoff } = body || {}
  // The app reports errors LINE sent back instead of a code, just for the log.
  if (lineError) {
    console.warn('[line-auth] LINE returned an error', String(lineError).slice(0, 300))
    return json({ ok: true }, 200, origin)
  }
  let idToken
  if (typeof liffIdToken === 'string' && liffIdToken) {
    // Opened inside the LINE app (LIFF): it hands us an ID token directly —
    // no redirect to LINE's login page, which fails on some iPhones.
    idToken = liffIdToken
  } else {
    if (typeof code !== 'string' || !code) return json({ error: 'missing code' }, 400, origin)
    if (!ALLOWED_REDIRECTS.includes(redirectUri)) return json({ error: 'bad redirectUri' }, 400, origin)

    // 1. Authorization code → LINE ID token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: env.LINE_CHANNEL_ID,
        client_secret: env.LINE_CHANNEL_SECRET,
      }),
    })
    if (!tokenRes.ok) {
      console.warn('[line-auth] code rejected', tokenRes.status, (await tokenRes.text()).slice(0, 300))
      return json({ error: 'LINE rejected the code' }, 401, origin)
    }
    idToken = (await tokenRes.json()).id_token
  }

  // 2. Let LINE verify its own ID token and hand back the profile
  const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: env.LINE_CHANNEL_ID }),
  })
  if (!verifyRes.ok) {
    console.warn('[line-auth] token did not verify', liffIdToken ? 'liff' : 'web', verifyRes.status, (await verifyRes.text()).slice(0, 300))
    return json({ error: 'LINE token did not verify' }, 401, origin)
  }
  const profile = await verifyRes.json() // { sub, name, picture, ... }
  if (!profile.sub) return json({ error: 'no LINE user id' }, 401, origin)

  console.log('[line-auth] ok via', liffIdToken ? 'liff' : 'web') // no names in logs

  // 3. Firebase custom token for uid "line:<sub>"
  const name = String(profile.name || '').slice(0, 80)
  const picture = String(profile.picture || '')
  const customToken = await mintCustomToken(env, 'line:' + profile.sub, { provider: 'line' })
  // Started from the iPhone home-screen app: LINE sent the user back to
  // Safari, not to the app. Park the sign-in under the app's one-time
  // hand-off id; the app collects it with /line-handoff when it's reopened.
  if (isHandoffId(handoff)) {
    await env.BUCKET.put(HANDOFF_PREFIX + handoff, JSON.stringify({
      customToken, name, picture, expires: Date.now() + HANDOFF_TTL_MS,
    }))
    return json({ handedOff: true }, 200, origin)
  }
  return json({ customToken, name, picture }, 200, origin)
}

// Home-screen app sign-in hand-off (see handleLineAuth). The id is 32 random
// hex characters made by the app; a parked sign-in can be collected once,
// within 10 minutes.
const HANDOFF_PREFIX = '_handoff/'
const HANDOFF_TTL_MS = 10 * 60 * 1000
const isHandoffId = (id) => typeof id === 'string' && /^[0-9a-f]{32}$/.test(id)

async function handleHandoff(request, env, origin) {
  const { handoff } = await request.json().catch(() => ({}))
  if (!isHandoffId(handoff)) return json({ error: 'bad handoff id' }, 400, origin)
  const obj = await env.BUCKET.get(HANDOFF_PREFIX + handoff)
  if (!obj) return json({ pending: true }, 404, origin)
  await env.BUCKET.delete(HANDOFF_PREFIX + handoff) // one use only
  const parked = JSON.parse(await obj.text())
  if (parked.expires < Date.now()) return json({ error: 'expired' }, 410, origin)
  const { customToken, name, picture } = parked
  console.log('[line-auth] ok via home-screen hand-off')
  return json({ customToken, name, picture }, 200, origin)
}

async function handleUpload(request, env, origin) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)
  let user
  try {
    if (!m) throw new Error('missing token')
    user = await verifyIdToken(m[1])
  } catch (e) {
    return json({ error: 'unauthorized: ' + e.message }, 401, origin)
  }
  if (await isBanned(user.sub, m[1])) return json({ error: 'account suspended' }, 403, origin)
  if (!(await countUpload(env, user.sub))) {
    return json({ error: 'daily upload limit reached' }, 429, origin)
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'expected multipart form-data' }, 400, origin)
  }
  const file = form.get('file')
  if (!file || typeof file === 'string') return json({ error: 'no file field' }, 400, origin)
  if (!EXT[file.type]) return json({ error: 'unsupported type: ' + file.type }, 415, origin)
  if (file.size > MAX_BYTES) return json({ error: 'too large' }, 413, origin)

  // Uploader's uid in the key, so an admin can trace a bad photo back and
  // /delete can check the photo is the caller's own.
  const key = `${uidFolder(user.sub)}/${crypto.randomUUID()}.${EXT[file.type]}`
  await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  // Optional small copy for list cards, next to it as <name>-t.jpg (thumbKey).
  const thumb = form.get('thumb')
  if (thumb && typeof thumb !== 'string' && thumb.type === 'image/jpeg' && thumb.size <= MAX_THUMB_BYTES) {
    await env.BUCKET.put(thumbKey(key), await thumb.arrayBuffer(), { httpMetadata: { contentType: 'image/jpeg' } })
  }
  return json({ url: new URL('/p/' + key, request.url).toString() }, 200, origin)
}

const uidFolder = (uid) => uid.replace(/[^A-Za-z0-9:_-]/g, '')
const MAX_THUMB_BYTES = 200 * 1024
// Thumbnail key for a photo key: photo.jpg -> photo-t.jpg (the app uses the same rule).
const thumbKey = (key) => key.replace(/\.[a-z]+$/, '') + '-t.jpg'

// Banned by a village admin (villageBans/{uid})? Read with the caller's own
// ID token — firestore.rules let a person get their own ban doc. 404 = not
// banned. Any other failure lets the upload through rather than breaking it.
async function isBanned(uid, idToken) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/villageBans/${encodeURIComponent(uid)}`, {
    headers: { Authorization: 'Bearer ' + idToken },
  }).catch(() => null)
  return !!res && res.status === 200
}

// Daily cap per person, so one account can't fill the bucket. The count is
// a tiny object in the same R2 bucket under _limits/ (never served by /p/).
const UPLOADS_PER_DAY = 60
async function countUpload(env, uid) {
  const key = `_limits/${new Date().toISOString().slice(0, 10)}/${uidFolder(uid)}`
  const obj = await env.BUCKET.get(key)
  const count = obj ? Number(await obj.text()) || 0 : 0
  if (count >= UPLOADS_PER_DAY) return false
  await env.BUCKET.put(key, String(count + 1))
  return true
}

// POST /delete { urls: [...] } — removes photos a post no longer uses (the
// app calls this when a photo is removed or a post is deleted). Only the
// uploader's own photos are deleted; anything else is skipped.
async function handleDelete(request, env, origin) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)
  let user
  try {
    if (!m) throw new Error('missing token')
    user = await verifyIdToken(m[1])
  } catch (e) {
    return json({ error: 'unauthorized: ' + e.message }, 401, origin)
  }
  const { urls } = await request.json().catch(() => ({}))
  if (!Array.isArray(urls)) return json({ error: 'expected { urls: [] }' }, 400, origin)

  const mine = uidFolder(user.sub) + '/'
  const keys = urls.slice(0, 50).map((u) => {
    try {
      const p = new URL(u)
      return p.host === new URL(request.url).host && p.pathname.startsWith('/p/') ? decodeURIComponent(p.pathname.slice(3)) : null
    } catch {
      return null
    }
  }).filter((k) => k && k.startsWith(mine))
  if (keys.length) await env.BUCKET.delete([...keys, ...keys.map(thumbKey)]) // and their thumbnails
  return json({ deleted: keys.length }, 200, origin)
}

// POST /log: an error report from the app (src/errorReport.js), written to
// this Worker's log. Only from the app's own site; small and capped.
async function handleClientLog(request, origin) {
  if (!ALLOWED_ORIGINS.includes(origin)) return new Response(null, { status: 204 })
  const raw = (await request.text().catch(() => '')).slice(0, 2000)
  let r = {}
  try { r = JSON.parse(raw) } catch { /* keep the raw text */ }
  const s = (v, n) => String(v ?? '').slice(0, n)
  console.warn('[client]', s(r.kind, 20), s(r.msg || raw, 500), '| page', s(r.page, 120),
    '| v', s(r.version, 20), '| uid', s(r.uid, 60), '| ua', s(r.ua, 200))
  return new Response(null, { status: 204, headers: cors(origin) })
}

async function handlePhoto(key, env) {
  if (key.startsWith('_')) return new Response('not found', { status: 404 })
  const obj = await env.BUCKET.get(key)
  if (!obj) return new Response('not found', { status: 404 })
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// GET /s/<postId>: the link people share into LINE. LINE's link preview
// reads the og: tags (the shop's photo, name and description); a person who
// taps it is sent straight on to the post inside the app (via LIFF, so it
// opens in LINE). Posts are public in Firestore, so the REST read needs no auth.
const OPEN_URL = 'https://liff.line.me/2012133281-TffzWAQ2' // LIFF_URL in ../src/liff.js
const FALLBACK_IMAGE = 'https://pumbafluffycorgi.com/pumba.png'
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const str = (f) => f?.stringValue || ''
const strList = (f) => (f?.arrayValue?.values || []).map((v) => v.stringValue).filter(Boolean)

async function readPost(id) {
  for (const coll of ['villageShops', 'villageProviders']) {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${coll}/${encodeURIComponent(id)}`)
    if (res.ok) return { coll, fields: (await res.json()).fields || {} }
  }
  return null
}

async function handleShareLink(id) {
  const target = OPEN_URL + '?p=' + encodeURIComponent(id)
  let title = 'หมู่บ้านของเรา · Our Village'
  let desc = 'ตลาดซื้อขายและสารพัดช่างในหมู่บ้าน'
  let image = FALLBACK_IMAGE
  const post = /^[\w-]{1,64}$/.test(id) ? await readPost(id).catch(() => null) : null
  if (post) {
    const f = post.fields
    const items = (f.items?.arrayValue?.values || []).map((v) => v.mapValue?.fields || {})
    const isShop = post.coll === 'villageShops'
    title = (isShop ? '🛒 ' : '🔧 ') + str(f.name)
    const forSale = items.filter((it) => !it.sold?.booleanValue).map((it) => str(it.name)).filter(Boolean)
    desc = str(f.description) || (forSale.length ? forSale.slice(0, 5).join(' · ') : desc)
    image = strList(f.photos)[0] || items.map((it) => str(it.photo)).find(Boolean) || image
  }
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="หมู่บ้านของเรา">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc.slice(0, 160))}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(target)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><p><a href="${esc(target)}">${esc(title)}</a></p>
<script>location.replace(${JSON.stringify(target)})</script></body></html>`
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
    // Share links: pumbafluffycorgi.com/village-77/s/<id> (route in
    // wrangler.toml) and the older workers.dev /s/<id> ones already shared.
    const share = url.pathname.match(/^(?:\/village-77)?\/s\/([^/]+)$/)
    if (request.method === 'GET' && share) {
      return handleShareLink(decodeURIComponent(share[1]))
    }
    if (request.method === 'GET' && url.pathname.startsWith('/p/')) {
      return handlePhoto(decodeURIComponent(url.pathname.slice(3)), env)
    }
    try {
      if (request.method === 'POST' && url.pathname === '/line-auth') return await handleLineAuth(request, env, origin)
      if (request.method === 'POST' && url.pathname === '/upload') return await handleUpload(request, env, origin)
      if (request.method === 'POST' && url.pathname === '/delete') return await handleDelete(request, env, origin)
      if (request.method === 'POST' && url.pathname === '/line-handoff') return await handleHandoff(request, env, origin)
      if (request.method === 'POST' && url.pathname === '/log') return await handleClientLog(request, origin)
    } catch (e) {
      console.error('[village-77 worker]', e)
      return json({ error: 'server error' }, 500, origin)
    }
    return json({ error: 'not found' }, 404, origin)
  },
}
