// Shared number formatting so a large price like 64756.06 reads as
// "64,756.06" instead of a hard-to-scan run of digits.
export function formatPrice(value, currency) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${currency} ${formatted}` : formatted
}

// Returns { percent, direction } where direction is 'up' | 'down' | 'flat',
// or null if there isn't a valid previous close to compare against.
export function dayChange(current, previousClose) {
  if (typeof current !== 'number' || typeof previousClose !== 'number' || previousClose === 0) {
    return null
  }
  const percent = ((current - previousClose) / previousClose) * 100
  const direction = percent > 0.005 ? 'up' : percent < -0.005 ? 'down' : 'flat'
  return { percent, direction }
}
