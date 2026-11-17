import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { runPortfolioChecks } from '../worker/scripts/portfolio-checks.mjs'

// The checker reads "now" at call time, so a settable clock makes the
// today/next-trading-day logic deterministic. node --test runs each file in its
// own process, so replacing Date here cannot leak into other test files.
const RealDate = Date
let now
beforeEach(() => {
  globalThis.Date = class extends RealDate {
    constructor(...a) { super(...(a.length ? a : [now])) }
    static now() { return now }
  }
})
afterEach(() => { globalThis.Date = RealDate })

const FRIDAY = RealDate.parse('2026-11-13T15:00:00Z')
const TUESDAY = RealDate.parse('2026-11-17T15:00:00Z')
const row = (symbol, time = 'time-pre-market', eps = '$1.52') => ({ symbol, time, epsForecast: eps })

function calendar(byDate, { fail = false } = {}) {
  const calls = []
  globalThis.fetch = async (url) => {
    const d = new URL(url).searchParams.get('date')
    calls.push(d)
    if (fail) return { ok: false, status: 403 }
    return { ok: true, status: 200, json: async () => ({ data: { rows: byDate[d] || [] } }) }
  }
  return calls
}

function harness({ earnings = true, lang = 'en', holdings } = {}) {
  const kv = new Map()
  kv.set('portfolio:u1', {
    lang, currency: 'USD', prefs: { earnings },
    holdings: holdings || {
      AAPL: { qty: 1, avgCost: 100, costCurrency: 'USD' },
      'BRK-B': { qty: 1, avgCost: 100, costCurrency: 'USD' },
      'PTT.BK': { qty: 1, avgCost: 30, costCurrency: 'THB' },
      'BTC-USD': { qty: 1, avgCost: 1, costCurrency: 'USD' },
    },
  })
  kv.set('alerts:u1', { subscriptions: [{ endpoint: 'e1' }] })
  const pushes = []
  const history = []
  const deps = {
    kvListKeys: async (p) => [...kv.keys()].filter((k) => k.startsWith(p)),
    kvGet: async (k) => (kv.has(k) ? JSON.parse(JSON.stringify(kv.get(k))) : null),
    kvPut: async (k, v) => { kv.set(k, v) },
    sendPush: async (_sub, payload) => { pushes.push(payload); return 'ok' },
    pruneSubscription: async () => {},
    addHistory: async (_uid, items) => { history.push(...items) },
    getQuote: async (sym) => ({ symbol: sym, name: sym === 'AAPL' ? 'Apple Inc.' : sym, current: 100, currency: 'USD', prices: [], dividends: [] }),
    inBatches: async (arr, _n, fn) => { for (const a of arr) await fn(a) },
    rates: { USD: 35, THB: 1 },
    marketOpen: {},
  }
  return { deps, pushes, history }
}

const quiet = async (fn) => {
  const log = console.log
  console.log = () => {}
  try { return await fn() } finally { console.log = log }
}

test('Tuesday: reminds about today (class share) and tomorrow, skipping foreign/crypto symbols', async () => {
  now = TUESDAY
  calendar({ '2026-11-17': [row('BRK/B', 'time-after-hours', '$4.10')], '2026-11-18': [row('AAPL'), row('ABCL')] })
  const h = harness()
  await quiet(() => runPortfolioChecks(h.deps))
  assert.equal(h.pushes.length, 2)
  const titles = h.pushes.map((p) => p.title).sort()
  assert.deepEqual(titles, ['Apple Inc. reports earnings tomorrow', 'BRK-B reports earnings today'])
  const aapl = h.pushes.find((p) => p.symbol === 'AAPL')
  assert.match(aapl.body, /before the market opens/)
  assert.match(aapl.body, /\$1\.52/)
  assert.ok(h.history.every((i) => i.kind === 'earnings'))
})

// Regression: a Friday run used to look only at Saturday, so Monday reporters
// were only announced on Monday itself.
test('Friday: a Monday reporter is announced now, with its date', async () => {
  now = FRIDAY
  calendar({ '2026-11-16': [row('AAPL')] })
  const h = harness()
  await quiet(() => runPortfolioChecks(h.deps))
  assert.equal(h.pushes.length, 1)
  assert.match(h.pushes[0].title, /reports earnings on 16 Nov/)
  assert.doesNotMatch(h.pushes[0].title, /tomorrow/)
})

test('Thai copy is used for Thai portfolios', async () => {
  now = FRIDAY
  calendar({ '2026-11-16': [row('AAPL')] })
  const h = harness({ lang: 'th' })
  await quiet(() => runPortfolioChecks(h.deps))
  assert.match(h.pushes[0].title, /ประกาศงบวันที่/)
})

test('a second run is deduplicated and reuses the cached calendar', async () => {
  now = TUESDAY
  const calls = calendar({ '2026-11-18': [row('AAPL')] })
  const h = harness()
  await quiet(() => runPortfolioChecks(h.deps))
  assert.equal(calls.length, 2)
  await quiet(() => runPortfolioChecks(h.deps))
  assert.equal(h.pushes.length, 1)
  assert.equal(calls.length, 2, 'cached for the next hourly run')
})

test('the calendar is refetched once the cache is older than 6 hours', async () => {
  now = TUESDAY
  const calls = calendar({ '2026-11-18': [row('AAPL')] })
  const h = harness()
  await quiet(() => runPortfolioChecks(h.deps))
  now = TUESDAY + 7 * 3600e3 // still Tuesday evening in New York
  await quiet(() => runPortfolioChecks(h.deps))
  assert.equal(calls.length, 4)
})

test('with the preference off nothing is fetched or sent', async () => {
  now = TUESDAY
  const calls = calendar({ '2026-11-18': [row('AAPL')] })
  const h = harness({ earnings: false })
  await quiet(() => runPortfolioChecks(h.deps))
  assert.equal(calls.length, 0)
  assert.equal(h.pushes.length, 0)
})

test('a blocked calendar (403) fails soft: no throw, no push', async () => {
  now = TUESDAY
  calendar({}, { fail: true })
  const h = harness()
  await quiet(() => runPortfolioChecks(h.deps))
  assert.equal(h.pushes.length, 0)
})
