import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSectorDrift } from '../src/wallet.js'
import { computeRealizedPL, summarizeRealized, MAX_SELLS } from '../src/realized.js'

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)

// fx.js rates are THB per one unit of the currency.
const RATES = { USD: 35, THB: 1 }
const SELL = { qty: 10, price: 150, currency: 'USD', avgCost: 100, costCurrency: 'USD', date: '2026-03-01' }

test('realized P/L: gain, loss and percent in the sale currency', () => {
  const gain = computeRealizedPL(SELL, 'USD', RATES)
  near(gain.pl, 500)
  near(gain.plPercent, 50)
  near(computeRealizedPL({ ...SELL, price: 80 }, 'USD', RATES).pl, -200)
})

test('realized P/L converts both sides to the display currency', () => {
  near(computeRealizedPL({ ...SELL, price: 3500, currency: 'THB' }, 'USD', RATES).pl, 0) // 3500 THB == 100 USD
  near(computeRealizedPL(SELL, 'THB', RATES).pl, 17500)
})

test('realized P/L is null when a rate is missing or the entry is unusable', () => {
  assert.equal(computeRealizedPL({ ...SELL, currency: 'EUR' }, 'USD', RATES), null)
  assert.equal(computeRealizedPL(null, 'USD', RATES), null)
  assert.equal(computeRealizedPL({ ...SELL, qty: '10' }, 'USD', RATES), null)
})

test('realized summary splits by calendar year and counts unconvertible sales as skipped', () => {
  const now = new Date('2026-11-11T00:00:00')
  const s = summarizeRealized(
    [SELL, { ...SELL, date: '2025-12-31', price: 200 }, { ...SELL, currency: 'EUR' }],
    'USD', RATES, now,
  )
  near(s.total, 1500)
  near(s.thisYear, 500)
  assert.equal(s.skipped, 1)
  assert.equal(s.count, 3)
})

test('the sales log cap matches the firestore.rules bound', () => {
  assert.equal(MAX_SELLS, 500)
})

test('sector drift: over/under weight and the amount to trim or add', () => {
  const rows = computeSectorDrift([{ key: 'Technology', value: 600 }, { key: 'Energy', value: 400 }], 1000, { Technology: 50, Healthcare: 20 })
  const by = Object.fromEntries(rows.map((r) => [r.key, r]))
  near(by.Technology.driftPct, 10)
  near(by.Technology.amount, -100) // trim 100
  near(by.Healthcare.currentPct, 0)
  near(by.Healthcare.amount, 200) // add 200 to a sector with a target but no holdings
  assert.equal(by.Energy.targetPct, null)
  assert.equal(by.Energy.amount, null)
})

test('sector drift ignores bad or zero targets and survives a zero total', () => {
  const items = [{ key: 'Technology', value: 600 }, { key: 'Energy', value: 400 }]
  assert.ok(computeSectorDrift(items, 1000, { Technology: 'x', Energy: 0 }).every((r) => r.targetPct === null))
  assert.equal(computeSectorDrift(items, 1000, null).length, 2)
  assert.equal(computeSectorDrift(items, 0, { Technology: 50 })[0].currentPct, 0)
})
