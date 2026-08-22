// Shared between index.js's request handlers and alerts.js's validation —
// pulled out on its own so alerts.js doesn't have to import from index.js
// (which itself needs to import alerts.js for the /alerts route — a
// circular import that's fragile to rely on even where ES modules
// technically tolerate it).

// Allows '=' too — Yahoo's futures/forex symbols use it, e.g. gold's
// "GC=F" (COMEX futures) or "XAUUSD=X" (spot forex-style quote) — and '^'
// for indices like "^GSPC" (S&P 500), which autocomplete can surface.
export const SYMBOL_RE = /^[A-Za-z0-9.\-=^]{1,10}$/

// '1d'/'7d' need intraday candles (a single day's worth of daily closes is
// one point, not a range) — Yahoo's `range` enum has '1d' but not '7d', so
// 7d goes through explicit period1/period2 instead. Everything 3mo+ keeps
// using daily closes via the plain `range` param, unchanged.
// Every consumer validates a range by plain truthy lookup (`RANGE_CONFIG[range]`)
// rather than `Object.hasOwn` — a null prototype closes the gap that would
// otherwise leave, so an inherited key like 'constructor' or 'toString'
// can't be mistaken for a configured range.
export const RANGE_CONFIG = Object.assign(Object.create(null), {
  '1d': { range: '1d', interval: '5m' },
  '7d': { days: 7, interval: '30m' },
  '3mo': { range: '3mo', interval: '1d' },
  '6mo': { range: '6mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '2y': { range: '2y', interval: '1d' },
  '5y': { range: '5y', interval: '1d' },
})
