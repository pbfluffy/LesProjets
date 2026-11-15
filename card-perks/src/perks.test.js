import test from 'node:test'
import assert from 'node:assert/strict'
import { filterPerks, cleanPerk, isExpired, cardLabel, cardFullName, resolveCards, cardBrand, promosFor, promoGroupCounts, perkHeadline, groupRows } from './perks.js'

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

// ---- restaurant promotions ----
const promoData = {
  ktc: {
    scannedAt: '2026-11-15T00:00:00.000Z',
    promos: [
      { id: 'restaurants-all', path: '/en/promotion/dining-restaurants/restaurants/all', group: 'restaurants', title: 'All Cards Cafe', summary: '10% off', end: '2027-01-31', brands: [], requiresPoints: false, minSpend: 500 },
      { id: 'restaurants-mc', path: '/en/promotion/dining-restaurants/restaurants/mc', group: 'restaurants', title: 'Mastercard Only Bistro', summary: '20% off', end: '2027-01-31', brands: ['mastercard'], requiresPoints: false, minSpend: null },
      { id: 'buffets-pts', path: '/en/promotion/dining-restaurants/buffets/pts', group: 'buffets', title: 'Points Buffet', summary: 'Redeem points', end: '2027-01-31', brands: [], requiresPoints: true, minSpend: null },
      { id: 'restaurants-old', path: '/en/promotion/dining-restaurants/restaurants/old', group: 'restaurants', title: 'Ended Diner', summary: 'gone', end: '2026-01-01', brands: [], requiresPoints: false, minSpend: null },
    ],
  },
}
const visaCard = { id: 'v', bank: 'Krungthai (KTC)', name: 'Visa Platinum', catalogRef: { bank: 'ktc', card: 'ktc-visa-platinum' }, perks: [] }
const mcCard = { id: 'm', bank: 'Krungthai (KTC)', name: 'Platinum Mastercard', catalogRef: { bank: 'ktc', card: 'ktc-platinum-mastercard' }, perks: [] }

test('cardBrand reads the brand from name or network', () => {
  assert.equal(cardBrand(visaCard), 'visa')
  assert.equal(cardBrand(mcCard), 'mastercard')
  assert.equal(cardBrand({ name: 'UnionPay Diamond' }), 'unionpay')
  assert.equal(cardBrand({ name: 'Gold', network: 'JCB' }), 'jcb')
  assert.equal(cardBrand({ name: 'Mystery' }), null)
})

test('promosFor limits brand-specific promotions to matching cards', () => {
  assert.deepEqual(promosFor(visaCard, promoData).map((p) => p.title), ['All Cards Cafe', 'Points Buffet', 'Ended Diner'])
  assert.deepEqual(promosFor(mcCard, promoData).map((p) => p.title), ['All Cards Cafe', 'Mastercard Only Bistro', 'Points Buffet', 'Ended Diner'])
})

test('promosFor ignores cards with no catalog link or a bank with no promotions', () => {
  assert.deepEqual(promosFor({ id: 'x', name: 'Plain', perks: [] }, promoData), [])
  assert.deepEqual(promosFor({ ...visaCard, catalogRef: { bank: 'other', card: 'a' } }, promoData), [])
  assert.deepEqual(promosFor(visaCard, {}), [])
})

test('promotion perks carry dining category, dates, source and a promo flag', () => {
  const [p] = promosFor(visaCard, promoData)
  assert.equal(p.category, 'dining')
  assert.equal(p.promo, true)
  assert.equal(p.validUntil, '2027-01-31')
  assert.equal(p.minSpend, 500)
  assert.equal(p.sourceUrl, 'https://www.ktc.co.th/en/promotion/dining-restaurants/restaurants/all')
  assert.equal(p.checkedAt, '2026-11-15T00:00:00.000Z')
})

test('filters: kind, points, expiry and sort treat promotions like any privilege', () => {
  const today = new Date('2026-11-15')
  const cards = resolveCards([{ ...visaCard, perks: [{ id: 'own', title: 'Own perk', category: 'other', requiresPoints: false }] }], catalog, promoData)
  const titles = (f) => filterPerks(cards, f, today).map((r) => r.perk.title)
  assert.ok(!titles({}).includes('Ended Diner')) // expired promotions are hidden
  assert.ok(titles({ hideExpired: false }).includes('Ended Diner'))
  assert.deepEqual(titles({ kind: 'promo' }), ['All Cards Cafe', 'Points Buffet'])
  assert.ok(!titles({ kind: 'privilege' }).includes('Points Buffet'))
  assert.deepEqual(titles({ kind: 'promo', points: 'points' }), ['Points Buffet'])
  assert.deepEqual(titles({ kind: 'promo', spend: 'none' }), ['Points Buffet'])
  assert.deepEqual(titles({ categories: ['dining'] }), ['All Cards Cafe', 'Points Buffet']) // promos are dining
  // the card's own privileges come before promotions
  assert.deepEqual(titles({}).slice(0, 2), ['Own perk', 'Travel Insurance'])
})

test('venue-type filter keeps promotions of the chosen types only', () => {
  const today = new Date('2026-11-15')
  const cards = resolveCards([{ ...visaCard, perks: [{ id: 'own', title: 'Own perk', category: 'other', requiresPoints: false }] }], catalog, promoData)
  const titles = (f) => filterPerks(cards, f, today).map((r) => r.perk.title)
  assert.deepEqual(titles({ groups: ['buffets'] }), ['Points Buffet']) // card privileges drop out
  assert.deepEqual(titles({ groups: ['buffets', 'restaurants'] }), ['All Cards Cafe', 'Points Buffet'])
  assert.deepEqual(titles({ groups: ['hotel-dining'] }), [])
  assert.deepEqual(titles({ groups: ['buffets'], points: 'free' }), []) // still combines with other filters
})

test('promoGroupCounts counts distinct promotions per type', () => {
  const today = new Date('2026-11-15')
  const two = resolveCards([visaCard, { ...visaCard, id: 'v2' }], catalog, promoData)
  assert.deepEqual(promoGroupCounts(filterPerks(two, {}, today)), { restaurants: 1, buffets: 1 })
  assert.deepEqual(promoGroupCounts(filterPerks(two, { kind: 'privilege' }, today)), {})
})

test('perkHeadline pulls the key figure out of a title or description', () => {
  assert.equal(perkHeadline({ title: 'Receive up to 20%* discount at participating restaurants' }), '20%')
  assert.equal(perkHeadline({ title: 'Earn 5X* Krungsri Points at Department Stores' }), '5X')
  assert.equal(perkHeadline({ title: 'Airport Lounge Access', conditions: 'Get 50% off a second visit' }), '50%')
  assert.equal(perkHeadline({ title: 'Airport Lounge Access', conditions: 'Two visits' }), '')
  assert.equal(perkHeadline({ title: 'Get up to 3.5%*,** cashback' }), '3.5%')
  assert.equal(perkHeadline({ title: '0% 10 months installments' }), '')
})

test('groupRows groups privileges by category, then promotions by venue type', () => {
  const cats = [{ id: 'dining', label: 'Dining', icon: 'D' }, { id: 'travel', label: 'Travel', icon: 'T' }, { id: 'other', label: 'Other', icon: 'O' }]
  const row = (id, category, extra = {}) => ({ card: { id: 'c' }, perk: { id, category, ...extra } })
  const g = groupRows([row('a', 'travel'), row('p1', 'dining', { promo: true, group: 'buffets' }), row('b', 'dining'), row('c', 'weird'), row('p2', 'dining', { promo: true, group: 'buffets' })], cats, { buffets: 'Buffets' })
  assert.deepEqual(g.map((x) => [x.label, x.rows.length]), [['Dining', 1], ['Travel', 1], ['Other', 1], ['Buffets', 2]])
})
