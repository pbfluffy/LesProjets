// Earnings-date lookup for the wallet's "earnings reminders" notification.
// Yahoo gives no usable upcoming-earnings date without a crumb, so this uses
// Nasdaq's public calendar (one request per date, US-listed companies only,
// and a date only appears once the company has scheduled it — typically a
// few weeks ahead). Everything here is best-effort: callers treat a thrown
// error as "no earnings info this run", never as a failure of the job.

const CALENDAR_URL = 'https://api.nasdaq.com/api/calendar/earnings'
const UA = 'Mozilla/5.0 (compatible; stock-ranges/1.0)'

// Yahoo writes class shares "BRK-B", Nasdaq writes "BRK/B" — compare with the
// separators removed.
export function symbolKey(symbol) {
  return String(symbol).toUpperCase().replace(/[-/]/g, '')
}

// Holdings that can appear on a US calendar. Yahoo uses '.' only for foreign
// exchange suffixes (PTT.BK, VOD.L) and those would otherwise collide with an
// unrelated US ticker once the dot is stripped ("ABC.L" -> "ABCL").
export function isUsCalendarSymbol(symbol) {
  return /^[A-Za-z]{1,5}([-/][A-Za-z])?$/.test(symbol)
}

// 'YYYY-MM-DD' for today and the next weekday on the US Eastern calendar,
// where earnings dates are published. `next` skips Saturday/Sunday so a
// Friday run already sees Monday's reporters (US market holidays aren't
// modelled — a holiday just means the reminder arrives a day later).
// `tomorrow` is the plain calendar day, used to word the notification.
export function usEasternDates(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)
  const [y, m, d] = today.split('-').map(Number)
  const plus = (n) => new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
  const tomorrow = plus(1)
  let step = 1
  while ([0, 6].includes(new Date(Date.UTC(y, m - 1, d + step)).getUTCDay())) step++
  return { today, tomorrow, next: plus(step) }
}

// Raw Nasdaq payload -> [{ key, symbol, time: 'pre' | 'after' | 'unknown', eps }]
export function parseEarningsRows(json) {
  const rows = json?.data?.rows
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r) => r && typeof r.symbol === 'string' && r.symbol)
    .map((r) => ({
      key: symbolKey(r.symbol),
      symbol: r.symbol,
      time: r.time === 'time-pre-market' ? 'pre' : r.time === 'time-after-hours' ? 'after' : 'unknown',
      eps: typeof r.epsForecast === 'string' && /\d/.test(r.epsForecast) ? r.epsForecast : null,
    }))
}

// Fetches and parses one day. Throws on any network/HTTP/shape problem.
export async function fetchEarningsDay(date, fetchImpl = fetch) {
  const res = await fetchImpl(`${CALENDAR_URL}?date=${date}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Nasdaq calendar ${date}: HTTP ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json?.data?.rows) && json?.data?.rows !== null) throw new Error(`Nasdaq calendar ${date}: unexpected payload`)
  return parseEarningsRows(json)
}

// Which of `holdingSymbols` report on this calendar day -> [{ symbol, row }]
export function matchEarnings(holdingSymbols, rows) {
  const byKey = new Map(rows.map((r) => [r.key, r]))
  return holdingSymbols
    .filter(isUsCalendarSymbol)
    .map((symbol) => ({ symbol, row: byKey.get(symbolKey(symbol)) }))
    .filter((m) => m.row)
}
