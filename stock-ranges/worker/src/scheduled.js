// Cron-triggered handler (see wrangler.toml's [triggers]) — checks every
// symbol:range pair any user has an active alert on, and pushes a
// notification to whoever asked for it when the signal transitions into
// their chosen zone. Cron syntax can't express exact NYSE hours across a
// DST shift, so the [triggers] window is deliberately loose (covers both
// EST and EDT) and getMarketStatus() does the precise gating right here —
// the very first, cheapest check, before touching KV or Yahoo at all.
import { getMarketStatus } from '../../src/marketHours.js'
import { computeDeciles } from '../../src/deciles.js'
import { getQuote } from './quotes.js'
import { listAllAlerts, pruneSubscription } from './alerts.js'
import { sendPush } from './push.js'

const BATCH_SIZE = 6
const SIGNAL_CACHE_PREFIX = 'signalcache:'

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

function notificationCopy(symbol, direction, band) {
  const zone = direction === 'buy' ? 'Buy' : 'Sell'
  return {
    title: `${symbol} entered the ${zone} zone`,
    body: `Band ${band}/10 · tap to view`,
    symbol,
  }
}

export async function runScheduled(env, ctx) {
  if (!getMarketStatus().open) return

  const allAlerts = await listAllAlerts(env)
  if (allAlerts.length === 0) return

  // Fan out: which (symbol, range) pairs actually need checking, and who
  // cares about each — two users watching AAPL under different ranges are
  // genuinely different checks (computeDeciles is range-relative), but
  // two users watching the same symbol+range dedupe to one Yahoo call.
  const pairs = new Map() // "SYMBOL:range" -> [{ uid, buy, sell }]
  for (const { uid, entry } of allAlerts) {
    for (const [symbol, cfg] of Object.entries(entry.symbols || {})) {
      const key = `${symbol}:${cfg.range}`
      if (!pairs.has(key)) pairs.set(key, [])
      pairs.get(key).push({ uid, buy: !!cfg.buy, sell: !!cfg.sell })
    }
  }

  // uid -> subscriptions, for the send step below.
  const subsByUid = new Map(allAlerts.map(({ uid, entry }) => [uid, entry.subscriptions]))

  const toNotify = [] // { uid, payload }
  await inBatches([...pairs.entries()], BATCH_SIZE, async ([key, subscribers]) => {
    const [symbol, range] = key.split(':')
    const quote = await getQuote(symbol, range, ctx).catch(() => null)
    if (!quote) return
    const deciles = computeDeciles({ prices: quote.prices, current: quote.current })
    const signal = deciles?.signal ?? null

    const cacheKey = SIGNAL_CACHE_PREFIX + key
    const prevRaw = await env.ALERTS.get(cacheKey, 'json')
    await env.ALERTS.put(cacheKey, JSON.stringify({ signal, ts: Date.now() }))

    // No prior state (first time this pair's ever been checked) — seed
    // only, don't fire. Firing here would be a false transition, not a
    // real move into the zone.
    if (!prevRaw) return
    if (prevRaw.signal === signal) return
    if (signal !== 'buy' && signal !== 'sell') return

    const payload = notificationCopy(symbol, signal, deciles.band)
    for (const sub of subscribers) {
      if (sub[signal]) toNotify.push({ uid: sub.uid, payload })
    }
  })

  await inBatches(toNotify, BATCH_SIZE, async ({ uid, payload }) => {
    const subscriptions = subsByUid.get(uid) || []
    await Promise.all(subscriptions.map(async (subscription) => {
      const result = await sendPush(env, subscription, payload)
      if (result === 'gone') ctx.waitUntil(pruneSubscription(env, uid, subscription.endpoint))
    }))
  })
}
