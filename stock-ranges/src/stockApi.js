// Fetches daily-close price history from the stock-ranges Worker (a CORS
// proxy in front of Yahoo Finance's chart API, which sends no CORS headers
// of its own — see worker/src/index.js). Cached in sessionStorage per
// symbol+range so switching between watchlist entries or re-rendering
// doesn't refetch on every mount; the Worker itself also caches for 5min,
// this just saves the round trip entirely within a tab session.

const WORKER_URL = import.meta.env.VITE_STOCK_WORKER_URL
const CACHE_PREFIX = 'stockranges_quote_'
const CACHE_TTL_MS = 5 * 60 * 1000

// Maps a fetchQuote error's `code` to a LangContext key — shared so every
// caller (Watchlist and Wallet cards alike) shows the same localized
// message for the same underlying failure.
export const QUOTE_ERROR_LABEL_KEY = {
  NOT_FOUND: 'quoteErrorNotFound',
  NETWORK: 'quoteErrorNetwork',
  SERVICE: 'quoteErrorService',
  CONFIG: 'quoteErrorConfig',
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    return Date.now() - ts < CACHE_TTL_MS ? data : null
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // sessionStorage full/unavailable — fine, just no caching this session.
  }
}

function codedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

// Returns { symbol, name, currency, current, prices } or throws an Error
// with a `code` (CONFIG | NETWORK | NOT_FOUND | SERVICE) so the caller can
// show a localized message — the message text here is only an English
// fallback for non-UI contexts (e.g. console logs).
// `bypassCache` skips the session cache read (used by the manual refresh
// button) but still writes the fresh result, so later normal calls benefit.
export async function fetchQuote(symbol, range, { bypassCache = false } = {}) {
  const key = `${symbol}:${range}`
  const cached = !bypassCache && readCache(key)
  if (cached) return cached

  if (!WORKER_URL) {
    throw codedError('CONFIG', 'Worker URL not configured (VITE_STOCK_WORKER_URL)')
  }

  let res
  try {
    res = await fetch(`${WORKER_URL}?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`)
  } catch {
    throw codedError('NETWORK', 'Network error — could not reach the quote service')
  }

  if (res.status === 404) {
    throw codedError('NOT_FOUND', 'Ticker not found')
  }
  if (!res.ok) {
    throw codedError('SERVICE', 'Quote service error')
  }

  const data = await res.json()
  writeCache(key, data)
  return data
}

// Returns [{ symbol, name, exchange, type }, ...] for a partial ticker/name
// query (autocomplete), or [] on any failure — callers should treat that as
// "no suggestions right now", not an error worth surfacing to the user.
export async function searchSymbols(query) {
  const key = `search:${query.toLowerCase()}`
  const cached = readCache(key)
  if (cached) return cached

  if (!WORKER_URL) return []

  let res
  try {
    res = await fetch(`${WORKER_URL}?q=${encodeURIComponent(query)}`)
  } catch {
    return []
  }
  if (!res.ok) return []

  const data = await res.json().catch(() => null)
  const results = Array.isArray(data) ? data : []
  writeCache(key, results)
  return results
}
