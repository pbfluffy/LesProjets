// stock-ranges-quotes Worker — public read-only proxy for Yahoo Finance's
// chart API, which does not send CORS headers so the browser can't call it
// directly. No auth, no bindings: this only ever forwards public market
// data, so unlike majon-photo/trip-planner-generate there's nothing here
// worth gating behind an origin allowlist or a per-user rate limit — a
// shared 5-minute edge cache (below) is enough to keep Yahoo happy.
//
// GET /?symbol=AAPL&range=1y
//   -> { symbol, name, currency, current, prices: number[] }  (daily closes)
//   -> 404 { error } if the symbol is unknown / Yahoo has no data
//   -> 400 { error } if symbol/range fail validation

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Allows '=' too — Yahoo's futures/forex symbols use it, e.g. gold's
// "GC=F" (COMEX futures) or "XAUUSD=X" (spot forex-style quote).
const SYMBOL_RE = /^[A-Za-z0-9.\-=]{1,10}$/
const ALLOWED_RANGES = new Set(['3mo', '6mo', '1y', '2y', '5y'])
const CACHE_TTL_SECONDS = 5 * 60

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }
    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405)
    }

    const url = new URL(request.url)
    const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase()
    const range = url.searchParams.get('range') || '1y'

    if (!SYMBOL_RE.test(symbol)) {
      return json({ error: 'invalid symbol' }, 400)
    }
    if (!ALLOWED_RANGES.has(range)) {
      return json({ error: 'invalid range' }, 400)
    }

    const cache = caches.default
    const cacheKey = new Request(`https://stock-ranges-cache.internal/${symbol}/${range}`)
    const cached = await cache.match(cacheKey)
    if (cached) return cached

    let upstream
    try {
      upstream = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; stock-ranges/1.0)' } },
      )
    } catch {
      return json({ error: 'upstream fetch failed' }, 502)
    }

    if (!upstream.ok) {
      return json({ error: 'not found' }, 404)
    }

    const data = await upstream.json().catch(() => null)
    const result = data?.chart?.result?.[0]
    const meta = result?.meta
    const closes = result?.indicators?.quote?.[0]?.close
    if (!meta || !Array.isArray(closes)) {
      return json({ error: 'not found' }, 404)
    }

    const prices = closes.filter((c) => typeof c === 'number' && Number.isFinite(c))
    if (!prices.length) {
      return json({ error: 'not found' }, 404)
    }

    const payload = {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || meta.symbol || symbol,
      currency: meta.currency || 'USD',
      current: typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1],
      prices,
    }

    const response = json(payload)
    const cacheableResponse = new Response(response.body, response)
    cacheableResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`)
    ctx.waitUntil(cache.put(cacheKey, cacheableResponse.clone()))
    return cacheableResponse
  },
}
