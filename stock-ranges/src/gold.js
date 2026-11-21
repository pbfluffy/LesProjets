// Gold tab maths. The quotes Worker only proxies Yahoo Finance, which has
// world gold (COMEX futures, GC=F, USD per troy ounce) and USD/THB (THB=X)
// but not the Thai Gold Traders Association's posted price. So the Thai
// price shown here is an estimate: spot × USD/THB, scaled to one baht-weight
// of 96.5% gold. The association's posted price adds a dealer premium and
// rounds to 50 baht, so it differs a little; the UI says so.
//
// No browser APIs in here, so `npm test` can cover it directly.

export const GOLD_SYMBOL = 'GC=F'
export const USDTHB_SYMBOL = 'THB=X'

export const GRAMS_PER_TROY_OZ = 31.1034768
// One baht-weight (บาท) of gold bar, the unit Thai shops quote in.
export const GRAMS_PER_BAHT_WEIGHT = 15.244
// Thai standard gold is 96.5% pure.
export const THAI_GOLD_PURITY = 0.965

// Thai gold is weighed in baht (บาท) and its quarter, the salueng (สลึง);
// shops quote per baht and sell small pieces as 1 or 2 salueng. Grams are
// listed too, for comparing with world prices.
export const THAI_GOLD_UNITS = [
  { key: 'baht', baht: 1 },
  { key: 'twoSalueng', baht: 0.5 },
  { key: 'salueng', baht: 0.25 },
  { key: 'gram', baht: 1 / GRAMS_PER_BAHT_WEIGHT },
]

// Units a user can pick (profile → Settings) for the Thai card's main price
// and chart. Stored in localStorage only — a per-device display choice, like
// the theme, so it needs no Firestore rule.
export const GOLD_UNIT_KEY = 'stockranges_gold_unit'
export const GOLD_UNIT_CHOICES = ['baht', 'salueng', 'gram']
export const DEFAULT_GOLD_UNIT = 'baht'

export function readGoldUnit(raw) {
  return GOLD_UNIT_CHOICES.includes(raw) ? raw : DEFAULT_GOLD_UNIT
}

// Baht-weights in one of `unit` (1 for baht, 0.25 for salueng, …).
export function bahtPerUnit(unit) {
  return THAI_GOLD_UNITS.find((u) => u.key === unit)?.baht ?? 1
}

// Multiplies every price in a toBahtGoldSeries() result by `factor`. The
// band is unchanged by this (scaling the whole range doesn't move where the
// price sits in it); only the shown numbers change.
export function scaleGoldSeries(series, factor) {
  if (!series || factor === 1) return series
  const k = (v) => (Number.isFinite(v) ? v * factor : v)
  return {
    ...series,
    prices: series.prices.map(k),
    ohlc: series.ohlc.map((b) => ({ o: k(b.o), h: k(b.h), l: k(b.l), c: k(b.c) })),
    current: k(series.current),
    previousClose: k(series.previousClose),
  }
}

// [{ key, price }] — the per-baht-weight price spread over THAI_GOLD_UNITS.
export function thaiGoldUnitPrices(pricePerBaht) {
  if (!Number.isFinite(pricePerBaht)) return []
  return THAI_GOLD_UNITS.map(({ key, baht }) => ({ key, price: pricePerBaht * baht }))
}

// THB for one baht-weight of 96.5% gold, given USD per troy ounce (of pure
// gold) and THB per USD. null when either input isn't a usable number.
export function bahtGoldPrice(usdPerOz, thbPerUsd) {
  if (!Number.isFinite(usdPerOz) || !Number.isFinite(thbPerUsd) || usdPerOz <= 0 || thbPerUsd <= 0) return null
  return usdPerOz * thbPerUsd * (GRAMS_PER_BAHT_WEIGHT / GRAMS_PER_TROY_OZ) * THAI_GOLD_PURITY
}

// Builds the baht-gold series from a GC=F quote and a THB=X quote (both in
// the Worker's shape: prices[] with parallel ohlc[] and timestamps[]).
//
// The two markets don't tick together (COMEX vs. 24h forex; different
// holidays), so each gold point is paired with the latest USD/THB point at
// or before it (an as-of join), falling back to the first FX point for gold
// points older than the whole FX series. Without an FX series at all, a
// single fallback rate (today's rate from fx.js) is used for every point —
// the band is then the USD band, but the prices are still in baht.
//
// Returns { prices, ohlc, timestamps, current, previousClose } in THB, or
// null if there's nothing to convert.
export function toBahtGoldSeries(gold, fx, fallbackRate = null) {
  if (!gold || !Array.isArray(gold.prices) || !gold.prices.length) return null
  const fxTs = Array.isArray(fx?.timestamps) ? fx.timestamps : []
  const fxPrices = Array.isArray(fx?.prices) ? fx.prices : []
  const hasFx = fxPrices.length > 0 && fxPrices.length === fxTs.length

  let j = 0
  const rateAt = (ts) => {
    if (!hasFx) return fallbackRate
    if (typeof ts !== 'number') return fxPrices[fxPrices.length - 1]
    // Gold timestamps are ascending, so the FX cursor only moves forward.
    while (j + 1 < fxTs.length && typeof fxTs[j + 1] === 'number' && fxTs[j + 1] <= ts) j++
    return fxPrices[j]
  }

  const prices = []
  const ohlc = []
  const timestamps = []
  for (let i = 0; i < gold.prices.length; i++) {
    const ts = gold.timestamps?.[i] ?? null
    const rate = rateAt(ts)
    const c = bahtGoldPrice(gold.prices[i], rate)
    if (c == null) continue
    const k = c / gold.prices[i]
    const bar = gold.ohlc?.[i]
    prices.push(c)
    ohlc.push(bar ? { o: bar.o * k, h: bar.h * k, l: bar.l * k, c } : { o: c, h: c, l: c, c })
    timestamps.push(ts)
  }
  if (!prices.length) return null

  // Today's price uses today's FX rate (the live THB=X quote, else the
  // fallback); yesterday's close uses the rate that applied to it.
  const liveRate = hasFx && Number.isFinite(fx.current) ? fx.current : (hasFx ? fxPrices[fxPrices.length - 1] : fallbackRate)
  const current = bahtGoldPrice(gold.current, liveRate) ?? prices[prices.length - 1]
  const prevRate = hasFx && Number.isFinite(fx.previousClose) ? fx.previousClose : liveRate
  const previousClose = bahtGoldPrice(gold.previousClose, prevRate)

  return { prices, ohlc, timestamps, current, previousClose }
}
