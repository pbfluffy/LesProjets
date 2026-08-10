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
//
// GET /?q=btc   (autocomplete, so a user isn't guessing "GC=F" for gold)
//   -> [{ symbol, name, exchange, type }, ...]  (top matches, pre-filtered
//      to symbols the quote endpoint above can actually serve)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Allows '=' too — Yahoo's futures/forex symbols use it, e.g. gold's
// "GC=F" (COMEX futures) or "XAUUSD=X" (spot forex-style quote) — and '^'
// for indices like "^GSPC" (S&P 500), which autocomplete can surface.
const SYMBOL_RE = /^[A-Za-z0-9.\-=^]{1,10}$/
const SEARCH_QUERY_RE = /^[\w .\-&]{1,30}$/
const ALLOWED_RANGES = new Set(['3mo', '6mo', '1y', '2y', '5y'])
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

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }
    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405)
    }

    const url = new URL(request.url)
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
    if (!ALLOWED_RANGES.has(range)) {
      return json({ error: 'invalid range' }, 400)
    }

    const cacheKey = new Request(`https://stock-ranges-cache.internal/${symbol}/${range}`)
    return withCache(cache, cacheKey, ctx, async () => {
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

      return json({
        symbol: meta.symbol || symbol,
        name: meta.shortName || meta.longName || meta.symbol || symbol,
        currency: meta.currency || 'USD',
        current: typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1],
        prices,
      })
    })
  },
}
