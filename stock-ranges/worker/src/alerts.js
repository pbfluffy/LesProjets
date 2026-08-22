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
  return raw && typeof raw === 'object' ? raw : { symbols: {}, subscriptions: [] }
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
export async function upsertSubscription(env, uid, subscription) {
  if (!subscription || typeof subscription.endpoint !== 'string' || !subscription.keys) return false
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
export async function setAlert(env, uid, { symbol, buy, sell, range }) {
  if (typeof symbol !== 'string' || !SYMBOL_RE.test(symbol)) return false
  if (!RANGE_CONFIG[range]) return false
  const entry = await getAlerts(env, uid)
  if (!buy && !sell) {
    delete entry.symbols[symbol]
  } else {
    if (!(symbol in entry.symbols) && Object.keys(entry.symbols).length >= MAX_SYMBOLS) return false
    entry.symbols[symbol] = { buy: !!buy, sell: !!sell, range }
  }
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
