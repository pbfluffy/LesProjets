import test from 'node:test'
import assert from 'node:assert/strict'
import { filterPerks, cleanPerk, isExpired, cardLabel, cardFullName, resolveCards } from './perks.js'

const cards = [
  { id: 'a', name: 'Alpha', perks: [
    { id: '1', title: 'Lounge', category: 'lounge', requiresPoints: false, minSpend: null },
    { id: '2', title: 'Flight redeem', category: 'travel', requiresPoints: true, pointsCost: 20000, minSpend: null },
    { id: '3', title: 'Old promo', category: 'dining', requiresPoints: false, minSpend: 500, validUntil: '2020-01-01' },
  ] },
  { id: 'b', name: 'Beta', perks: [
    { id: '4', title: 'Cafe discount', category: 'dining', requiresPoints: false, minSpend: 500, conditions: 'weekdays' },
  ] },
]
const T = new Date('2026-06-01')
const titles = (rows) => rows.map((r) => r.perk.title)

test('no filters hides expired and puts free perks first', () => {
  assert.deepEqual(titles(filterPerks(cards, {}, T)), ['Cafe discount', 'Lounge', 'Flight redeem'])
})
test('points=free excludes point-redemption perks', () => {
  assert.ok(!titles(filterPerks(cards, { points: 'free' }, T)).includes('Flight redeem'))
})
test('points=points keeps only point perks', () => {
  assert.deepEqual(titles(filterPerks(cards, { points: 'points' }, T)), ['Flight redeem'])
})
test('category + spend filters combine', () => {
  assert.deepEqual(titles(filterPerks(cards, { categories: ['dining'], spend: 'none' }, T)), [])
  assert.deepEqual(titles(filterPerks(cards, { categories: ['dining'] }, T)), ['Cafe discount'])
})
test('expired can be shown', () => {
  assert.ok(titles(filterPerks(cards, { hideExpired: false }, T)).includes('Old promo'))
})
test('card filter and multi-word search', () => {
  assert.deepEqual(titles(filterPerks(cards, { cardId: 'b' }, T)), ['Cafe discount'])
  assert.deepEqual(titles(filterPerks(cards, { search: 'cafe week' }, T)), ['Cafe discount'])
})
test('cleanPerk normalises', () => {
  assert.equal(cleanPerk({ title: '  ' }), null)
  const p = cleanPerk({ title: 'X', requiresPoints: false, pointsCost: '500', minSpend: '', validUntil: 'bad' })
  assert.equal(p.pointsCost, null)
  assert.equal(p.minSpend, null)
  assert.equal(p.validUntil, null)
  assert.equal(cleanPerk({ title: 'Y', requiresPoints: true, pointsCost: '1500' }).pointsCost, 1500)
})
test('card labels include the bank, and tolerate cards saved without one', () => {
  assert.equal(cardFullName({ bank: 'KBank', name: 'The Wisdom' }), 'KBank The Wisdom')
  assert.equal(cardFullName({ name: 'Old card' }), 'Old card')
  assert.equal(cardLabel({ bank: 'SCB', name: 'M', nickname: 'Daily' }), 'Daily')
  assert.equal(cardLabel({ bank: 'SCB', name: 'M' }), 'SCB M')
})
test('search matches the bank name', () => {
  const rows = filterPerks([{ id: 'x', bank: 'KBank', name: 'Platinum', perks: [{ id: '1', title: 'Lounge', category: 'lounge', requiresPoints: false }] }], { search: 'kbank lounge' })
  assert.equal(rows.length, 1)
})
test('isExpired', () => {
  assert.equal(isExpired({ validUntil: '2026-06-01' }, new Date('2026-06-01T12:00:00')), false)
  assert.equal(isExpired({ validUntil: '2026-05-31' }, T), true)
})

const catalog = {
  ktc: {
    bank: { id: 'ktc', name: 'Krungthai (KTC)' },
    scannedAt: '2026-11-15T00:00:00.000Z',
    cards: [{ id: 'ktc-visa-platinum', name: 'Visa Platinum', url: 'https://example.test/c', perks: [
      { id: 'travel-insurance', title: 'Travel Insurance', category: 'insurance', requiresPoints: false, conditions: 'Flights.' },
    ] }],
  },
}
test('autoPerksFor / resolveCards merge catalog privileges in front of own ones', () => {
  const mine = { id: 'm', bank: 'Krungthai (KTC)', name: 'Visa Platinum', catalogRef: { bank: 'ktc', card: 'ktc-visa-platinum' }, perks: [{ id: 'own', title: 'My perk', category: 'other', requiresPoints: false }] }
  const [r] = resolveCards([mine], catalog)
  assert.deepEqual(r.perks.map((p) => p.id), ['auto:travel-insurance', 'own'])
  assert.equal(r.perks[0].auto, true)
  assert.equal(r.perks[0].sourceUrl, 'https://example.test/c')
  assert.equal(r.perks[0].checkedAt, '2026-11-15T00:00:00.000Z')
  assert.equal(mine.perks.length, 1) // input is not mutated
})
test('cards without a catalog link, or whose catalog entry is gone, are left unchanged', () => {
  const plain = { id: 'p', name: 'Plain', perks: [] }
  const gone = { id: 'g', name: 'Gone', catalogRef: { bank: 'ktc', card: 'ktc-discontinued' }, perks: [] }
  assert.deepEqual(resolveCards([plain, gone], catalog), [plain, gone])
  assert.deepEqual(resolveCards([plain], {}), [plain])
})
test('catalog privileges are searchable and filterable like any other', () => {
  const mine = { id: 'm', bank: 'Krungthai (KTC)', name: 'Visa Platinum', catalogRef: { bank: 'ktc', card: 'ktc-visa-platinum' }, perks: [] }
  const rows = filterPerks(resolveCards([mine], catalog), { categories: ['insurance'], points: 'free' })
  assert.equal(rows.length, 1)
})
