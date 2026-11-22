// GET /dividends?symbol=AAPL — dividend payment dates for the wallet's
// dividend calendar.
//
// -> { symbol, source: 'nasdaq' | null,
//      payments: [{ exDate, payDate, amount }] }   (unix seconds, UTC
//      midnight; newest first; includes a declared-but-not-yet-ex dividend)
//
// Yahoo's chart data (the quote route) only has dividends keyed by ex-date
// (XD). The one free source found with real *payment* dates is Nasdaq's
// public quote API, and it only covers Nasdaq-listed symbols — NYSE stocks
// (KO, JNJ), NYSE Arca ETFs (VOO, SCHD) and Thai .BK stocks come back empty,
// and the app then just shows XD as before. Yahoo's own calendar endpoint
// needs a session token and SET's site blocks automated access, so neither
// is used. The route never errors for "no data": it returns payments: [].

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
export const DIVIDENDS_CACHE_SECONDS = 12 * 60 * 60
const MAX_PAYMENTS = 12

// Plain US tickers only (Nasdaq has nothing for "PTT.BK", "GC=F", "^SET").
export function isNasdaqCandidate(symbol) {
  return /^[A-Z]{1,5}$/.test(symbol)
}

// "11/19/2026" -> unix seconds at UTC midnight; null for "N/A" or junk.
export function parseUsDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim())
  if (!m) return null
  const t = Date.UTC(+m[3], +m[1] - 1, +m[2])
  return Number.isFinite(t) ? t / 1000 : null
}

// Nasdaq's JSON -> [{ exDate, payDate, amount }], cash dividends only,
// newest first. Rows without both dates are skipped.
export function parseNasdaqDividends(json) {
  const rows = json?.data?.dividends?.rows
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r) => !r?.type || /cash/i.test(r.type))
    .map((r) => ({
      exDate: parseUsDate(r?.exOrEffDate),
      payDate: parseUsDate(r?.paymentDate),
      amount: parseFloat(String(r?.amount || '').replace(/[^0-9.]/g, '')),
    }))
    .filter((p) => p.exDate && p.payDate && p.payDate >= p.exDate)
    .map((p) => ({ ...p, amount: Number.isFinite(p.amount) ? p.amount : null }))
    .sort((a, b) => b.exDate - a.exDate)
    .slice(0, MAX_PAYMENTS)
}

// Nasdaq files ETFs under a different asset class, so try stocks then etf.
export async function getDividendDates(symbol, fetchFn = fetch) {
  const empty = { symbol, source: null, payments: [] }
  if (!isNasdaqCandidate(symbol)) return empty
  for (const assetClass of ['stocks', 'etf']) {
    try {
      const res = await fetchFn(`https://api.nasdaq.com/api/quote/${symbol}/dividends?assetclass=${assetClass}`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      })
      if (!res.ok) continue
      const payments = parseNasdaqDividends(await res.json())
      if (payments.length) return { symbol, source: 'nasdaq', payments }
    } catch {
      // network error / bad JSON — try the next asset class, else empty
    }
  }
  return empty
}
