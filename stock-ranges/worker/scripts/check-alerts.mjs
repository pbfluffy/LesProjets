// Price-alert check, run on a GitHub Actions schedule (see
// .github/workflows/price-alerts-cron.yml) instead of a Cloudflare Cron
// Trigger — Workers Free caps Cron Trigger CPU at 10ms, nowhere near
// enough for N quote fetches + decile math + push crypto per tick, and
// Paid is $5/mo. Plain Node has no such cap and this repo already has
// free GitHub Actions minutes, so this script does the same job the
// in-Worker `scheduled()` handler used to (see git history) — reading
// the ALERTS KV namespace via Cloudflare's REST API (no Workers binding
// available outside a Worker) and sending pushes with the real `web-push`
// npm package (Node crypto — the Workers-only webcrypto variant isn't
// needed here).
import webpush from 'web-push'
import { getMarketStatus } from '../../src/marketHours.js'
import { computeDeciles } from '../../src/deciles.js'
import { formatPrice } from '../../src/format.js'
import { convert } from '../../src/fx.js'

const ACCOUNT_ID = '53848ae47b2ea39eddb5a90460cf9bb0'
const NAMESPACE_ID = '3a005aaf9deb41e48856476250ecf3f2' // ALERTS — see wrangler.toml
const API_TOKEN = process.env.CF_API_TOKEN
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = 'mailto:pbfluffygaming@gmail.com'

if (!API_TOKEN || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing CF_API_TOKEN / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars')
  process.exit(1)
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}`

async function kvFetch(path, options = {}) {
  return fetch(`${KV_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${API_TOKEN}`, ...options.headers },
  })
}

async function kvListKeys(prefix) {
  const keys = []
  let cursor
  do {
    const qs = `prefix=${encodeURIComponent(prefix)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const res = await kvFetch(`/keys?${qs}`)
    const data = await res.json()
    if (!data.success) throw new Error(`KV list failed: ${JSON.stringify(data.errors)}`)
    keys.push(...data.result.map((k) => k.name))
    cursor = data.result_info?.cursor || null
  } while (cursor)
  return keys
}

async function kvGet(key) {
  const res = await kvFetch(`/values/${encodeURIComponent(key)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`KV get ${key} failed: ${res.status}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function kvPut(key, value) {
  const res = await kvFetch(`/values/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(value),
  })
  if (!res.ok) throw new Error(`KV put ${key} failed: ${res.status}`)
}

async function kvDelete(key) {
  const res = await kvFetch(`/values/${encodeURIComponent(key)}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`KV delete ${key} failed: ${res.status}`)
}

// ---- USD/THB conversion (mirrors src/fx.js's getThbRates, minus the
// localStorage caching — that's a browser-only API, and this script only
// ever needs one fetch per run anyway) ----

async function fetchThbRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/THB')
    const data = await res.json()
    if (!data?.rates) return null
    const map = { THB: 1 }
    for (const [code, rate] of Object.entries(data.rates)) {
      if (typeof rate === 'number' && rate > 0) map[code] = Math.round((1 / rate) * 10000) / 10000
    }
    return map
  } catch {
    return null
  }
}

// ---- quote fetch (mirrors worker/src/quotes.js, minus the Workers-only
// edge cache — this runs every ~15min at most, no need for it here) ----

// Null prototype so a plain truthy lookup (`RANGE_CONFIG[range]`) can't be
// tricked by an inherited key like 'constructor' or 'toString'.
const RANGE_CONFIG = Object.assign(Object.create(null), {
  '1d': { range: '1d', interval: '5m' },
  '7d': { days: 7, interval: '30m' },
  '3mo': { range: '3mo', interval: '1d' },
  '6mo': { range: '6mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '2y': { range: '2y', interval: '1d' },
  '5y': { range: '5y', interval: '1d' },
})

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
  const prices = closes.filter((c) => typeof c === 'number' && Number.isFinite(c))
  if (!prices.length) return null
  return {
    current: typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1],
    prices,
    name: meta.shortName || meta.longName || meta.symbol || symbol,
    currency: meta.currency || 'USD',
  }
}

async function getQuote(symbol, range) {
  const rangeConfig = RANGE_CONFIG[range]
  if (!rangeConfig) return null
  const params = rangeConfig.days
    ? `period1=${Math.floor(Date.now() / 1000) - rangeConfig.days * 86400}&period2=${Math.floor(Date.now() / 1000)}`
    : `range=${rangeConfig.range}`
  let body = await resolveQuote(symbol, rangeConfig, params)
  if (!body && symbol.includes('.')) {
    body = await resolveQuote(symbol.replace(/\./g, '-'), rangeConfig, params)
  }
  return body
}

// ---- alerts KV shape (mirrors worker/src/alerts.js) ----

async function listAllAlerts() {
  const keys = await kvListKeys('alerts:')
  const all = []
  for (const name of keys) {
    const entry = await kvGet(name)
    if (entry) all.push({ uid: name.slice('alerts:'.length), entry })
  }
  return all
}

async function pruneSubscription(uid, endpoint) {
  const key = `alerts:${uid}`
  const entry = await kvGet(key)
  if (!entry) return
  entry.subscriptions = (entry.subscriptions || []).filter((s) => s.endpoint !== endpoint)
  // Only delete when there's truly nothing left to track (matches
  // worker/src/alerts.js's saveOrPrune) — this device's subscription
  // going dead doesn't mean the user's configured symbols should vanish
  // too if another device is still (or was ever) subscribed, or vice
  // versa. `||` here would wipe the whole entry on the first stale
  // device even with real symbols still configured.
  if (!entry.subscriptions.length && !Object.keys(entry.symbols || {}).length) {
    await kvDelete(key)
  } else {
    await kvPut(key, { ...entry, updatedAt: new Date().toISOString() })
  }
}

// Returns 'ok', 'gone' (404/410 — caller should prune this subscription),
// or 'error' (transient — leave the subscription alone).
async function sendPush(subscription, data) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(data), { TTL: 3600, urgency: 'normal' })
    return 'ok'
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) return 'gone'
    console.error('[push] send failed', err.statusCode, err.body)
    return 'error'
  }
}

const BATCH_SIZE = 6
async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

// Ticker's real logo (same free public endpoint TickerLogo.jsx uses) —
// won't resolve for crypto/futures/index symbols, which is fine, a push
// notification just falls back to whatever icon the OS shows for a
// missing image. `tag: symbol` replaces any still-showing notification
// for the same ticker instead of stacking a second one, in case two
// transitions for the same symbol land close together. `targetCurrency`
// is the recipient's own USD/THB display preference (worker/src/alerts.js's
// `entry.currency`) — a conversion failure (rates unavailable, or an
// exotic quote currency open.er-api.com doesn't track) just falls back to
// the quote's native currency, same degrade as the in-app card.
function notificationCopy(symbol, direction, band, quote, targetCurrency, rates) {
  const zone = direction === 'buy' ? 'Buy' : 'Sell'
  const name = quote?.name && quote.name !== symbol ? quote.name : symbol
  const converted = targetCurrency && targetCurrency !== quote?.currency
    ? convert(quote?.current, quote?.currency, targetCurrency, rates)
    : null
  const price = converted !== null
    ? formatPrice(converted, targetCurrency)
    : formatPrice(quote?.current, quote?.currency)
  return {
    title: `${name} entered the ${zone} zone`,
    body: `${price} · Band ${band}/10 · tap to view`,
    icon: `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
    tag: symbol,
    symbol,
  }
}

async function main() {
  if (!getMarketStatus().open) {
    console.log('Market closed — skipping.')
    return
  }

  const allAlerts = await listAllAlerts()
  if (allAlerts.length === 0) {
    console.log('No active alerts.')
    return
  }

  // Fan out: which (symbol, range) pairs actually need checking, and who
  // cares about each — computeDeciles is range-relative, so two users
  // watching the same symbol under different ranges are genuinely
  // different checks.
  const pairs = new Map() // "SYMBOL:range" -> [{ uid, buy, sell }]
  for (const { uid, entry } of allAlerts) {
    for (const [symbol, cfg] of Object.entries(entry.symbols || {})) {
      const key = `${symbol}:${cfg.range}`
      if (!pairs.has(key)) pairs.set(key, [])
      pairs.get(key).push({ uid, buy: !!cfg.buy, sell: !!cfg.sell })
    }
  }
  const subsByUid = new Map(allAlerts.map(({ uid, entry }) => [uid, entry.subscriptions || []]))
  const currencyByUid = new Map(allAlerts.map(({ uid, entry }) => [uid, entry.currency === 'THB' ? 'THB' : 'USD']))
  // One fetch per run, reused for every notification below, regardless of
  // how many pairs/subscribers need it — same rationale as the Worker's
  // getQuote sharing one edge-cache entry across requests.
  const rates = await fetchThbRates()

  const toNotify = [] // { uid, symbol, direction, band, quote }
  await inBatches([...pairs.entries()], BATCH_SIZE, async ([key, subscribers]) => {
    const [symbol, range] = key.split(':')
    const quote = await getQuote(symbol, range).catch(() => null)
    if (!quote) return
    const deciles = computeDeciles({ prices: quote.prices, current: quote.current })
    const signal = deciles?.signal ?? null

    const cacheKey = `signalcache:${key}`
    const prev = await kvGet(cacheKey)
    await kvPut(cacheKey, { signal, ts: Date.now() })

    // No prior state (first time this pair's ever been checked) — seed
    // only, don't fire. Firing here would be a false transition.
    if (!prev) return
    if (prev.signal === signal) return
    if (signal !== 'buy' && signal !== 'sell') return

    for (const sub of subscribers) {
      if (sub[signal]) toNotify.push({ uid: sub.uid, symbol, direction: signal, band: deciles.band, quote })
    }
  })

  console.log(`${toNotify.length} notification(s) to send.`)
  await inBatches(toNotify, BATCH_SIZE, async ({ uid, symbol, direction, band, quote }) => {
    const subscriptions = subsByUid.get(uid) || []
    const payload = notificationCopy(symbol, direction, band, quote, currencyByUid.get(uid), rates)
    await Promise.all(subscriptions.map(async (subscription) => {
      const result = await sendPush(subscription, payload)
      if (result === 'gone') await pruneSubscription(uid, subscription.endpoint)
    }))
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
