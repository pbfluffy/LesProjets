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

// Largest single-step move in the series, as a fraction (0.5 = 50%). A huge
// one-step jump inside the lookback (a crash, a spike, or a split the data
// didn't adjust for) stretches the low–high range, so the band / signal
// can be misleading — TickerCard warns above this threshold.
export const ABNORMAL_MOVE = 0.5

export function maxStepMove(prices) {
  if (!Array.isArray(prices)) return 0
  let max = 0
  for (let i = 1; i < prices.length; i++) {
    const a = prices[i - 1]
    const b = prices[i]
    if (a > 0 && b > 0) max = Math.max(max, Math.abs(b / a - 1))
  }
  return max
}
