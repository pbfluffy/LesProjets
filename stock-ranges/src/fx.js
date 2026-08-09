// Currency conversion for the USD/THB display toggle. Backed by
// open.er-api.com (free, no key, daily-updated), same provider bill-splitter
// uses for its trip currency conversion. Rates are cached once per calendar
// day in localStorage so toggling currency is instant after the first load.
//
// Band/signal math (deciles.js) always runs on the raw native-currency
// prices the worker returns — multiplying every value in a range by the
// same conversion factor doesn't change where the current price sits
// within that range, so conversion only ever affects displayed numbers,
// never the buy/hold/sell logic.

const CACHE_KEY = 'stockranges_fx_rates_v1'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { date, rates } = JSON.parse(raw)
    return date === todayKey() && rates ? rates : null
  } catch {
    return null
  }
}

function writeCache(rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), rates }))
  } catch {
    // localStorage full/unavailable — conversion still works this session.
  }
}

// Returns { [currencyCode]: thbPerOneUnit }, e.g. { USD: 33.12, THB: 1, ... }.
// Returns null on fetch failure — callers should fall back to showing native
// currency rather than retrying in a loop.
export async function getThbRates({ force = false } = {}) {
  if (!force) {
    const cached = readCache()
    if (cached) return cached
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/THB')
    const data = await res.json()
    if (!data?.rates) return null
    const map = { THB: 1 }
    Object.entries(data.rates).forEach(([code, rate]) => {
      if (typeof rate === 'number' && rate > 0) {
        map[code] = Math.round((1 / rate) * 10000) / 10000
      }
    })
    writeCache(map)
    return map
  } catch {
    return null
  }
}

// Converts a price between two currency codes via THB as the pivot.
// Returns null if either currency's rate is unknown (e.g. rates unavailable,
// or Yahoo returned an exotic code open.er-api doesn't track).
export function convert(amount, fromCurrency, toCurrency, rates) {
  if (typeof amount !== 'number' || !rates) return null
  if (fromCurrency === toCurrency) return amount
  const fromRate = rates[fromCurrency]
  const toRate = rates[toCurrency]
  if (!fromRate || !toRate) return null
  return (amount * fromRate) / toRate
}
