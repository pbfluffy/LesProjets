// stock-ranges-quotes Worker — public read-only proxy for Yahoo Finance's
// chart API, which does not send CORS headers so the browser can't call it
// directly. No auth, no bindings: this only ever forwards public market
// data, so unlike majon-photo/trip-planner-generate there's nothing here
// worth gating behind an origin allowlist or a per-user rate limit — a
// shared 5-minute edge cache (below) is enough to keep Yahoo happy.
//
// GET /?symbol=AAPL&range=1y   (range: 1d, 7d, 3mo, 6mo, 1y, 2y, or 5y)
//   -> { symbol, name, currency, current, previousClose,
//        prices: number[], ohlc: [{o,h,l,c}, ...], timestamps: number[] }
//      (previousClose is yesterday's close, for a day-change indicator;
//      ohlc and timestamps are parallel to prices — ohlc for the
//      candlestick view, timestamps (unix seconds) for the axis labels)
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
// '1d'/'7d' need intraday candles (a single day's worth of daily closes is
// one point, not a range) — Yahoo's `range` enum has '1d' but not '7d', so
// 7d goes through explicit period1/period2 instead. Everything 3mo+ keeps
// using daily closes via the plain `range` param, unchanged.
const RANGE_CONFIG = {
  '1d': { range: '1d', interval: '5m' },
  '7d': { days: 7, interval: '30m' },
  '3mo': { range: '3mo', interval: '1d' },
  '6mo': { range: '6mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '2y': { range: '2y', interval: '1d' },
  '5y': { range: '5y', interval: '1d' },
}
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
    const rangeConfig = RANGE_CONFIG[range]
    if (!rangeConfig) {
      return json({ error: 'invalid range' }, 400)
    }

    const cacheKey = new Request(`https://stock-ranges-cache.internal/${symbol}/${range}`)
    return withCache(cache, cacheKey, ctx, async () => {
      const params = rangeConfig.days
        ? `period1=${Math.floor(Date.now() / 1000) - rangeConfig.days * 86400}&period2=${Math.floor(Date.now() / 1000)}`
        : `range=${rangeConfig.range}`
      let upstream
      try {
        upstream = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}&interval=${rangeConfig.interval}`,
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
      const quote = result?.indicators?.quote?.[0]
      const closes = quote?.close
      if (!meta || !Array.isArray(closes)) {
        return json({ error: 'not found' }, 404)
      }

      // ohlc/timestamps are built alongside prices (not filtered
      // independently) so all three stay index-aligned — a candle without
      // its own open/high/low falls back to its close rather than creating
      // a gap.
      const opens = quote?.open || []
      const highs = quote?.high || []
      const lows = quote?.low || []
      const rawTimestamps = result?.timestamp || []
      const prices = []
      const ohlc = []
      const timestamps = []
      for (let i = 0; i < closes.length; i++) {
        const c = closes[i]
        if (typeof c !== 'number' || !Number.isFinite(c)) continue
        prices.push(c)
        ohlc.push({
          o: typeof opens[i] === 'number' ? opens[i] : c,
          h: typeof highs[i] === 'number' ? highs[i] : c,
          l: typeof lows[i] === 'number' ? lows[i] : c,
          c,
        })
        timestamps.push(typeof rawTimestamps[i] === 'number' ? rawTimestamps[i] : null)
      }
      if (!prices.length) {
        return json({ error: 'not found' }, 404)
      }

      // meta.chartPreviousClose is the close *before the whole requested
      // range* (a year ago for range=1y, last week for period-based 7d),
      // not yesterday's close — not useful for a day-change indicator.
      // meta.previousClose (only present for intraday requests like 1d/7d)
      // is the real yesterday's close, so prefer it when Yahoo provides it.
      // For the daily-interval ranges (3mo+) it's absent, so fall back to
      // the prices array's second-to-last entry — the last entry tracks
      // today's live price during market hours, so the one before it is
      // the actual most recent prior trading day's close.
      const previousClose = typeof meta.previousClose === 'number'
        ? meta.previousClose
        : (prices.length > 1 ? prices[prices.length - 2] : null)

      return json({
        symbol: meta.symbol || symbol,
        name: meta.shortName || meta.longName || meta.symbol || symbol,
        currency: meta.currency || 'USD',
        current: typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1],
        previousClose,
        prices,
        ohlc,
        timestamps,
      })
    })
  },
}
