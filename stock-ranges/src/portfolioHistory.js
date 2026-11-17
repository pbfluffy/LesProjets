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
// and cost basis, so a change in cost basis between two snapshots is treated as
// money added or taken out, assumed to land mid-period (Modified Dietz):
//   r_t = (MV_t - MV_{t-1} - flow) / (MV_{t-1} + flow / 2)
// Without this, buying more shares would look like a gain. The flow itself:
//   - cost basis up (a buy): the extra cost is what was paid in, so flow = dCB.
//   - cost basis down (a sale/removal): the money that LEFT is the sold shares'
//     market value, not their cost. Using dCB there would book the whole
//     unrealized gain of the sold shares as a loss (selling half of a +100%
//     position showed -28.6% on a flat day). The sold fraction is
//     -dCB / CB_{t-1}, assumed to be worth that fraction of MV_{t-1}.
// It is still an estimate: the real flow happened at an unknown time, and
// history converted with today's rates carries no past FX moves.
export function estimateFlow(prev, p) {
  if (!Number.isFinite(p.costBasis) || !Number.isFinite(prev.costBasis)) return 0
  const dCB = p.costBasis - prev.costBasis
  if (dCB >= 0) return dCB
  if (!(prev.costBasis > 0) || !(prev.marketValue > 0)) return dCB
  const soldFraction = Math.min(1, -dCB / prev.costBasis)
  return -soldFraction * prev.marketValue
}

// `points`: [{date, marketValue, costBasis}] in ONE currency, oldest first.
// Returns [{date, index}] aligned with `points`.
export function flowAdjustedSeries(points) {
  const out = []
  let index = 100
  points.forEach((p, i) => {
    if (i > 0) {
      const prev = points[i - 1]
      const flow = estimateFlow(prev, p)
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

// Unix seconds at which a history snapshot's prices were current. The date key
// is the device's local calendar day, which can be most of a day away from the
// US session the prices came from (a 10:00 Bangkok snapshot is still priced at
// the previous US close), so the write time is what to align on; the end of
// the date is only a fallback for entries without one.
export function snapshotSeconds(entry) {
  if (Number.isFinite(entry.updatedAt)) return entry.updatedAt / 1000
  return Date.parse(`${entry.date}T23:59:59Z`) / 1000
}

// For each cutoff (unix seconds, see snapshotSeconds), takes the last benchmark
// bar at or before it — a bar's timestamp is its session open and its price is
// the close, or the live price while the session is still running, which is
// exactly what a snapshot written at that moment saw. Weekends/holidays reuse
// the previous close. Rebases so the first point with data is 100; points
// before the benchmark's first bar get null.
// `timestamps` are unix seconds parallel to `prices` (either may hold nulls).
export function alignIndexSeries(timestamps, prices, cutoffs) {
  const bars = []
  for (let i = 0; i < prices.length; i++) {
    if (Number.isFinite(prices[i]) && Number.isFinite(timestamps[i])) bars.push([timestamps[i], prices[i]])
  }
  bars.sort((a, b) => a[0] - b[0])
  // Binary search per point: cutoffs aren't guaranteed monotonic (a date key and
  // its write time come from different clocks).
  const lastBarAtOrBefore = (t) => {
    let lo = 0
    let hi = bars.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (bars[mid][0] <= t) { found = mid; lo = mid + 1 } else hi = mid - 1
    }
    return found
  }
  const raw = cutoffs.map((t) => {
    const i = Number.isFinite(t) ? lastBarAtOrBefore(t) : -1
    return i >= 0 ? bars[i][1] : null
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
