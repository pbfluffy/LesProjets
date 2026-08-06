// fx.js — shared exchange-rate cache for Trip currency conversion.
//
// Backed by open.er-api.com (free, no key, daily-updated rates sourced from
// exchangerate-api.com). Always targets THB specifically rather than each
// trip's nominal currency — that's deliberate, not an oversight: PromptPay
// (the actual settlement mechanism the app generates QR codes for) only
// ever moves Thai baht, so THB is the one currency a converted amount is
// actually payable in, regardless of what a trip happens to be labeled.
//
// Rates are cached once per calendar day in localStorage and shared across
// every trip, so opening a second mixed-currency trip the same day is
// instant instead of re-fetching.
import { CURRENCIES } from './currencies.js'

const CACHE_KEY = 'bill_fx_rates_v1'

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
    // localStorage full/unavailable — conversion still works this session,
    // it'll just re-fetch next time instead of hitting the cache.
  }
}

// Returns { [currencyCode]: thbPerOneUnit } for every currency the app
// supports, e.g. { USD: 33.12, JPY: 0.2102, THB: 1, ... }. Returns null on
// fetch failure — callers should treat that as "conversion unavailable
// right now" (leave amounts in their original currency), not retry in a loop.
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
    CURRENCIES.forEach(({ code }) => {
      if (code !== 'THB' && data.rates[code]) {
        map[code] = Math.round((1 / data.rates[code]) * 10000) / 10000
      }
    })
    writeCache(map)
    return map
  } catch {
    return null
  }
}
