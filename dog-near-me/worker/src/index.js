// MaJon photo Worker — any signed-in user may upload a stray-dog sighting photo.
// REQUIRED BINDINGS:
//   BUCKET       R2 bucket "majon-photos" (Worker → Settings → Bindings → R2)
//   RATE_LIMITER KV namespace for per-user daily upload caps
// REQUIRED SECRET:
//   GOOGLE_API_KEY  (wrangler secret put GOOGLE_API_KEY)
//
// Two routes:
//   POST /          verify Firebase ID token -> per-uid rate limit -> upload
//                    photo to R2 -> ask Gemini for structured descriptive
//                    tags -> return { photoUrl, tags }.
//   POST /compare    verify token -> per-uid rate limit (separate pool) ->
//                    fetch the new photo + up to 5 nearby candidate photos
//                    (must be our own R2 URLs) -> ask Gemini to directly
//                    compare the new photo against each candidate in one
//                    request -> return { results: [{id, sameDog, confidence}] }.
//                    This is real visual comparison, not text-tag matching —
//                    the client still does the location-radius filtering to
//                    keep the candidate list small before this runs.

const PROJECT_ID = 'pumgoda'
const PUBLIC_BASE = 'https://pub-8d7c1c4e4cec4c81bbe97a7c299022ac.r2.dev' // replace after creating the bucket (see README)
const ALLOWED_ORIGINS = ['https://pumbafluffycorgi.com', 'https://pbfluffy.github.io']
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB per image
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const RETRY_STATUSES = new Set([500, 502, 503, 504])
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1000

const UPLOADS_PER_DAY = 20
const COMPARES_PER_DAY = 20
const MAX_COMPARE_CANDIDATES = 5

const TAG_PROMPT = `You are describing a dog in a photo for a community stray-dog identification app.

Respond ONLY with valid JSON, no markdown fences, no preamble:

{
  "colorPrimary": "<dominant coat color, e.g. brown, black, white, tan, brindle>",
  "pattern": "<solid|patched|spotted|brindle|unknown>",
  "size": "<small|medium|large>",
  "earType": "<erect|floppy|unknown>",
  "tailType": "<curled|straight|bobbed|unknown>",
  "sexGuess": "<male|female|unknown>",
  "hasCollar": <true if the dog is clearly wearing a collar or harness, false otherwise>,
  "breedGuess": "<best-effort breed or breed mix, e.g. 'Thai Bangkaew mix', 'mixed breed' if no specific breed is recognizable — most street dogs are mixed breed, so don't force a purebred guess>",
  "distinguishingMarks": ["<short phrase, e.g. 'white chest patch', 'notched left ear'>"]
}

If the image does not clearly show a dog, respond with {"error": "no dog detected"} instead.`

const COMPARE_PROMPT = `You are comparing a newly reported stray dog photo against photos of
dogs previously reported nearby, to help a human decide whether any of them
are the same individual dog.

The first photo (labeled NEW REPORT) is the new sighting. Each following
photo is a CANDIDATE, labeled with its index (0, 1, 2, ...) right before it.

For each candidate, judge whether it is very likely the SAME INDIVIDUAL dog
as the new report — based on coat pattern, markings, coloring, body shape,
and other identifying features. Do NOT match on breed or general size
alone — two different dogs of the same breed/size are NOT a match.

Respond ONLY with valid JSON, no markdown fences, no preamble:
{
  "results": [
    {"index": 0, "sameDog": true|false, "confidence": "high"|"medium"|"low"}
  ]
}
Include exactly one entry per candidate, in the same order they were shown.`

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
const b64urlToString = (s) => new TextDecoder().decode(b64urlToBytes(s))

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

// --- Auth: verify a Firebase ID token (copied from pumgoda-photo-worker.js) ---
async function verifyIdToken(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('malformed token')
  const header = JSON.parse(b64urlToString(parts[0]))
  const payload = JSON.parse(b64urlToString(parts[1]))

  const jwks = await (await fetch(JWKS_URL)).json()
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('signing key not found')

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  )
  const data = new TextEncoder().encode(parts[0] + '.' + parts[1])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), data)
  if (!ok) throw new Error('bad signature')

  const now = Math.floor(Date.now() / 1000)
  if (payload.aud !== PROJECT_ID) throw new Error('bad aud')
  if (payload.iss !== 'https://securetoken.google.com/' + PROJECT_ID) throw new Error('bad iss')
  if (payload.exp <= now) throw new Error('expired')
  if (payload.iat > now + 300) throw new Error('iat in future')
  if (!payload.sub) throw new Error('no sub')
  return payload
}

async function requireUser(request) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)
  if (!m) throw new Error('missing token')
  return verifyIdToken(m[1])
}

async function checkRateLimit(env, uid, pool, cap) {
  if (!env.RATE_LIMITER) return true
  const day = new Date().toISOString().slice(0, 10)
  const key = `${pool}:${day}:${uid}`
  const count = Number((await env.RATE_LIMITER.get(key)) || 0)
  if (count >= cap) return false
  await env.RATE_LIMITER.put(key, String(count + 1), { expirationTtl: 24 * 60 * 60 })
  return true
}

async function fetchWithRetry(url, init) {
  let lastResponse
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    lastResponse = await fetch(url, init)
    if (!RETRY_STATUSES.has(lastResponse.status)) return lastResponse
    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * (attempt + 1)))
    }
  }
  return lastResponse
}

// Extracts a JSON object from a Gemini generateContent response body, or
// null on any failure (missing text, malformed JSON) — shared by describeDog
// and compareDogs, both of which treat their AI call as best-effort.
function parseGeminiJson(data) {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

async function callGemini(env, parts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GOOGLE_API_KEY}`
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    console.error('Gemini API error', res.status, await res.text())
    return null
  }
  return parseGeminiJson(await res.json())
}

async function describeDog(env, base64Image, mimeType) {
  const parsed = await callGemini(env, [
    { inline_data: { mime_type: mimeType, data: base64Image } },
    { text: TAG_PROMPT },
  ])
  if (parsed?.error) return null // tag extraction is best-effort — a photo/location report still succeeds without it
  return parsed
}

async function fetchImageAsBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  return { base64: bytesToBase64(bytes), mimeType: res.headers.get('content-type') || 'image/jpeg' }
}

// Sends the new photo + every candidate photo to Gemini in ONE request and
// asks it to directly compare them, rather than string-matching independent
// per-photo descriptions (the old approach — see git history). Returns one
// result per candidate, id-keyed and defensively defaulted, so a malformed
// or partial Gemini response can never desync from the candidate list; a
// total failure (network/parse) returns null so the caller can fall back.
async function compareDogs(env, newPhotoUrl, candidates) {
  const [newImg, ...candidateImgs] = await Promise.all(
    [newPhotoUrl, ...candidates.map((c) => c.photoUrl)].map(fetchImageAsBase64)
  )

  const parts = [
    { text: COMPARE_PROMPT },
    { text: 'NEW REPORT:' },
    { inline_data: { mime_type: newImg.mimeType, data: newImg.base64 } },
  ]
  candidateImgs.forEach((img, i) => {
    parts.push({ text: `CANDIDATE ${i}:` })
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } })
  })

  const parsed = await callGemini(env, parts)
  if (!parsed) return null

  const byIndex = new Map((Array.isArray(parsed.results) ? parsed.results : []).map((r) => [r.index, r]))
  return candidates.map((c, i) => {
    const r = byIndex.get(i)
    return {
      id: c.id,
      sameDog: r?.sameDog === true,
      confidence: ['high', 'medium', 'low'].includes(r?.confidence) ? r.confidence : null,
    }
  })
}

// Only our own R2 photos may be fetched by the worker — /compare takes
// client-supplied URLs to fetch server-side, so without this an attacker
// could point it at arbitrary internal/external URLs (SSRF) or burn Gemini
// calls on arbitrary images.
function isOwnPhotoUrl(url) {
  return typeof url === 'string' && url.startsWith(PUBLIC_BASE + '/')
}

async function handleUpload(request, env, origin, uid) {
  const allowed = await checkRateLimit(env, uid, 'rl', UPLOADS_PER_DAY)
  if (!allowed) return json({ error: 'rate limited: daily upload cap reached' }, 429, origin)
  if (!env.GOOGLE_API_KEY) return json({ error: 'server misconfigured: no GOOGLE_API_KEY' }, 500, origin)

  let form
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'expected multipart form-data' }, 400, origin)
  }

  const file = form.get('file')
  if (!file || typeof file === 'string') return json({ error: 'no file field' }, 400, origin)
  const type = file.type || ''
  if (!EXT[type]) return json({ error: 'unsupported type: ' + type }, 415, origin)
  if (file.size > MAX_BYTES) return json({ error: 'too large (max 8MB)' }, 413, origin)

  const lat = Number(form.get('lat'))
  const lng = Number(form.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: 'missing/invalid lat,lng' }, 400, origin)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const key = `${crypto.randomUUID()}.${EXT[type]}`

  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type } })
  const photoUrl = `${PUBLIC_BASE}/${key}`

  const tags = await describeDog(env, bytesToBase64(bytes), type)

  return json({ photoUrl, tags }, 200, origin)
}

async function handleCompare(request, env, origin, uid) {
  const allowed = await checkRateLimit(env, uid, 'cmp', COMPARES_PER_DAY)
  if (!allowed) return json({ error: 'rate limited: daily compare cap reached' }, 429, origin)
  if (!env.GOOGLE_API_KEY) return json({ error: 'server misconfigured: no GOOGLE_API_KEY' }, 500, origin)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'expected JSON body' }, 400, origin)
  }

  const { newPhotoUrl, candidates } = body || {}
  if (!isOwnPhotoUrl(newPhotoUrl)) return json({ error: 'invalid newPhotoUrl' }, 400, origin)
  if (!Array.isArray(candidates)) return json({ error: 'candidates must be an array' }, 400, origin)

  const capped = candidates.slice(0, MAX_COMPARE_CANDIDATES)
  if (capped.some((c) => !c || typeof c.id !== 'string' || !isOwnPhotoUrl(c.photoUrl))) {
    return json({ error: 'invalid candidate entry' }, 400, origin)
  }
  if (capped.length === 0) return json({ results: [] }, 200, origin)

  try {
    const results = await compareDogs(env, newPhotoUrl, capped)
    // null = the whole Gemini call failed (network/parse) — still 200 with
    // an empty array so the client falls back to its own ranking rather
    // than treating this as a hard error.
    return json({ results: results || [] }, 200, origin)
  } catch (e) {
    console.error('compare failed:', e)
    return json({ results: [] }, 200, origin)
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const path = new URL(request.url).pathname

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
    if (request.method === 'GET') return new Response('majon-photo OK', { headers: cors(origin) })
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, origin)

    let payload
    try {
      payload = await requireUser(request)
    } catch (e) {
      return json({ error: 'unauthorized: ' + e.message }, 401, origin)
    }

    if (path === '/compare') return handleCompare(request, env, origin, payload.sub)
    return handleUpload(request, env, origin, payload.sub)
  },
}
