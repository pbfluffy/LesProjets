import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCardLinks, parseCardPage, parseDiscontinued } from '../ktc.mjs'
import { validate } from '../scan.mjs'

// Trimmed from the real markup of ktc.co.th card pages (structure only).
const LIST = `<a href="/en/credit-card/generic/ktc-visa-platinum">x</a>
<a href="/en/credit-card/generic/ktc-x-visa-signature">y</a>
<a href="/en/credit-card/generic/ktc-visa-platinum">dup</a>
<a href="/en/credit-card/personal/generic">not a card</a>`

const PAGE = `<html><head><title>KTC : บริษัท บัตรกรุงไทย จำกัด (มหาชน)</title></head><body>
<span class="typo-body weight-700 text-text"><div class="rich-text-lexical"><h3><span>Travel Insurance</span></h3></div></span>
<div><span class="typo-label description "><div class="rich-text-lexical"><p><span>Insurance coverage for flights and lost baggage.</span></p><p><a><span>More Details</span></a></p></div></span></div>
<span class="typo-body weight-700 text-text"><div class="rich-text-lexical"><h3><span>Rewards Points </span></h3></div></span>
<div><span class="typo-label description "><div class="rich-text-lexical"><p><span>Every 25 THB spent earns 1 point. Points can be redeemed at stores.</span></p></div></span></div>
<span class="typo-body weight-700 text-text"><div class="rich-text-lexical"><h3><span>Application details</span></h3></div></span>
<div hidden id="S:4"><div class="highlight-benefit-item-0"><div class="typo-subheader"><div class="rich-text-lexical"><h2><span>Apply Today!</span><br/><span>Complimentary Access to</span><span>The MIRACLE LOUNGE twice a year</span></h2></div></div>
<div class="free-html"><div class="rich-text-lexical"><ul><li>Cardholders may visit the lounge 2 times per year.</li></ul></div></div></div></div>
</body></html>`

test('parseCardLinks finds each card page once, ignoring non-card links', () => {
  assert.deepEqual(parseCardLinks(LIST), [
    'https://www.ktc.co.th/en/credit-card/generic/ktc-visa-platinum',
    'https://www.ktc.co.th/en/credit-card/generic/ktc-x-visa-signature',
  ])
})

test('parseCardPage names the card from the URL, not the page title', () => {
  const c = parseCardPage(PAGE, 'https://www.ktc.co.th/en/credit-card/generic/ktc-x-visa-signature')
  assert.equal(c.id, 'ktc-x-visa-signature')
  assert.equal(c.name, 'X Visa Signature')
})

test('parseCardPage reads titled blocks and highlight blocks', () => {
  const c = parseCardPage(PAGE, 'https://www.ktc.co.th/en/credit-card/generic/ktc-visa-platinum')
  const by = Object.fromEntries(c.perks.map((p) => [p.title, p]))
  assert.equal(c.perks.length, 3) // "Application details" has no description and is skipped
  assert.equal(by['Travel Insurance'].category, 'insurance')
  assert.equal(by['Travel Insurance'].conditions, 'Insurance coverage for flights and lost baggage.') // no "More Details"
  assert.equal(by['Rewards Points'].requiresPoints, false) // earns points, does not cost them
  const lounge = by['Complimentary Access to The MIRACLE LOUNGE twice a year']
  assert.equal(lounge.category, 'lounge')
  assert.match(lounge.conditions, /2 times per year/)
})

test('parseDiscontinued flags cards closed to new applicants', () => {
  const html = `<div class="mb-4"><div><h3 class="x">KTC VISA GOLD</h3></div><div class="mt-1"><span class="r">Application for this card has been discontinued</span></div></div>
<div class="mb-4"><div><h3 class="x">KTC VISA PLATINUM</h3></div><div class="mt-1"><span class="r">No annual fee</span></div></div>`
  assert.deepEqual([...parseDiscontinued(html)], ['ktc-visa-gold'])
})

test('validate refuses scans that look like a broken parser', () => {
  assert.ok(validate({ cards: [] }).length > 0)
  const ok = { cards: Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i, name: 'C', perks: [{}, {}] })) }
  assert.deepEqual(validate(ok), [])
  ok.cards[0].perks = []
  assert.ok(validate(ok).length > 0)
})
