// Per-user alert config lives in one KV entry each — subscriptions (per
// device) and which symbols/directions/lookback-range they want notified
// on. This is the Worker's own store, separate from and never read from
// the client's Firestore doc — the cron job needs to cheaply enumerate
// every user's config (`env.ALERTS.list({prefix:'alerts:'})`), which is
// simple against KV and would need a service-account OAuth2 flow against
// Firestore's REST API for no real benefit here.
import { SYMBOL_RE, RANGE_CONFIG } from './constants.js'

const MAX_SYMBOLS = 100
const MAX_SUBSCRIPTIONS = 5

function alertsKey(uid) {
  return `alerts:${uid}`
}

export async function getAlerts(env, uid) {
  const raw = await env.ALERTS.get(alertsKey(uid), 'json')
  return raw && typeof raw === 'object' ? raw : { symbols: {}, subscriptions: [], currency: 'USD', lang: 'en' }
}

async function saveOrPrune(env, uid, entry) {
  const hasSymbols = Object.keys(entry.symbols).length > 0
  const hasSubs = entry.subscriptions.length > 0
  // Only delete when there's truly nothing left to track — subscribing and
  // setting a symbol are two separate client calls (upsertSubscription then
  // setAlert), so right after the first one on a brand-new account, exactly
  // one of these lists is legitimately still empty. Deleting on that alone
  // (the old `||` here) meant the second call read back an already-wiped
  // entry and got wiped again in turn — nothing ever survived a first-ever
  // alert. `&&` still cleans up the real "removed my last alert and
  // unsubscribed" case, just not this transient one.
  if (!hasSymbols && !hasSubs) {
    await env.ALERTS.delete(alertsKey(uid))
    return
  }
  await env.ALERTS.put(alertsKey(uid), JSON.stringify({ ...entry, updatedAt: new Date().toISOString() }))
}

// Adds/replaces one device's push subscription (idempotent by endpoint —
// re-subscribing the same device just refreshes its keys/timestamp).
// p256dh/auth are checked as actual non-empty strings, not just "keys is
// truthy" — a subscription missing either would still get accepted here,
// then fail every future push inside web-push's own validation before any
// network call, so the thrown error has no HTTP status to classify as
// "gone" and the dead subscription would never get pruned, just retried
// forever on every cron tick.
export async function upsertSubscription(env, uid, subscription) {
  if (
    !subscription ||
    typeof subscription.endpoint !== 'string' ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== 'string' || !subscription.keys.p256dh ||
    typeof subscription.keys.auth !== 'string' || !subscription.keys.auth
  ) return false
  const entry = await getAlerts(env, uid)
  const next = entry.subscriptions.filter((s) => s.endpoint !== subscription.endpoint)
  next.push({
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    addedAt: new Date().toISOString(),
  })
  entry.subscriptions = next.slice(-MAX_SUBSCRIPTIONS)
  await saveOrPrune(env, uid, entry)
  return true
}

// Sets (or clears, if both directions end up false) one symbol's alert
// config. `range` is captured here rather than always read live from the
// user's current UI — computeDeciles is range-relative, so the cron check
// has to reproduce whichever lookback the user actually had in mind.
// `currency`/`lang` are the app's global USD/THB and EN/TH toggles,
// mirrored here so the cron can format the notification the same way the
// user has the app itself displayed — both are user-level preferences,
// not per-symbol, so every call just re-stamps them on the whole entry.
export async function setAlert(env, uid, { symbol, buy, sell, range, currency, lang }) {
  if (typeof symbol !== 'string' || !SYMBOL_RE.test(symbol)) return false
  if (!RANGE_CONFIG[range]) return false
  const entry = await getAlerts(env, uid)
  if (!buy && !sell) {
    delete entry.symbols[symbol]
  } else {
    if (!(symbol in entry.symbols) && Object.keys(entry.symbols).length >= MAX_SYMBOLS) return false
    entry.symbols[symbol] = { buy: !!buy, sell: !!sell, range }
  }
  entry.currency = currency === 'THB' ? 'THB' : 'USD'
  entry.lang = lang === 'th' ? 'th' : 'en'
  await saveOrPrune(env, uid, entry)
  return true
}

// Drops a dead subscription (404/410 from the push service) from whichever
// user owns it — called during the cron sweep, not by the client.
export async function pruneSubscription(env, uid, endpoint) {
  const entry = await getAlerts(env, uid)
  entry.subscriptions = entry.subscriptions.filter((s) => s.endpoint !== endpoint)
  await saveOrPrune(env, uid, entry)
}

// Lists every user's alert config — paginated defensively via KV's cursor,
// though a personal-scale deployment won't come close to the 1000-key page.
export async function listAllAlerts(env) {
  const all = []
  let cursor
  do {
    const page = await env.ALERTS.list({ prefix: 'alerts:', cursor })
    for (const key of page.keys) {
      const uid = key.name.slice('alerts:'.length)
      const entry = await env.ALERTS.get(key.name, 'json')
      if (entry) all.push({ uid, entry })
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return all
}

// ---- notification history (shown in the app's Notifications panel) ----
// One KV entry per user, newest first, capped. Written here for test pushes
// and by scripts/check-alerts.mjs (via the KV REST API) for real buy/sell
// alerts — keep the item shape in sync with that script.
const HISTORY_LIMIT = 50

function historyKey(uid) {
  return `history:${uid}`
}

export async function getHistory(env, uid) {
  const raw = await env.ALERTS.get(historyKey(uid), 'json')
  return Array.isArray(raw) ? raw : []
}

export async function addHistory(env, uid, item) {
  const list = await getHistory(env, uid)
  list.unshift(item)
  await env.ALERTS.put(historyKey(uid), JSON.stringify(list.slice(0, HISTORY_LIMIT)))
}

// ---- portfolio (for the scheduled job's wallet notifications) ----
// `portfolio:{uid}` mirrors the user's wallet holdings plus their wallet
// notification settings, so scripts/check-alerts.mjs (which only reads KV)
// can send cost alerts, ex-dividend reminders, the weekly summary, and
// record a daily portfolio value. The app re-sends it whenever holdings or
// settings change; the holdings themselves still live in Firestore.
const MAX_HOLDINGS = 200

function portfolioKey(uid) {
  return `portfolio:${uid}`
}

export async function getPortfolio(env, uid) {
  const raw = await env.ALERTS.get(portfolioKey(uid), 'json')
  return raw && typeof raw === 'object' ? raw : null
}

export async function setPortfolio(env, uid, body) {
  const src = body?.holdings
  if (!src || typeof src !== 'object' || Array.isArray(src)) return false
  // A holding that fails validation is skipped, not the whole wallet —
  // one odd entry used to silently stop every wallet notification.
  const entries = Object.entries(src).slice(0, MAX_HOLDINGS)
  const holdings = {}
  for (const [symbol, h] of entries) {
    if (!SYMBOL_RE.test(symbol) || !h || typeof h !== 'object') continue
    const qty = Number(h.qty)
    const avgCost = Number(h.avgCost)
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(avgCost) || avgCost < 0) continue
    const costCurrency = typeof h.costCurrency === 'string' && /^[A-Z]{3}$/.test(h.costCurrency) ? h.costCurrency : 'USD'
    holdings[symbol] = {
      qty, avgCost, costCurrency,
      costAlerts: { below: !!h.costAlerts?.below, gain: !!h.costAlerts?.gain },
    }
  }
  const prefs = { exDividend: !!body.prefs?.exDividend, weekly: !!body.prefs?.weekly }
  const hasAnything = Object.keys(holdings).length > 0 || prefs.exDividend || prefs.weekly
  if (!hasAnything) {
    await env.ALERTS.delete(portfolioKey(uid))
    return true
  }
  await env.ALERTS.put(portfolioKey(uid), JSON.stringify({
    holdings, prefs,
    currency: body.currency === 'THB' ? 'THB' : 'USD',
    lang: body.lang === 'th' ? 'th' : 'en',
    updatedAt: new Date().toISOString(),
  }))
  return true
}

// Daily portfolio value written by the scheduled job (`pfhistory:{uid}`,
// { 'YYYY-MM-DD': { marketValue, costBasis, currency, updatedAt } }), merged
// into the app's own chart history.
export async function getPortfolioHistory(env, uid) {
  const raw = await env.ALERTS.get(`pfhistory:${uid}`, 'json')
  return raw && typeof raw === 'object' ? raw : {}
}
