import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCardSlugs, parseCardPage, prettyName } from '../krungsri.mjs'

const URL = 'https://www.krungsricard.com/en/product/creditcard/'

test('parseCardSlugs keeps real card pages, drops staging and hash duplicates', () => {
  const xml = `<urlset>
    <url><loc>https://www.krungsricard.com/th/product/creditcard/krungsri-visa-platinum</loc></url>
    <url><loc>https://www.krungsricard.com/th/product/creditcard/krungsri-visa-platinum-uat</loc></url>
    <url><loc>https://www.krungsricard.com/en/product/creditcard/now</loc></url>
    <url><loc>https://www.krungsricard.com/th/product/creditcard/krungsri-private-banking-886d2a5d6d8d58981698549bbc71e904</loc></url>
    <url><loc>https://www.krungsricard.com/th/promotion/category/everyday</loc></url>
  </urlset>`
  assert.deepEqual(parseCardSlugs(xml), ['krungsri-visa-platinum', 'now'])
})

test('card names come from the slug', () => {
  assert.equal(prettyName('krungsri-visa-platinum'), 'Visa Platinum')
  assert.equal(prettyName('now'), 'NOW Platinum')
  assert.equal(prettyName('krungsri-new-gold-card'), 'New Gold Card') // unknown slugs are prettified
})

// Layout A (trimmed real markup): tiles + popups + footer strip.
const GRID = `<html><body><div class="sc-footer"><div class="sc-footer-item"><p class="sc-footer-text-title"><span>Up to 2X*</span><br class="d-none" /> Krungsri Points</p>
<p class="sc-footer-text-desc">at participating Department Stores</p></div></div>
<div class="card-grid-row">
<div class="card-grid-item"><div class="card-grid-item-text"><h3 class="card-grid-item-title">Receive up<br>to 20%* <span class="nw">discount </span> at participating <span class="nw">restaurants</span></h3>
  <a href="#popup-pb4" class="card-grid-item-link">more details</a></div></div>
<div class="card-grid-item"><div class="card-grid-item-text"><h3 class="card-grid-item-title">Up to 6M THB* travel insurance coverage</h3><a href="/en/travel-insurance">more details</a></div></div>
</div>
<div id="popup-pb4"><h2>Terms &amp; Conditions</h2> Up to 20% off at partner restaurants. 1 Jul 2026 – 31 Dec 2026</div>
<section><h2>Other Benefits</h2></section></body></html>`

test('layout A: tile titles keep their spaces, popups supply the conditions', () => {
  const c = parseCardPage(GRID, URL + 'krungsri-visa-platinum')
  assert.equal(c.name, 'Visa Platinum')
  const dining = c.perks.find((p) => p.title.includes('restaurants'))
  assert.equal(dining.title, 'Receive up to 20%* discount at participating restaurants')
  assert.equal(dining.category, 'dining')
  assert.match(dining.conditions, /Up to 20% off at partner restaurants/)
  assert.ok(!/Terms/.test(dining.conditions))
  assert.equal(c.perks.find((p) => /insurance/.test(p.title)).category, 'insurance')
  assert.ok(c.perks.some((p) => /Up to 2X\* Krungsri Points at participating Department Stores/.test(p.title))) // footer strip
})

// Layout B (trimmed real markup): titled sections with an article and a T&C modal.
const SECTION = `<html><body>
<section class="ctn-card-detail"><h2>Platinum Benefit</h2></section>
<section class="ctn-card-detail"><div class="col-12"><h2>Earn Krungsri Point up to 2X*</h2><article><div id="isPasted"><article>at participating Department Stores.</article></div></article>
  <div data-target="#_idLift1" data-toggle="modal"><button>more details and conditions</button></div></div>
  <div class="modal" id="_idLift1"><h5>Terms &amp; Conditions</h5><div>Earn up to 2X* points when spending at Central. ลดสูงสุด Limit 120 points/month</div></div></section>
<section class="ctn-card-detail"><h2>Redeem points for a coffee</h2><article>Redeem 500 points.</article></section>
<section class="ctn-card-detail"><h2>Other Benefits</h2></section>
<section class="ctn-card-detail"><h2>Fee</h2></section>
</body></html>`

test('layout B: headings, articles and modals; generic headings and Thai text are dropped', () => {
  const c = parseCardPage(SECTION, URL + 'krungsri-platinum-mastercard')
  assert.deepEqual(c.perks.map((p) => p.title), ['Earn Krungsri Point up to 2X*', 'Redeem points for a coffee'])
  const [earn, redeem] = c.perks
  assert.match(earn.conditions, /at participating Department Stores\. .*Earn up to 2X\* points when spending at Central/)
  assert.ok(!/[฀-๿]/.test(earn.conditions))
  assert.equal(earn.requiresPoints, false) // earning points is not spending them
  assert.equal(redeem.requiresPoints, true)
})

test('the same privilege listed in a tile and in the footer strip appears once', () => {
  const html = `<div class="sc-footer-item"><p class="sc-footer-text-title">Up to 20%* Discount</p><p class="sc-footer-text-desc">at participating restaurants</p></div>
    <div class="card-grid-item"><h3 class="card-grid-item-title">Receive up to 20%* discount at participating restaurants</h3></div>`
  assert.equal(parseCardPage(html, URL + 'x').perks.length, 1)
})
