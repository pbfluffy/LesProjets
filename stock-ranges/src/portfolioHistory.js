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

export function recordPortfolioSnapshot({ marketValue, costBasis, currency }) {
  if (typeof marketValue !== 'number' || !Number.isFinite(marketValue)) return
  const date = todayKey()
  const history = loadPortfolioHistory().filter((e) => e.date !== date)
  history.push({ date, marketValue, costBasis, currency })
  history.sort((a, b) => a.date.localeCompare(b.date))
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_ENTRIES)))
}
