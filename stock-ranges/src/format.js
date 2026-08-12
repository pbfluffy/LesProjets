// Shared number formatting so a large price like 64756.06 reads as
// "64,756.06" instead of a hard-to-scan run of digits.
export function formatPrice(value, currency) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${currency} ${formatted}` : formatted
}

// Share counts (especially from fractional-share brokers / PDF imports)
// often carry 6-7 decimal places, e.g. 0.1976964 — fine for the underlying
// math, but clutters a card header. Rounds to 4 decimals for display only;
// the stored value stays exact.
export function formatQty(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
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

const DAY_SECONDS = 86400

// Formats a unix-seconds timestamp for a chart axis label, choosing
// granularity from how wide the whole series spans — a two-day intraday
// range wants a time of day, a five-year range wants a month and year, and
// showing full dates on everything would either waste space or lose the
// only detail that's actually informative for that range.
export function formatAxisDate(unixSeconds, spanSeconds, lang) {
  if (typeof unixSeconds !== 'number' || !Number.isFinite(unixSeconds)) return ''
  const date = new Date(unixSeconds * 1000)
  const locale = lang === 'th' ? 'th-TH' : 'en-US'
  if (spanSeconds < 2 * DAY_SECONDS) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
  if (spanSeconds < 500 * DAY_SECONDS) {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
}
