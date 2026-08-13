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
