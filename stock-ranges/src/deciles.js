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
