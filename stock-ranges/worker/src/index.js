// stock-ranges-quotes Worker — public read-only proxy for Yahoo Finance's
// chart API, which does not send CORS headers so the browser can't call it
// directly. The GET routes below have no auth/bindings (only ever forward
// public market data, shared 5-minute edge cache is enough to keep Yahoo
// happy) — but the POST import route calls paid Workers AI inference, so
// unlike those it's rate-limited per IP via a KV binding, same convention
// as majon-photo/trip-planner-generate's external-vision-API routes.
//
// GET /?symbol=AAPL&range=1y   (range: 1d, 7d, 3mo, 6mo, 1y, 2y, or 5y)
//   -> { symbol, name, currency, current, previousClose,
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    current: typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1],
    previousClose,
    prices,
    ohlc,
    timestamps,
    dividends,
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }
    if (request.method === 'POST') {
      return handleImport(request, env)
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

      let body = await resolveQuote(symbol, rangeConfig, params)
      // Conventional NYSE-style share-class notation ("BRK.B", "BF.B") uses
      // a dot; Yahoo's real symbols use a hyphen ("BRK-B", "BF-B"). Retry
      // once with that substitution instead of erroring on a ticker format
      // that's the common, printed-on-the-exchange way to write it.
      if (!body && symbol.includes('.')) {
        body = await resolveQuote(symbol.replace(/\./g, '-'), rangeConfig, params)
      }
      if (!body) {
        return json({ error: 'not found' }, 404)
      }
      return json(body)
    })
  },
}
