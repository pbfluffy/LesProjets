// Pure calculation helpers for the Wallet tab — holdings profit/loss and
// dividend income derived from a symbol's actual paid-dividend history
// (fetched from Yahoo via the worker), not a manually entered amount. No
// React, no I/O, same style as deciles.js.

// Unrealized P/L for one holding, all inputs already in the same currency
// (callers convert with fx.js's convert() first — this file knows nothing
// about currency).
export function computeHoldingPL({ qty, avgCost, currentPrice }) {
  if (typeof qty !== 'number' || typeof avgCost !== 'number' || typeof currentPrice !== 'number') {
    return null
  }
  const costBasis = qty * avgCost
  const marketValue = qty * currentPrice
  const pl = marketValue - costBasis
  const plPercent = costBasis !== 0 ? (pl / costBasis) * 100 : null
  return { costBasis, marketValue, pl, plPercent }
}

const YEAR_SECONDS = 365 * 86400

// Projects monthly/quarterly dividend income from the last 12 months of
// actual per-share payments (from Yahoo, via the worker) times qty held —
// this assumes the current position size was held for the whole trailing
// year, which is a simplification (real income depends on how many shares
// you held on each past ex-dividend date, which we don't track), but it's
// the same "current state projected backward" approach the rest of the app
// already uses. Returns null if there's no qty/history to project from.
export function projectedDividendIncome(dividendEvents, qty) {
  if (!Array.isArray(dividendEvents) || typeof qty !== 'number') return null
  const cutoff = Date.now() / 1000 - YEAR_SECONDS
  const recent = dividendEvents.filter((d) => d.date >= cutoff)
  if (recent.length === 0) return { trailingTwelveMonth: 0, perMonth: 0, perQuarter: 0, eventCount: 0 }
  const trailingTwelveMonth = recent.reduce((sum, d) => sum + d.amount * qty, 0)
  return {
    trailingTwelveMonth,
    perMonth: trailingTwelveMonth / 12,
    perQuarter: trailingTwelveMonth / 4,
    eventCount: recent.length,
  }
}

// Buckets actual dividend events (amount already multiplied by qty held) by
// calendar month or quarter, oldest first — for a "here's what you actually
// got, and when" breakdown alongside the projected monthly/quarterly figure.
export function groupDividendsByPeriod(dividendEvents, qty, granularity = 'quarter') {
  if (!Array.isArray(dividendEvents) || typeof qty !== 'number') return []
  const buckets = new Map()
  dividendEvents.forEach((d) => {
    const date = new Date(d.date * 1000)
    const key = granularity === 'month'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
    buckets.set(key, (buckets.get(key) || 0) + d.amount * qty)
  })
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, amount]) => ({ period, amount }))
}
