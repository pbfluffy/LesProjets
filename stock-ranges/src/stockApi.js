// Fetches daily-close price history from the stock-ranges Worker (a CORS
// proxy in front of Yahoo Finance's chart API, which sends no CORS headers
// of its own — see worker/src/index.js). Cached in localStorage per
// symbol+range so switching between watchlist entries, re-rendering, or
// reopening the app doesn't refetch needlessly; the Worker itself also
// caches for 5min, this just saves the round trip entirely.
//
// Quotes get a market-hours-aware cache lifetime instead of a flat one:
// while the market's open, 5 minutes (matching the Worker's own edge
// cache); while it's closed, the price can't have moved, so the cache is
// extended until the market's next open instead of expiring every 5
// minutes for no reason — the common real case being someone reopening a
// PWA a few times over an evening and getting the same last-close price
// back from disk instead of a wasted network round trip each time.

import { getMarketStatus } from './marketHours.js'

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

// Search results (ticker/name autocomplete) aren't price data and don't
// depend on market hours at all, so they always use the flat TTL — only
// quotes get the market-aware extension below.
function quoteCacheTtlMs() {
  const status = getMarketStatus()
  if (status.open || !status.nextOpen) return CACHE_TTL_MS
  return Math.max(status.nextOpen.getTime() - Date.now(), CACHE_TTL_MS)
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { expiresAt, data } = JSON.parse(raw)
    return Date.now() < expiresAt ? data : null
  } catch {
    return null
  }
}

function writeCache(key, data, ttlMs) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ expiresAt: Date.now() + ttlMs, data }))
  } catch {
    // localStorage full/unavailable — fine, just no caching.
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
// `bypassCache` skips the cache read (used by the manual refresh button)
// but still writes the fresh result, so later normal calls benefit.
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
  writeCache(key, data, quoteCacheTtlMs())
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
  writeCache(key, results, CACHE_TTL_MS)
  return results
}
