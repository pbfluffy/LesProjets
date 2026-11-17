// Realized-sale log helpers. Kept out of wallet.js on purpose: wallet.js is also
// imported by the Worker's hourly Node scripts and must stay free of browser
// modules, while this file needs fx.js for currency conversion.
import { convert } from './fx.js'

// Cap on logged sales — matches the firestore.rules bound on the synced list.
// Recording is refused at the cap (rather than dropping the oldest entry),
// because dropping one would silently change the all-time realized total.
export const MAX_SELLS = 500

// Realized gain/loss of one logged sale, in the display currency. The log
// entry carries its own avgCost/costCurrency (snapshotted when the sale was
// recorded), so editing or re-buying the holding later never changes it.
// Returns null when either side can't be converted (rates not loaded yet).
export function computeRealizedPL(sell, displayCurrency, rates) {
  if (!sell || typeof sell.qty !== 'number') return null
  const price = convert(sell.price, sell.currency, displayCurrency, rates)
  const cost = convert(sell.avgCost, sell.costCurrency, displayCurrency, rates)
  if (price === null || cost === null) return null
  const proceeds = sell.qty * price
  const costBasis = sell.qty * cost
  const pl = proceeds - costBasis
  return { proceeds, costBasis, pl, plPercent: costBasis > 0 ? (pl / costBasis) * 100 : null }
}

// All-time and this-calendar-year realized totals. `skipped` counts entries
// that couldn't be converted, so the UI can say the total is partial rather
// than silently under-reporting.
export function summarizeRealized(sells, displayCurrency, rates, now = new Date()) {
  const year = String(now.getFullYear())
  let total = 0
  let thisYear = 0
  let skipped = 0
  ;(sells || []).forEach((sell) => {
    const r = computeRealizedPL(sell, displayCurrency, rates)
    if (!r) { skipped++; return }
    total += r.pl
    if (typeof sell.date === 'string' && sell.date.startsWith(year)) thisYear += r.pl
  })
  return { total, thisYear, skipped, count: (sells || []).length }
}
