import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseLocs, isDiningPromoUrl, parseShortDate, parseBrands, parseMinSpend,
  promoRequiresPoints, isPointsOnly, privilegeParts, cleanTitle, withMerchant, benefitText, parsePromoPage,
} from '../ktc-promos.mjs'
import { validatePromos, shardPromos } from '../scan.mjs'

const BASE = 'https://www.ktc.co.th/en/promotion/dining-restaurants/'

test('parseLocs reads sitemap entries', () => {
  assert.deepEqual(parseLocs('<urlset><url><loc>https://a/1</loc></url><url><loc> https://a/2 </loc></url></urlset>'), ['https://a/1', 'https://a/2'])
})

test('only plain dining promotion pages are scanned (robots.txt blocks query URLs)', () => {
  assert.equal(isDiningPromoUrl(BASE + 'restaurants/krua-chay-klong'), true)
  assert.equal(isDiningPromoUrl(BASE + 'restaurants?page=4'), false)
  assert.equal(isDiningPromoUrl(BASE + 'restaurants/x?filter=ktcproud'), false)
  assert.equal(isDiningPromoUrl(BASE + 'hl-small-banner-upcountry-dinning'), false) // single segment: not a promotion
  assert.equal(isDiningPromoUrl('https://www.ktc.co.th/en/promotion/travel/air/x'), false)
})

test('parseShortDate handles 2- and 4-digit years', () => {
  assert.equal(parseShortDate('1 Feb 26'), '2026-02-01')
  assert.equal(parseShortDate('31 Jan 2027'), '2027-01-31')
  assert.equal(parseShortDate('soon'), null)
})

test('parseBrands: all KTC cards vs a specific brand', () => {
  assert.deepEqual(parseBrands('Promotion for all KTC credit cards'), [])
  assert.deepEqual(parseBrands('Promotion at X with KTC MASTERCARD credit card'), ['mastercard'])
  assert.deepEqual(parseBrands('Dining privilege for all KTC VISA cardmembers'), ['visa'])
  assert.deepEqual(parseBrands('KTC credit cards'), [])
})

test('parseMinSpend reads "spending N baht"', () => {
  assert.equal(parseMinSpend('Get 5% discount when spending 500 baht or more per sales slip'), 500)
  assert.equal(parseMinSpend('Free fruit when spending 1,290 Baht'), 1290)
  assert.equal(parseMinSpend('Redeem points for 10% off'), null)
})

test('promoRequiresPoints: points-only offers yes, mixed or earn-only no', () => {
  assert.equal(promoRequiresPoints('AKA Buffet', 'Redeem points for a 50% buffet discount.'), true)
  assert.equal(promoRequiresPoints('Krua', 'Free fruit when spending 990 Baht and redeem points for 10% cashback'), false)
  assert.equal(promoRequiresPoints('Hotel', 'Enjoy up to 20% discount (No Point Redemption)'), false)
})

test('cleanTitle drops boilerplate around the merchant name', () => {
  assert.equal(cleanTitle('Promotion at Krua Chay Khlong with KTC credit card and KTC cash card'), 'Krua Chay Khlong')
  assert.equal(cleanTitle('Dining Promotion at Grand Mercure Bangkok Atrium with KTC credit cards'), 'Grand Mercure Bangkok Atrium')
  assert.equal(cleanTitle('Boost Juice Bars Promotion: Redeem points with KTC credit cards'), 'Boost Juice Bars Promotion: Redeem points')
})

test('isPointsOnly: offers that open with a redemption, not ones with a plain route', () => {
  assert.equal(isPointsOnly('Redeem points to get 10% cash back For KTC Credit Card'), true)
  assert.equal(isPointsOnly('All KTC MASTERCARD Credit Cards Use 1 KTC FOREVER point to purchase an e-Voucher'), true)
  assert.equal(isPointsOnly('Redeem 3,200 KTC FOREVER points for e-Coupon 400 Baht when spending THB 2,000 or more'), true)
  assert.equal(isPointsOnly('Get a 10% discount and redeem points for a 10% cashback.'), false)
  assert.equal(isPointsOnly('Get 12% discount on all in one large set. Redeem points for more'), false)
  assert.equal(isPointsOnly('Earn 2x points when you redeem points'), false)
})

test('several privileges require points only if every one does', () => {
  const mixed = 'Privilege 1 All types of KTC Credit Card Get free tiramisu when spending 1,500 baht Privilege 2 Redeem 3,200 points for a coupon'
  assert.deepEqual(privilegeParts(mixed).length, 2)
  assert.equal(promoRequiresPoints('Bianca', 'x', privilegeParts(mixed)), false)
  const allPoints = 'Privilege 1 Redeem 500 points for 50 baht cash back Privilege 2 Redeem 1,000 points for 120 baht cash back'
  assert.equal(promoRequiresPoints('Cafe', 'x', privilegeParts(allPoints)), true)
})

test('cleanTitle handles the template titles seen on real pages', () => {
  assert.equal(cleanTitle('BIANCA x Mastercard Promotion: | KTC'), 'BIANCA x Mastercard')
  assert.equal(cleanTitle('Burger Bro Promotion: | KTC'), 'Burger Bro')
  assert.equal(cleanTitle('Special privileges for KTC credit and KTC PROUD cash card at BANPHO RI'), 'BANPHO RI')
  assert.equal(cleanTitle('Level 50'), 'Level 50')
})

test('withMerchant adds the restaurant name only when the title lacks it', () => {
  assert.equal(withMerchant('Redeem points for cash back', 'baan-imsabai'), 'Baan Imsabai — Redeem points for cash back')
  assert.equal(withMerchant('Bianca x Mastercard', 'bianca-x-mastercard'), 'Bianca x Mastercard')
  assert.equal(withMerchant('Level 50', 'level50'), 'Level 50') // spacing differences don't count
  assert.equal(withMerchant('137 Pillars Suites & Residences Bangkok Dining', '137pillarsbangkok'), '137 Pillars Suites & Residences Bangkok Dining')
})

test('benefitText takes the text after the period and stops before branches and terms', () => {
  const after = 'Privilege 1All types of KTC Credit CardPrivilege1 : Get free tiramisu when spending 1,500 baht.Details and ConditionsParticipating Branches Siam'
  const b = benefitText(after)
  assert.match(b, /Get free tiramisu when spending 1,500 baht/)
  assert.ok(!/Participating Branches|Details and Conditions/.test(b))
  assert.ok(!/Privilege/.test(b))
})

const PAGE = (period, extra = '') => `<html><head>
<title>Promotion at Krua Chay​ Khlong with KTC credit card</title>
<meta name="description" content="Free fruit when spending 990 baht. Redeem points for 10% cashback ${extra}">
</head><body><nav>Menu</nav><main><h1>x</h1><div>Period ${period}Get free 1 seasonal fruit</div></main><script>var a="Period 1 Jan 20 - 2 Jan 20"</script></body></html>`

test('parsePromoPage reads a live promotion', () => {
  const today = new Date('2026-11-15T00:00:00+07:00')
  const p = parsePromoPage(PAGE('1 Feb 26 - 31 Jan 27'), BASE + 'restaurants/krua-chay-klong', today)
  assert.equal(p.id, 'restaurants-krua-chay-klong')
  assert.equal(p.group, 'restaurants')
  assert.equal(p.path, '/en/promotion/dining-restaurants/restaurants/krua-chay-klong')
  assert.equal(p.title, 'Krua Chay Khlong') // zero-width char and boilerplate gone
  assert.equal(p.start, '2026-02-01')
  assert.equal(p.end, '2027-01-31')
  assert.equal(p.minSpend, 990)
  assert.equal(p.requiresPoints, false) // mixed offer: there is a spend-only way to get it
  assert.deepEqual(p.brands, [])
})

test('parsePromoPage falls back to the page body when the meta description is empty', () => {
  const html = `<html><head><title>BIANCA x Mastercard Promotion:  | KTC</title><meta name="description" content="BIANCA x Mastercard Promotion: ."></head>
<body><div>Period 1 Jul 26 - 31 Dec 26Privilege Get a free dessert valued at THB 290 with a minimum spend of THB 2,000 per sales slip when payment is made with KTC MASTERCARD credit card.Details and Conditions Participating Branches</div></body></html>`
  const p = parsePromoPage(html, BASE + 'restaurants/bianca-x-mastercard', new Date('2026-11-15T00:00:00+07:00'))
  assert.equal(p.title, 'BIANCA x Mastercard')
  assert.match(p.summary, /free dessert valued at THB 290/)
  assert.deepEqual(p.brands, ['mastercard'])
  assert.equal(p.requiresPoints, false)
})

test('parsePromoPage skips expired and undated promotions', () => {
  const today = new Date('2026-11-15T00:00:00+07:00')
  assert.equal(parsePromoPage(PAGE('15 Nov 24 - 31 Oct 25'), BASE + 'restaurants/old', today), null)
  assert.equal(parsePromoPage(PAGE('ask the restaurant '), BASE + 'restaurants/undated', today), null)
  // last day is still valid on that day
  assert.ok(parsePromoPage(PAGE('1 Nov 26 - 15 Nov 26'), BASE + 'restaurants/lastday', today))
})

test('validatePromos refuses a scan that looks broken', () => {
  const good = { pages: 1800, failed: 5, promos: Array.from({ length: 700 }, () => ({ end: '2027-01-01', title: 't' })) }
  assert.deepEqual(validatePromos(good), [])
  assert.ok(validatePromos({ ...good, pages: 10 }).length)
  assert.ok(validatePromos({ ...good, failed: 900 }).length)
  assert.ok(validatePromos({ ...good, promos: [] }).length)
  assert.ok(validatePromos({ ...good, promos: [{ end: null, title: 't' }, ...good.promos] }).length)
})

test('shardPromos splits into fixed-size shards', () => {
  const s = shardPromos(Array.from({ length: 1300 }, (_, i) => i), 600)
  assert.deepEqual(s.map((x) => x.length), [600, 600, 100])
  assert.deepEqual(shardPromos([], 600), [])
})
