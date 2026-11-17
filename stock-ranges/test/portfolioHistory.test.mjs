import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  flowAdjustedSeries, estimateFlow, alignIndexSeries, snapshotSeconds,
  benchmarkRangeFor, mergePortfolioHistories, todayKey,
} from '../src/portfolioHistory.js'

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`)
const T = (iso) => Date.parse(iso) / 1000

test('a buy does not move the index', () => {
  const s = flowAdjustedSeries([
    { date: 'a', marketValue: 1000, costBasis: 1000 },
    { date: 'b', marketValue: 2000, costBasis: 2000 },
  ])
  near(s[1].index, 100)
})

test('a +10% market day with no flow moves the index +10%', () => {
  const s = flowAdjustedSeries([
    { date: 'a', marketValue: 1000, costBasis: 1000 },
    { date: 'b', marketValue: 1100, costBasis: 1000 },
  ])
  near(s[1].index, 110)
})

// Regression: a sale used to be booked as outflow = cost removed, so selling
// half of a +100% position on a flat day showed 71.43 (a fake loss equal to the
// unrealized gain). What leaves is the sold shares' market value.
test('selling half of a winner on a flat day leaves the index at 100', () => {
  const s = flowAdjustedSeries([
    { date: 'a', marketValue: 1000, costBasis: 500 },
    { date: 'b', marketValue: 500, costBasis: 250 },
  ])
  near(s[1].index, 100)
})

test('selling half of a loser on a flat day leaves the index at 100', () => {
  const s = flowAdjustedSeries([
    { date: 'a', marketValue: 500, costBasis: 1000 },
    { date: 'b', marketValue: 250, costBasis: 500 },
  ])
  near(s[1].index, 100)
})

test('a sale plus a +10% move on the remainder is a gain, not a loss', () => {
  const s = flowAdjustedSeries([
    { date: 'a', marketValue: 1000, costBasis: 500 },
    { date: 'b', marketValue: 550, costBasis: 250 },
  ])
  assert.ok(s[1].index > 100 && s[1].index < 112, String(s[1].index))
})

test('selling everything keeps the index finite and positive', () => {
  const s = flowAdjustedSeries([
    { date: 'a', marketValue: 1000, costBasis: 500 },
    { date: 'b', marketValue: 0, costBasis: 0 },
  ])
  assert.ok(Number.isFinite(s[1].index) && s[1].index > 0)
})

test('an empty start holds flat and the chain resumes afterwards', () => {
  const s = flowAdjustedSeries([
    { date: 'a', marketValue: 0, costBasis: 0 },
    { date: 'b', marketValue: 500, costBasis: 500 },
    { date: 'c', marketValue: 550, costBasis: 500 },
  ])
  near(s[1].index, 100)
  near(s[2].index, 110)
})

test('a missing cost basis means no flow', () => {
  const s = flowAdjustedSeries([{ date: 'a', marketValue: 1000 }, { date: 'b', marketValue: 1100 }])
  near(s[1].index, 110)
})

test('estimateFlow: buys use the extra cost, sales use the sold fraction of market value', () => {
  near(estimateFlow({ marketValue: 1000, costBasis: 500 }, { costBasis: 700 }), 200)
  near(estimateFlow({ marketValue: 1000, costBasis: 500 }, { costBasis: 250 }), -500)
  near(estimateFlow({ marketValue: 1000, costBasis: 500 }, { costBasis: 0 }), -1000)
  assert.equal(estimateFlow({ marketValue: 1000 }, { costBasis: 1 }), 0)
})

// Regression: the date key is the device's local day. A 10:00 Bangkok snapshot
// (03:00Z) is still priced at the previous US close and must not see that
// calendar day's US bar.
test('Bangkok-morning snapshots take the previous US close', () => {
  const ts = [T('2026-11-13T14:30:00Z'), T('2026-11-16T14:30:00Z'), T('2026-11-17T14:30:00Z')]
  const px = [100, 110, 121]
  const a = alignIndexSeries(ts, px, [T('2026-11-16T03:00:00Z'), T('2026-11-17T03:00:00Z')])
  near(a[0], 100) // Mon morning -> Fri close, rebased
  near(a[1], 110) // Tue morning -> Mon close
})

test('a snapshot after the close sees that day', () => {
  const ts = [T('2026-11-13T14:30:00Z'), T('2026-11-16T14:30:00Z'), T('2026-11-17T14:30:00Z')]
  const a = alignIndexSeries(ts, [100, 110, 121], [T('2026-11-16T03:00:00Z'), T('2026-11-17T22:00:00Z')])
  near(a[1], 121)
})

test('weekends reuse Friday; a cutoff before the first bar is null and rebasing starts at the first value', () => {
  const ts = [T('2026-11-13T14:30:00Z'), T('2026-11-16T14:30:00Z')]
  const a = alignIndexSeries(ts, [100, 120], [T('2026-11-12T00:00:00Z'), T('2026-11-14T22:00:00Z'), T('2026-11-15T22:00:00Z'), T('2026-11-16T22:00:00Z')])
  assert.equal(a[0], null)
  near(a[1], 100)
  near(a[2], 100)
  near(a[3], 120)
})

test('non-monotonic and invalid cutoffs, and bars with null timestamps, are handled', () => {
  const ts = [T('2026-11-13T14:30:00Z'), null, T('2026-11-17T14:30:00Z')]
  const a = alignIndexSeries(ts, [100, 105, 121], [T('2026-11-17T22:00:00Z'), T('2026-11-13T22:00:00Z'), NaN])
  near(a[0], 100) // first available point is the base, even though it is listed first
  near(a[1], (100 / 121) * 100)
  assert.equal(a[2], null)
})

test('snapshotSeconds prefers updatedAt and falls back to the end of the date', () => {
  near(snapshotSeconds({ date: '2026-11-17', updatedAt: 1700000000000 }), 1700000000)
  near(snapshotSeconds({ date: '2026-11-17' }), T('2026-11-17T23:59:59Z'))
})

test('benchmarkRangeFor picks the smallest range that covers the history', () => {
  const now = new Date('2026-11-11T00:00:00Z')
  assert.equal(benchmarkRangeFor('2026-10-01', now), '3mo')
  assert.equal(benchmarkRangeFor('2026-06-15', now), '6mo')
  assert.equal(benchmarkRangeFor('2025-12-01', now), '1y')
  assert.equal(benchmarkRangeFor('2025-02-01', now), '2y')
  assert.equal(benchmarkRangeFor('2023-01-01', now), '5y')
})

test('mergePortfolioHistories keeps the most recently written entry per date', () => {
  const merged = mergePortfolioHistories(
    [{ date: '2026-11-01', marketValue: 1, updatedAt: 10 }, { date: '2026-11-03', marketValue: 3, updatedAt: 10 }],
    [{ date: '2026-11-01', marketValue: 2, updatedAt: 20 }, { date: '2026-11-02', marketValue: 5, updatedAt: 5 }],
  )
  assert.deepEqual(merged.map((e) => [e.date, e.marketValue]), [['2026-11-01', 2], ['2026-11-02', 5], ['2026-11-03', 3]])
})

test('todayKey is the device-local calendar day, zero-padded', () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  assert.equal(todayKey(), `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/)
})
