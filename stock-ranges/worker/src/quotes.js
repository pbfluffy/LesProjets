// Quote fetching + the shared edge cache, split out from index.js so both
// the GET request handler and the cron-triggered scheduled handler
// (scheduled.js) can use the exact same cache-aware path without either
// importing from the other — index.js imports scheduled.js (to wire up
// the `scheduled` export), so scheduled.js importing back from index.js
// would be a circular import.
import { RANGE_CONFIG } from './constants.js'

const CACHE_TTL_SECONDS = 5 * 60

// Fetches + parses one symbol's chart data, or returns null on any failure
// (network error, 404, no usable price series) so the caller can decide
// whether to retry with a different symbol spelling.
async function resolveQuote(symbol, rangeConfig, params) {
  let upstream
  try {
    upstream = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}&interval=${rangeConfig.interval}&events=div`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; stock-ranges/1.0)' } },
    )
  } catch {
    return null
  }
  if (!upstream.ok) return null

  const data = await upstream.json().catch(() => null)
  const result = data?.chart?.result?.[0]
  const meta = result?.meta
  const quote = result?.indicators?.quote?.[0]
  const closes = quote?.close
  if (!meta || !Array.isArray(closes)) return null

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
  if (!prices.length) return null

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

  // Yahoo returns dividends as an object keyed by unix-second timestamp
  // (only present when the symbol has paid any within the requested
  // range) — flatten to an array, oldest first, for the wallet's
  // income-by-period math.
  const rawDividends = result?.events?.dividends
  const dividends = rawDividends
    ? Object.values(rawDividends)
        .filter((d) => typeof d?.amount === 'number' && typeof d?.date === 'number')
        .map((d) => ({ date: d.date, amount: d.amount }))
        .sort((a, b) => a.date - b.date)
    : []

  return {
    symbol: meta.symbol || symbol,
    name: meta.shortName || meta.longName || meta.symbol || symbol,
    currency: meta.currency || 'USD',
    // e.g. EQUITY, ETF, CRYPTOCURRENCY, FUTURE, INDEX, MUTUALFUND — used by
    // the wallet to group holdings into Common Stock / ETF / Other.
    instrumentType: meta.instrumentType || null,
    current: typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1],
    previousClose,
    prices,
    ohlc,
    timestamps,
    dividends,
  }
}

// Cache-aware quote lookup keyed by symbol+range, shared by the GET
// handler (wraps this in a Response) and the cron handler (consumes the
// parsed object directly) — the cron piggybacks on the same edge cache
// real user traffic already warms instead of doubling Yahoo calls.
// Returns the parsed quote object, or null if the symbol/range can't be
// resolved at all.
export async function getQuote(symbol, range, ctx) {
  const rangeConfig = RANGE_CONFIG[range]
  if (!rangeConfig) return null

  const cache = caches.default
  const cacheKey = new Request(`https://stock-ranges-cache.internal/${symbol}/${range}`)
  const cached = await cache.match(cacheKey)
  if (cached) return cached.json()

  const params = rangeConfig.days
    ? `period1=${Math.floor(Date.now() / 1000) - rangeConfig.days * 86400}&period2=${Math.floor(Date.now() / 1000)}`
    : `range=${rangeConfig.range}`

  let body = await resolveQuote(symbol, rangeConfig, params)
  // Conventional NYSE-style share-class notation ("BRK.B", "BF.B") uses a
  // dot; Yahoo's real symbols use a hyphen ("BRK-B", "BF-B"). Retry once
  // with that substitution instead of erroring on a ticker format that's
  // the common, printed-on-the-exchange way to write it.
  if (!body && symbol.includes('.')) {
    body = await resolveQuote(symbol.replace(/\./g, '-'), rangeConfig, params)
  }
  if (!body) return null

  const response = new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
  })
  ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return body
}
