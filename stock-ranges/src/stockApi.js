// Fetches daily-close price history from the stock-ranges Worker (a CORS
// proxy in front of Yahoo Finance's chart API, which sends no CORS headers
// of its own — see worker/src/index.js). Cached in sessionStorage per
// symbol+range so switching between watchlist entries or re-rendering
// doesn't refetch on every mount; the Worker itself also caches for 5min,
// this just saves the round trip entirely within a tab session.

const WORKER_URL = import.meta.env.VITE_STOCK_WORKER_URL
const CACHE_PREFIX = 'stockranges_quote_'
const CACHE_TTL_MS = 5 * 60 * 1000

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

// Returns { symbol, name, currency, current, prices } or throws with a
// short user-facing message on failure (unknown ticker, network error, ...).
export async function fetchQuote(symbol, range) {
  const key = `${symbol}:${range}`
  const cached = readCache(key)
  if (cached) return cached

  if (!WORKER_URL) {
    throw new Error('Worker URL not configured (VITE_STOCK_WORKER_URL)')
  }

  let res
  try {
    res = await fetch(`${WORKER_URL}?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`)
  } catch {
    throw new Error('Network error — could not reach the quote service')
  }

  if (res.status === 404) {
    throw new Error('Ticker not found')
  }
  if (!res.ok) {
    throw new Error('Quote service error')
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
