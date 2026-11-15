import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyCategory, requiresPoints, summarize, slug } from '../classify.mjs'

test('category: title wins over description words', () => {
  assert.equal(classifyCategory('Travel Insurance', 'covers hotel dining'), 'insurance')
  assert.equal(classifyCategory('Complimentary Access to The MIRACLE LOUNGE'), 'lounge')
  assert.equal(classifyCategory('Enjoy the First-Year Annual Fee Waiver', 'earn points'), 'other')
  assert.equal(classifyCategory('Easy Installments', 'pay over 10 months'), 'other')
})

test('requiresPoints is true only when using the privilege costs points', () => {
  assert.equal(requiresPoints('Free movie ticket', 'Redeem 3,000 points for a movie voucher'), true)
  assert.equal(requiresPoints('Rewards Points', 'Every 25 THB spent earns 1 point. Points can be redeemed at stores.'), false)
  assert.equal(requiresPoints('Lounge', 'Two visits per year'), false)
})

test('summarize caps length at a sentence boundary', () => {
  const long = 'First sentence here. ' + 'word '.repeat(100)
  const s = summarize(long, 60)
  assert.ok(s.length <= 62)
  assert.equal(summarize('short text'), 'short text')
})

test('slug is stable and url-safe', () => {
  assert.equal(slug('Cash Withdrawal of up to 100% of the Credit Limit'), 'cash-withdrawal-of-up-to-100-of-the-credit-limit')
  assert.equal(slug('Tap & go'), 'tap-and-go')
})
