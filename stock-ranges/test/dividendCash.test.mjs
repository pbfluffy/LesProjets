import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectDividendCash, typicalPayLagSeconds } from '../src/wallet.js'

// Local-time dates (projectDividendCash buckets by the device's calendar month).
const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime() / 1000
const DAY = 86400
const NOW = at(2026, 11, 22)

const quarterly = (lastY, lastM, lastD, amount) => [0, 1, 2, 3].map((i) => ({ date: at(lastY, lastM, lastD) - (3 - i) * 91 * DAY, amount }))
const monthly = (lastY, lastM, lastD, amount) => Array.from({ length: 12 }, (_, i) => ({ date: at(lastY, lastM, lastD) - (11 - i) * 30 * DAY, amount }))

const months = (res) => Object.fromEntries(res.map((m) => [m.month, m.items.map((i) => `${i.symbol}:${i.kind}:${i.dateKind}:${+i.amount.toFixed(2)}`)]))

test('typicalPayLagSeconds is the median XD→pay gap', () => {
  assert.equal(typicalPayLagSeconds([{ exDate: 0, payDate: 21 * DAY }, { exDate: 0, payDate: 20 * DAY }, { exDate: 0, payDate: 30 * DAY }]), 21 * DAY)
  assert.equal(typicalPayLagSeconds([]), null)
  assert.equal(typicalPayLagSeconds(undefined), null)
})

test('already-XD-but-unpaid Nasdaq dividend lands in its pay month; schedule continues after it', () => {
  const MSFT = {
    symbol: 'MSFT', qty: 10, dividends: quarterly(2026, 11, 19, 0.91),
    payments: [
      { exDate: at(2026, 11, 19), payDate: at(2026, 12, 10), amount: 0.98 },
      { exDate: at(2026, 8, 20), payDate: at(2026, 9, 10), amount: 0.91 },
    ],
  }
  const res = projectDividendCash([MSFT], { months: 6, nowSec: NOW })
  assert.deepEqual(res.map((m) => m.month), ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'])
  const m = months(res)
  assert.deepEqual(m['2026-12'], ['MSFT:declared:pay:9.8'])
  // Next XD ≈ Feb 18, + typical 21-day lag → paid in March, at the last Yahoo amount.
  assert.deepEqual(m['2027-03'], ['MSFT:estimated:pay:9.1'])
  assert.deepEqual(m['2026-11'], [])
  assert.deepEqual(m['2027-02'], [])
})

test('non-Nasdaq monthly payer is placed by XD month and marked as such', () => {
  const O = { symbol: 'O', qty: 100, dividends: monthly(2026, 10, 30, 0.27) }
  const res = projectDividendCash([O], { months: 3, nowSec: NOW })
  const m = months(res)
  assert.deepEqual(m['2026-11'], ['O:estimated:xd:27']) // Oct 30 + 30 days = Nov 29, still ahead
  assert.deepEqual(m['2026-12'], ['O:estimated:xd:27'])
  assert.deepEqual(m['2027-01'], ['O:estimated:xd:27'])
})

test('nothing in the past, nothing for holdings without dividends or quantity', () => {
  const res = projectDividendCash([
    { symbol: 'TSLA', qty: 5, dividends: [] },
    { symbol: 'X', qty: 0, dividends: quarterly(2026, 11, 1, 1) },
    { symbol: 'Y', qty: 1, dividends: quarterly(2026, 11, 1, 1), payments: [{ exDate: at(2026, 10, 1), payDate: at(2026, 11, 2), amount: 1 }] },
  ], { months: 2, nowSec: NOW })
  // Y's Nov 2 payment is already paid; its next XD (~Jan 31) is outside the 2-month range.
  assert.deepEqual(res.map((m) => m.items.length), [0, 0])
})
