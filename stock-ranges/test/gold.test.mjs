import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bahtGoldPrice, toBahtGoldSeries, thaiGoldUnitPrices, GRAMS_PER_BAHT_WEIGHT, GRAMS_PER_TROY_OZ, THAI_GOLD_PURITY } from '../src/gold.js'

const K = (GRAMS_PER_BAHT_WEIGHT / GRAMS_PER_TROY_OZ) * THAI_GOLD_PURITY

test('bahtGoldPrice converts USD/oz to THB per baht-weight of 96.5% gold', () => {
  // ~0.473 oz of pure gold in one baht-weight of 96.5% gold.
  assert.ok(Math.abs(K - 0.47296) < 0.0001)
  assert.ok(Math.abs(bahtGoldPrice(2000, 35) - 2000 * 35 * K) < 1e-9)
  assert.equal(bahtGoldPrice(null, 35), null)
  assert.equal(bahtGoldPrice(2000, 0), null)
  assert.equal(bahtGoldPrice(NaN, 35), null)
})

test('toBahtGoldSeries pairs each gold point with the latest FX point at or before it', () => {
  const gold = {
    prices: [100, 110, 120],
    ohlc: [{ o: 99, h: 101, l: 98, c: 100 }, { o: 109, h: 111, l: 108, c: 110 }, { o: 119, h: 121, l: 118, c: 120 }],
    timestamps: [10, 20, 30],
    current: 125,
    previousClose: 120,
  }
  // FX ticks at 5 and 25 only: gold@10 and @20 use 30, gold@30 uses 40.
  const fx = { prices: [30, 40], timestamps: [5, 25], current: 41, previousClose: 40 }
  const out = toBahtGoldSeries(gold, fx)
  assert.deepEqual(out.prices.map((p) => +(p / K).toFixed(6)), [3000, 3300, 4800])
  assert.equal(+(out.ohlc[2].h / K).toFixed(6), 121 * 40)
  assert.deepEqual(out.timestamps, [10, 20, 30])
  assert.equal(+(out.current / K).toFixed(6), 125 * 41)
  assert.equal(+(out.previousClose / K).toFixed(6), 120 * 40)
})

test('toBahtGoldSeries uses the first FX point for gold older than the FX series', () => {
  const out = toBahtGoldSeries({ prices: [100], timestamps: [1], current: 100 }, { prices: [30], timestamps: [50] })
  assert.equal(+(out.prices[0] / K).toFixed(6), 3000)
})

test('toBahtGoldSeries falls back to one rate when there is no FX series', () => {
  const out = toBahtGoldSeries({ prices: [100, 200], timestamps: [1, 2], current: 200, previousClose: 100 }, null, 35)
  assert.deepEqual(out.prices.map((p) => +(p / K).toFixed(6)), [3500, 7000])
  assert.equal(+(out.previousClose / K).toFixed(6), 3500)
})

test('thaiGoldUnitPrices spreads the per-baht price over baht, salueng and gram', () => {
  const out = Object.fromEntries(thaiGoldUnitPrices(40000).map(({ key, price }) => [key, price]))
  assert.equal(out.baht, 40000)
  assert.equal(out.twoSalueng, 20000)
  assert.equal(out.salueng, 10000)
  assert.ok(Math.abs(out.gram - 40000 / 15.244) < 1e-9)
  assert.deepEqual(thaiGoldUnitPrices(null), [])
})

test('toBahtGoldSeries returns null with no gold data or no rate at all', () => {
  assert.equal(toBahtGoldSeries(null, null, 35), null)
  assert.equal(toBahtGoldSeries({ prices: [] }, null, 35), null)
  assert.equal(toBahtGoldSeries({ prices: [100], timestamps: [1], current: 100 }, null, null), null)
})
