// Splits a lookback window's [low, high] closing-price range into 10 equal
// bands and reports which band today's price falls in. Band 1 = at/near the
// period low, band 10 = at/near the period high. This is a plain
// position-in-range heuristic, not a valuation model — it says nothing
// about whether a stock is fundamentally cheap or expensive, only where the
// current price sits relative to its own recent range.
export const BAND_COUNT = 10

export function computeDeciles({ prices, current }) {
  if (!Array.isArray(prices) || prices.length === 0 || typeof current !== 'number') {
    return null
  }

  const low = Math.min(...prices)
  const high = Math.max(...prices)

  if (high === low) {
    // Flat / single-point range — nothing to rank against.
    return { low, high, band: 5, signal: null }
  }

  const bandWidth = (high - low) / BAND_COUNT
  const rawBand = Math.floor((current - low) / bandWidth)
  const band = Math.min(Math.max(rawBand, 0), BAND_COUNT - 1) + 1

  const signal = band <= 3 ? 'buy' : band <= 7 ? 'hold' : 'sell'

  return { low, high, band, signal }
}

// Largest single-step move in the series: { move, index } where move is a
// fraction (0.5 = 50%) and index is the position of the price right AFTER
// the move. Yahoo's closes are already split-adjusted (e.g. NVDA's 10:1 in
// 2024 shows no jump), so a huge step is a real crash or spike — it
// stretches the low–high range and can make the band / signal misleading.
// TickerCard warns above ABNORMAL_MOVE and also shows the band measured
// only since the move.
export const ABNORMAL_MOVE = 0.5

export function largestStep(prices) {
  let move = 0
  let index = -1
  if (!Array.isArray(prices)) return { move, index }
  for (let i = 1; i < prices.length; i++) {
    const a = prices[i - 1]
    const b = prices[i]
    if (a > 0 && b > 0) {
      const m = Math.abs(b / a - 1)
      if (m > move) { move = m; index = i }
    }
  }
  return { move, index }
}

export function maxStepMove(prices) {
  return largestStep(prices).move
}

// Days covered by each lookback, for cutting a longer daily series down to
// one range (e.g. the wallet loads 2y of closes and shows the 1y band).
const RANGE_DAYS = { '3mo': 91, '6mo': 182, '1y': 365, '2y': 730 }

// Returns the prices within `range` (by timestamp, seconds), or null when
// the range can't be taken from this series (intraday 1d/7d, or 5y).
export function sliceByRange(prices, timestamps, range, now = Date.now()) {
  if (!Array.isArray(prices) || !Array.isArray(timestamps)) return null
  let fromSec
  if (range === 'ytd') fromSec = Date.UTC(new Date(now).getUTCFullYear(), 0, 1) / 1000
  else if (RANGE_DAYS[range]) fromSec = now / 1000 - RANGE_DAYS[range] * 86400
  else return null
  const out = []
  for (let i = 0; i < prices.length; i++) {
    if (typeof timestamps[i] === 'number' && timestamps[i] >= fromSec) out.push(prices[i])
  }
  return out.length >= 2 ? out : null
}
