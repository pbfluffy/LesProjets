import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  symbolKey, isUsCalendarSymbol, usEasternDates, usEasternMinutes, reportAlreadyOut,
  parseEarningsRows, matchEarnings, fetchEarningsDay,
} from '../worker/scripts/earnings.mjs'

test('symbolKey ignores class-share separators and case', () => {
  assert.equal(symbolKey('BRK-B'), 'BRKB')
  assert.equal(symbolKey('brk/b'), 'BRKB')
})

test('only plain US tickers are eligible for the US calendar', () => {
  for (const ok of ['AAPL', 'NVDA', 'BRK-B', 'BF/B', 'F']) assert.equal(isUsCalendarSymbol(ok), true, ok)
  // Exchange suffixes would collide with unrelated US tickers once the dot is
  // stripped (ABC.L -> ABCL); crypto and indices are not on the calendar.
  for (const no of ['PTT.BK', 'VOD.L', 'ABC.L', 'BTC-USD', '^GSPC', 'GC=F', 'TOOLONGX']) assert.equal(isUsCalendarSymbol(no), false, no)
})

test('usEasternDates: next skips the weekend, tomorrow stays the calendar day', () => {
  assert.deepEqual(usEasternDates(new Date('2026-11-13T15:00:00Z')), { today: '2026-11-13', tomorrow: '2026-11-14', next: '2026-11-16' }) // Fri
  assert.equal(usEasternDates(new Date('2026-11-14T15:00:00Z')).next, '2026-11-16') // Sat
  assert.equal(usEasternDates(new Date('2026-11-15T15:00:00Z')).next, '2026-11-16') // Sun
  const tue = usEasternDates(new Date('2026-11-17T15:00:00Z'))
  assert.equal(tue.next, '2026-11-18')
  assert.equal(tue.next, tue.tomorrow)
})

test('usEasternDates uses the US Eastern date, not UTC', () => {
  // 02:00Z on the 17th is still the evening of the 16th in New York.
  assert.equal(usEasternDates(new Date('2026-11-17T02:00:00Z')).today, '2026-11-16')
})

test('parseEarningsRows maps timing and EPS and drops junk rows', () => {
  const rows = parseEarningsRows({ data: { rows: [
    { symbol: 'AAPL', time: 'time-pre-market', epsForecast: '$1.52' },
    { symbol: 'BRK/B', time: 'time-after-hours', epsForecast: 'N/A' },
    { symbol: 'XYZ', time: 'time-not-supplied', epsForecast: '' },
    { symbol: '' }, null,
  ] } })
  assert.deepEqual(rows.map((r) => [r.symbol, r.time, r.eps, r.key]), [
    ['AAPL', 'pre', '$1.52', 'AAPL'], ['BRK/B', 'after', null, 'BRKB'], ['XYZ', 'unknown', null, 'XYZ'],
  ])
  assert.deepEqual(parseEarningsRows({}), [])
  assert.deepEqual(parseEarningsRows({ data: { rows: null } }), [])
})

test('matchEarnings matches holdings case-insensitively across class-share spellings', () => {
  const rows = parseEarningsRows({ data: { rows: [{ symbol: 'BRK/B', time: 'time-pre-market' }, { symbol: 'ABCL', time: 'time-pre-market' }, { symbol: 'AAPL', time: 'time-pre-market' }] } })
  const hits = matchEarnings(['aapl', 'BRK-B', 'ABC.L', 'PTT.BK', 'MSFT'], rows).map((m) => m.symbol)
  assert.deepEqual(hits, ['aapl', 'BRK-B']) // ABC.L must not match ABCL
})

test('fetchEarningsDay fails loudly on HTTP errors and bad payloads', async () => {
  await assert.rejects(fetchEarningsDay('2026-11-17', async () => ({ ok: false, status: 403 })), /HTTP 403/)
  await assert.rejects(fetchEarningsDay('2026-11-17', async () => ({ ok: true, json: async () => ({ data: { rows: 'x' } }) })), /unexpected payload/)
  const rows = await fetchEarningsDay('2026-11-17', async () => ({ ok: true, json: async () => ({ data: { rows: [{ symbol: 'NVDA', time: 'time-after-hours', epsForecast: '$1.3' }] } }) }))
  assert.equal(rows[0].symbol, 'NVDA')
})

test('usEasternMinutes follows the New York clock, including DST', () => {
  assert.equal(usEasternMinutes(new Date('2026-11-17T15:00:00Z')), 10 * 60) // EST, UTC-5
  assert.equal(usEasternMinutes(new Date('2026-07-15T15:00:00Z')), 11 * 60) // EDT, UTC-4
  assert.equal(usEasternMinutes(new Date('2026-11-17T05:00:00Z')), 0) // midnight, not "24:00"
  assert.equal(usEasternMinutes(new Date('2026-11-17T14:29:00Z')), 9 * 60 + 29)
})

test('reportAlreadyOut: pre-market is out from the open, after-hours/unknown from the close', () => {
  const at = (h, m = 0) => h * 60 + m
  assert.equal(reportAlreadyOut({ time: 'pre' }, at(7)), false)
  assert.equal(reportAlreadyOut({ time: 'pre' }, at(9, 29)), false)
  assert.equal(reportAlreadyOut({ time: 'pre' }, at(9, 30)), true)
  assert.equal(reportAlreadyOut({ time: 'after' }, at(15, 59)), false)
  assert.equal(reportAlreadyOut({ time: 'after' }, at(16)), true)
  assert.equal(reportAlreadyOut({ time: 'unknown' }, at(12)), false)
  assert.equal(reportAlreadyOut({ time: 'unknown' }, at(16)), true)
})
