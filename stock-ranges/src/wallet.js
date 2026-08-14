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

// Not every stock pays quarterly — REITs and some ETFs pay monthly, a few
// pay semi-annually. Inferred from the median gap between actual payment
// dates rather than assumed, so the breakdown below buckets by whatever
// cadence the stock actually uses.
export function inferDividendCadence(dividendEvents) {
  if (!Array.isArray(dividendEvents) || dividendEvents.length < 2) return 'quarter'
  const sorted = [...dividendEvents].sort((a, b) => a.date - b.date)
  const gapsDays = []
  for (let i = 1; i < sorted.length; i++) {
    gapsDays.push((sorted[i].date - sorted[i - 1].date) / 86400)
  }
  gapsDays.sort((a, b) => a - b)
  const medianGap = gapsDays[Math.floor(gapsDays.length / 2)]
  return medianGap <= 45 ? 'month' : 'quarter'
}

// Guesses the next payment's date and amount from the last actual payment
// plus the inferred cadence — this app never calls Yahoo's forward-looking
// calendar endpoint, only its historical-events one, so there is no real
// scheduled date to show. Wrong whenever a company changes or suspends its
// dividend; callers must present this as an estimate, not a fact.
export function estimateNextDividend(dividendEvents, qty) {
  if (!Array.isArray(dividendEvents) || dividendEvents.length === 0 || typeof qty !== 'number') return null
  const sorted = [...dividendEvents].sort((a, b) => a.date - b.date)
  const last = sorted[sorted.length - 1]
  const cadence = inferDividendCadence(dividendEvents)
  const gapDays = cadence === 'month' ? 30 : 91
  return { date: last.date + gapDays * 86400, amount: last.amount * qty }
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

const INSTRUMENT_GROUP_ORDER = ['EQUITY', 'ETF', 'OTHER']

// Yahoo's instrumentType (EQUITY, ETF, CRYPTOCURRENCY, FUTURE, INDEX,
// MUTUALFUND, ...) collapsed to the three groups the wallet actually
// displays — anything that isn't a plain stock or ETF lands in "Other"
// rather than growing a list of one-off categories.
export function classifyInstrumentGroup(instrumentType) {
  if (instrumentType === 'EQUITY') return 'EQUITY'
  if (instrumentType === 'ETF') return 'ETF'
  return 'OTHER'
}

// Splits symbols into ordered {key, symbols} groups for section headers.
// A symbol whose quote hasn't resolved yet (no instrumentType known)
// lands in "Other" until it loads, then moves to its real group — a brief
// reshuffle, same tradeoff the rest of the wallet already makes by
// rendering progressively as each quote comes in.
export function groupSymbolsByInstrumentType(symbols, quotes) {
  const buckets = { EQUITY: [], ETF: [], OTHER: [] }
  symbols.forEach((symbol) => {
    buckets[classifyInstrumentGroup(quotes[symbol]?.instrumentType)].push(symbol)
  })
  return INSTRUMENT_GROUP_ORDER
    .map((key) => ({ key, symbols: buckets[key] }))
    .filter((group) => group.symbols.length > 0)
}

const SORT_METRIC_KEY = { value: 'value', pl: 'plPercent', yield: 'yieldPercent' }

// Orders symbols by the chosen metric before grouping, so each
// instrument-type section ends up internally sorted too. A symbol whose
// metric hasn't resolved yet (quote still loading) sorts to the end
// rather than jumping around as data streams in.
export function sortHoldingSymbols(symbols, sortBy, metrics) {
  if (sortBy === 'alpha') return [...symbols].sort((a, b) => a.localeCompare(b))
  const key = SORT_METRIC_KEY[sortBy] || 'value'
  return [...symbols].sort((a, b) => {
    const va = metrics[a]?.[key]
    const vb = metrics[b]?.[key]
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return vb - va
  })
}
