import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseNasdaqDividends, parseUsDate, isNasdaqCandidate, getDividendDates } from '../worker/src/dividends.js'
import { findPayment, nextDeclaredPayment } from '../src/wallet.js'

const day = (y, m, d) => Date.UTC(y, m - 1, d) / 1000

// Shape of api.nasdaq.com/api/quote/MSFT/dividends (trimmed).
const MSFT = {
  data: {
    dividends: {
      rows: [
        { exOrEffDate: '11/19/2026', type: 'Cash', amount: '$0.98', recordDate: '11/19/2026', paymentDate: '12/10/2026' },
        { exOrEffDate: '08/20/2026', type: 'Cash', amount: '$0.91', recordDate: '08/20/2026', paymentDate: '09/10/2026' },
        { exOrEffDate: '05/21/2026', type: 'Stock', amount: '5%', paymentDate: '06/11/2026' },
        { exOrEffDate: 'N/A', type: 'Cash', amount: '$0.50', paymentDate: '01/01/2026' },
      ],
    },
  },
}

test('parseUsDate reads MM/DD/YYYY as UTC midnight', () => {
  assert.equal(parseUsDate('11/19/2026'), day(2026, 11, 19))
  assert.equal(parseUsDate('N/A'), null)
  assert.equal(parseUsDate(undefined), null)
})

test('parseNasdaqDividends keeps cash rows with both dates, newest first', () => {
  assert.deepEqual(parseNasdaqDividends(MSFT), [
    { exDate: day(2026, 11, 19), payDate: day(2026, 12, 10), amount: 0.98 },
    { exDate: day(2026, 8, 20), payDate: day(2026, 9, 10), amount: 0.91 },
  ])
  assert.deepEqual(parseNasdaqDividends({ data: { dividends: { rows: null } } }), [])
  assert.deepEqual(parseNasdaqDividends(null), [])
})

test('isNasdaqCandidate: plain US tickers only', () => {
  assert.ok(isNasdaqCandidate('AAPL'))
  assert.ok(!isNasdaqCandidate('PTT.BK'))
  assert.ok(!isNasdaqCandidate('GC=F'))
  assert.ok(!isNasdaqCandidate('BRK-B'))
})

test('getDividendDates tries stocks then etf, and returns empty (not an error) otherwise', async () => {
  const calls = []
  const fetchFn = async (url) => {
    calls.push(url)
    if (url.includes('assetclass=etf')) return { ok: true, json: async () => MSFT }
    return { ok: true, json: async () => ({ data: { dividends: { rows: null } } }) }
  }
  const qqq = await getDividendDates('QQQ', fetchFn)
  assert.equal(qqq.source, 'nasdaq')
  assert.equal(qqq.payments.length, 2)
  assert.deepEqual(calls.map((u) => u.split('assetclass=')[1]), ['stocks', 'etf'])

  calls.length = 0
  assert.deepEqual(await getDividendDates('PTT.BK', fetchFn), { symbol: 'PTT.BK', source: null, payments: [] })
  assert.equal(calls.length, 0) // not even asked

  const down = await getDividendDates('KO', async () => { throw new Error('blocked') })
  assert.deepEqual(down, { symbol: 'KO', source: null, payments: [] })
})

test('findPayment matches a Yahoo ex-date (market-open timestamp) to the Nasdaq row', () => {
  const payments = parseNasdaqDividends(MSFT)
  const yahooEx = day(2026, 8, 20) + 13.5 * 3600 // 13:30 UTC, the US open
  assert.equal(findPayment(payments, yahooEx).payDate, day(2026, 9, 10))
  assert.equal(findPayment(payments, day(2026, 7, 1)), null)
  assert.equal(findPayment(null, yahooEx), null)
})

test('nextDeclaredPayment is the nearest dividend whose ex-date is still ahead', () => {
  const payments = parseNasdaqDividends(MSFT)
  assert.equal(nextDeclaredPayment(payments, day(2026, 11, 1)).payDate, day(2026, 12, 10))
  assert.equal(nextDeclaredPayment(payments, day(2026, 11, 20)), null) // already XD
  assert.equal(nextDeclaredPayment(undefined), null)
})
