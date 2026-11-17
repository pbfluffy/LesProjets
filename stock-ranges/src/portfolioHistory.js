// Client-side daily snapshots of portfolio value — no worker/cron needed.
// Each visit to the Wallet tab (once all holdings' quotes have resolved)
// records or overwrites *today's* entry, so revisiting later the same day
// updates the point rather than adding noise. Values are stored in
// whatever currency was active at snapshot time; callers convert to the
// current display currency when charting (same "no historical FX" tradeoff
// the rest of the app already makes).
const HISTORY_KEY = 'stockranges_portfolio_history'
const MAX_ENTRIES = 400 // ~13 months of daily snapshots

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function loadPortfolioHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePortfolioHistory(entries) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sorted.slice(-MAX_ENTRIES)))
}

// Records (or overwrites) today's snapshot and returns it so callers can
// push the same entry to cloud sync without re-deriving it.
export function recordPortfolioSnapshot({ marketValue, costBasis, currency }) {
  if (typeof marketValue !== 'number' || !Number.isFinite(marketValue)) return null
  const entry = { date: todayKey(), marketValue, costBasis, currency, updatedAt: Date.now() }
  const history = loadPortfolioHistory().filter((e) => e.date !== entry.date)
  history.push(entry)
  savePortfolioHistory(history)
  return entry
}

// Combines this device's history with another device's (from cloud) —
// for each date, keeps whichever entry was recorded most recently. A
// snapshot is regenerable from current prices, so "last write wins" per
// day is the right call here rather than a conflict prompt like the rest
// of the app's synced data gets.
export function mergePortfolioHistories(a, b) {
  const byDate = new Map()
  ;[...a, ...b].forEach((entry) => {
    const existing = byDate.get(entry.date)
    if (!existing || (entry.updatedAt || 0) >= (existing.updatedAt || 0)) byDate.set(entry.date, entry)
  })
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date))
}

// --- Benchmark comparison (pure, no storage) --------------------------------

// Turns snapshot points into an index starting at 100 that tracks investment
// performance rather than portfolio size. The history only stores market value
// and cost basis, so any change in cost basis between two snapshots is treated
// as money added (or taken out by a sale), assumed to land mid-period
// (Modified Dietz):
//   r_t = (MV_t - MV_{t-1} - flow) / (MV_{t-1} + flow / 2),  flow = CB_t - CB_{t-1}
// Without this, buying more shares would look like a gain. It is an estimate:
// the real flow happened at an unknown time, and history converted with
// today's rates carries no past FX moves.
// `points`: [{date, marketValue, costBasis}] in ONE currency, oldest first.
// Returns [{date, index}] aligned with `points`.
export function flowAdjustedSeries(points) {
  const out = []
  let index = 100
  points.forEach((p, i) => {
    if (i > 0) {
      const prev = points[i - 1]
      const flow = Number.isFinite(p.costBasis) && Number.isFinite(prev.costBasis) ? p.costBasis - prev.costBasis : 0
      const denom = prev.marketValue + flow / 2
      const r = prev.marketValue > 0 && denom > 0 && Number.isFinite(p.marketValue)
        ? 1 + (p.marketValue - prev.marketValue - flow) / denom
        : 1
      // A non-finite or non-positive step (empty portfolio, bad data) can't be
      // a real return — hold the line flat instead of corrupting the chain.
      index *= Number.isFinite(r) && r > 0 ? r : 1
    }
    out.push({ date: p.date, index })
  })
  return out
}

// For each 'YYYY-MM-DD' date, takes the last benchmark close on or before the
// end of that UTC day (so weekends/holidays reuse Friday's close), then
// rebases so the first date with data is 100. Dates before the benchmark's
// first close get null.
// `timestamps` are unix seconds parallel to `prices` (either may hold nulls).
export function alignIndexSeries(timestamps, prices, dates) {
  const bars = []
  for (let i = 0; i < prices.length; i++) {
    if (Number.isFinite(prices[i]) && Number.isFinite(timestamps[i])) bars.push([timestamps[i], prices[i]])
  }
  bars.sort((a, b) => a[0] - b[0])
  const raw = []
  let cursor = -1
  dates.forEach((date) => {
    const endOfDay = Date.parse(`${date}T23:59:59Z`) / 1000
    while (cursor + 1 < bars.length && bars[cursor + 1][0] <= endOfDay) cursor++
    raw.push(cursor >= 0 ? bars[cursor][1] : null)
  })
  const base = raw.find((v) => v !== null)
  return raw.map((v) => (v === null || !base ? null : (v / base) * 100))
}

// Smallest worker range that still covers `firstDate` (history can start long
// ago, benchmark ranges are fixed buckets).
export function benchmarkRangeFor(firstDate, now = new Date()) {
  const days = (now.getTime() - Date.parse(`${firstDate}T00:00:00Z`)) / 86400000
  if (days <= 80) return '3mo'
  if (days <= 170) return '6mo'
  if (days <= 350) return '1y'
  if (days <= 700) return '2y'
  return '5y'
}
