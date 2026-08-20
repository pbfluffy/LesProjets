// stock-ranges-quotes Worker — public read-only proxy for Yahoo Finance's
// chart API, which does not send CORS headers so the browser can't call it
// directly. The GET routes below have no auth/bindings (only ever forward
// public market data, shared 5-minute edge cache is enough to keep Yahoo
// happy) — but the POST import route calls paid Workers AI inference, so
// unlike those it's rate-limited per IP via a KV binding, same convention
// as majon-photo/trip-planner-generate's external-vision-API routes.
//
// GET /?symbol=AAPL&range=1y   (range: 1d, 7d, 3mo, 6mo, 1y, 2y, or 5y)
//   -> { symbol, name, currency, instrumentType, current, previousClose,
//        prices: number[], ohlc: [{o,h,l,c}, ...], timestamps: number[],
//        dividends: [{date, amount}, ...] }
//      (previousClose is yesterday's close, for a day-change indicator;
//      ohlc and timestamps are parallel to prices — ohlc for the
//      candlestick view, timestamps (unix seconds) for the axis labels;
//      dividends is per-share cash dividend events — unix seconds + amount
//      in the quote's native currency — within the requested range, oldest
//      first, [] if the symbol pays none)
//   -> 404 { error } if the symbol is unknown / Yahoo has no data
//   -> 400 { error } if symbol/range fail validation
//
// GET /?q=btc   (autocomplete, so a user isn't guessing "GC=F" for gold)
//   -> [{ symbol, name, exchange, type }, ...]  (top matches, pre-filtered
//      to symbols the quote endpoint above can actually serve)
//
// POST / (multipart/form-data, repeated `pages` image files — one per
// rendered PDF page from the wallet's "Import from PDF" flow)
//   -> { rows: [{ symbol, shares, avgCost, currency, page }, ...] }
//      (Workers AI vision extraction per page; pages with no holdings
//      table just contribute no rows, not an error)
//   -> 429 { error } if the per-IP import rate limit is exceeded
//   -> 400 { error } if the upload fails validation
//
// POST /alerts (JSON, Authorization: Bearer <Firebase ID token> — the only
// auth-gated route; every route above stays fully public)
//   body { type: 'subscribe', subscription: {endpoint, keys, expirationTime} }
//     -> registers/refreshes one device's push subscription
//   body { type: 'setAlert', symbol, buy, sell, range }
//     -> sets (or clears, if both buy/sell are false) that symbol's alert
//   -> 401 { error } if the token is missing/invalid
//   -> 400 { error } if the body fails validation
//
// scheduled() — Cron Trigger (see wrangler.toml), not reachable via HTTP.
// Checks every symbol:range pair anyone has an alert on; on a buy/sell
// zone transition, pushes a notification to whoever asked for it. See
// scheduled.js.

import { SYMBOL_RE, RANGE_CONFIG } from './constants.js'
import { getQuote } from './quotes.js'
import { verifyFirebaseToken } from './auth.js'
import { upsertSubscription, setAlert } from './alerts.js'
import { runScheduled } from './scheduled.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SEARCH_QUERY_RE = /^[\w .\-&]{1,30}$/
const CACHE_TTL_SECONDS = 5 * 60

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

async function withCache(cache, cacheKey, ctx, produce) {
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const response = await produce()
  const cacheable = new Response(response.body, response)
  if (response.status === 200) {
    cacheable.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`)
    ctx.waitUntil(cache.put(cacheKey, cacheable.clone()))
  }
  return cacheable
}

async function handleSearch(query, cache, ctx) {
  const q = query.trim()
  if (!SEARCH_QUERY_RE.test(q)) {
    return json({ error: 'invalid query' }, 400)
  }

  const cacheKey = new Request(`https://stock-ranges-cache.internal/search/${encodeURIComponent(q.toLowerCase())}`)
  return withCache(cache, cacheKey, ctx, async () => {
    let upstream
    try {
      upstream = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; stock-ranges/1.0)' } },
      )
    } catch {
      return json({ error: 'upstream fetch failed' }, 502)
    }
    if (!upstream.ok) return json({ error: 'search failed' }, 502)

    const data = await upstream.json().catch(() => null)
    const quotes = Array.isArray(data?.quotes) ? data.quotes : []
    const results = quotes
      .filter((item) => typeof item.symbol === 'string' && SYMBOL_RE.test(item.symbol))
      .slice(0, 6)
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchDisp || item.exchange || '',
        type: item.typeDisp || item.quoteType || '',
      }))

    return json(results)
  })
}

const IMPORT_MAX_PAGES = 20
const IMPORT_MAX_IMAGE_BYTES = 4 * 1024 * 1024
const IMPORT_RATE_LIMIT_MAX = 8
const IMPORT_RATE_LIMIT_WINDOW_SECONDS = 60 * 60
const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct'

const EXTRACTION_PROMPT = `This image may be one page of a brokerage statement (Thai and/or English) with a per-stock holdings table: Stock Name, Allocation % (ends with %), Shares (a share count specific to that one stock, e.g. 0.1976964 or 159.5), Average Cost (currency amount per share), Price, and other columns.

Only extract from that exact table. Do NOT extract from a sector/industry allocation summary (rows like "Technology", "Real Estate", "ETF" naming a category, not a stock — these have no per-share Shares/Average Cost column) and do NOT extract from a grid of fund-company names or logos (e.g. "KTAM", "KAsset", "SCBAM") — those are not stock holdings either. If you are not looking at individual stock tickers each with their own share count and per-share average cost, output [].

If the real per-stock holdings table is present, output a JSON array, one object per stock row: {"symbol": ticker text, "shares": value from the Shares column, "avgCost": value from the Average Cost column, "currency": 3-letter currency code or "USD"}. Skip any row labeled Total/รวม.

Output only the JSON array, nothing else — no explanation before or after it.`

function stripJsonFences(text) {
  const stripped = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  // The model sometimes wraps the array in explanatory prose despite being
  // told not to ("Here is the output... [1,2,3]") — pull out just the
  // outermost [...] substring rather than requiring the whole response to
  // be clean JSON.
  const start = stripped.indexOf('[')
  const end = stripped.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return stripped
  return stripped.slice(start, end + 1)
}

// A page with no table, a model hiccup, or a malformed response all just
// contribute zero rows rather than failing the whole import — the user
// reviews the aggregated result before anything is saved, so silently
// skipping a bad page is safer than surfacing a scary per-page error.
async function extractPageHoldings(env, bytes) {
  let result
  try {
    result = await env.AI.run(VISION_MODEL, {
      image: [...new Uint8Array(bytes)],
      prompt: EXTRACTION_PROMPT,
      max_tokens: 1024,
      temperature: 0,
    })
  } catch {
    return []
  }

  // The model sometimes returns `response` as an already-parsed array
  // (structured JSON mode) and sometimes as a JSON string — handle both
  // rather than assuming one.
  let parsed = result?.response
  if (!Array.isArray(parsed)) {
    try {
      parsed = JSON.parse(stripJsonFences(parsed))
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((row) => {
      const symbol = typeof row?.symbol === 'string' ? row.symbol.trim().toUpperCase() : ''
      const shares = typeof row?.shares === 'number' ? row.shares : parseFloat(row?.shares)
      const avgCost = typeof row?.avgCost === 'number' ? row.avgCost : parseFloat(row?.avgCost)
      const currency = typeof row?.currency === 'string' && /^[A-Za-z]{3}$/.test(row.currency) ? row.currency.toUpperCase() : 'USD'
      return { symbol, shares, avgCost, currency }
    })
    .filter((row) => SYMBOL_RE.test(row.symbol) && Number.isFinite(row.shares) && row.shares > 0 && Number.isFinite(row.avgCost) && row.avgCost >= 0)
}

// Fixed-window per-IP counter in KV, TTL'd to the window so it self-clears
// — good enough for bounding cost on a personal-use endpoint, no need for
// a sliding-window algorithm here.
async function checkImportRateLimit(env, ip) {
  if (!env.IMPORT_RATE_LIMITER) return true // binding not configured (e.g. local dev) — don't block
  const key = `import:${ip}`
  const current = parseInt((await env.IMPORT_RATE_LIMITER.get(key)) || '0', 10)
  if (current >= IMPORT_RATE_LIMIT_MAX) return false
  await env.IMPORT_RATE_LIMITER.put(key, String(current + 1), { expirationTtl: IMPORT_RATE_LIMIT_WINDOW_SECONDS })
  return true
}

async function handleImport(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!(await checkImportRateLimit(env, ip))) {
    return json({ error: 'rate limit exceeded' }, 429)
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'invalid form data' }, 400)
  }

  const files = form.getAll('pages').filter((f) => f instanceof File)
  if (files.length === 0) return json({ error: 'no pages provided' }, 400)
  if (files.length > IMPORT_MAX_PAGES) return json({ error: 'too many pages' }, 400)
  for (const f of files) {
    if (!f.type.startsWith('image/')) return json({ error: 'invalid file type' }, 400)
    if (f.size > IMPORT_MAX_IMAGE_BYTES) return json({ error: 'file too large' }, 400)
  }

  const rows = []
  for (let i = 0; i < files.length; i++) {
    const bytes = await files[i].arrayBuffer()
    const pageRows = await extractPageHoldings(env, bytes)
    pageRows.forEach((row) => rows.push({ ...row, page: i + 1 }))
  }

  return json({ rows })
}

// Verifies the caller's Firebase ID token, then dispatches on the body's
// `type` — this is the only auth-gated route the worker has; every GET
// route stays fully public (they only ever forward public market data).
async function handleAlerts(request, env) {
  const uid = await verifyFirebaseToken(request, env)
  if (!uid) return json({ error: 'unauthorized' }, 401)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid body' }, 400)
  }

  if (body?.type === 'subscribe') {
    const ok = await upsertSubscription(env, uid, body.subscription)
    return ok ? json({ ok: true }) : json({ error: 'invalid subscription' }, 400)
  }
  if (body?.type === 'setAlert') {
    const ok = await setAlert(env, uid, body)
    return ok ? json({ ok: true }) : json({ error: 'invalid alert' }, 400)
  }
  return json({ error: 'unknown type' }, 400)
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    if (request.method === 'POST') {
      if (url.pathname === '/alerts') {
        return handleAlerts(request, env)
      }
      return handleImport(request, env)
    }
    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405)
    }

    const cache = caches.default

    const query = url.searchParams.get('q')
    if (query !== null) {
      return handleSearch(query, cache, ctx)
    }

    const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase()
    const range = url.searchParams.get('range') || '1y'

    if (!SYMBOL_RE.test(symbol)) {
      return json({ error: 'invalid symbol' }, 400)
    }
    if (!RANGE_CONFIG[range]) {
      return json({ error: 'invalid range' }, 400)
    }

    const body = await getQuote(symbol, range, ctx)
    if (!body) {
      return json({ error: 'not found' }, 404)
    }
    return json(body)
  },

  // Cloudflare Cron Trigger (see wrangler.toml's [triggers]) — checks
  // every symbol:range pair anyone has an active alert on and pushes a
  // notification on a buy/sell zone transition. See scheduled.js.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduled(env, ctx))
  },
}
