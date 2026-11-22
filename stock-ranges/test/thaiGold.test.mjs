import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseThaiGoldPage, bangkokTime, getThaiGoldPrice, htmlToText } from '../worker/src/thaiGold.js'

// Hand-written in the shape of goldtraders.or.th's server-rendered markup
// (spans split across divs, a script that must be ignored).
const page = ({ time = '09:09', round = 1, barBuy = '56,950.00', barSell = '57,150.00', ornBase = '55,803.96', ornSell = '57,950.00', chPrev = '0.00', chDay = '-150.00' } = {}) => `
<html><head><script>var x = "ทองคำแท่ง 96.5% รับซื้อ 1.00"</script></head><body>
<div><span>ราคาทองตามประกาศ</span><span>สมาคมค้าทองคำ</span></div>
<p>ประจำวันที่ 22/11/2569 เวลา ${time} (ครั้งที่ ${round})</p>
<div><span>ทองคำแท่ง</span><span>96.5%</span></div>
<div><span>รับซื้อ</span><span>${barBuy}</span></div><div><span>ขายออก</span><span>${barSell}</span></div>
<div><span>ทองรูปพรรณ</span><span>96.5%</span></div>
<div><span>ฐานภาษี</span><span>${ornBase}</span></div><div><span>ขายออก</span><span>${ornSell}</span></div>
<div><span>เทียบกับประกาศก่อนหน้า</span><span>${chPrev}</span></div>
<div><span>เทียบกับวันก่อนหน้า</span><span>${chDay}</span></div>
</body></html>`

test('bangkokTime converts a Buddhist-era date and Bangkok time to unix seconds', () => {
  assert.equal(bangkokTime(22, 11, 2569, 9, 9), Date.UTC(2026, 10, 22, 2, 9) / 1000)
})

test('htmlToText drops scripts and tags', () => {
  assert.equal(htmlToText('<script>no</script><b>a</b>  <i>b</i>').trim(), 'a b')
})

test('parseThaiGoldPage reads the announcement', () => {
  assert.deepEqual(parseThaiGoldPage(page()), {
    source: 'goldtraders.or.th',
    announcedAt: Date.UTC(2026, 10, 22, 2, 9) / 1000,
    round: 1,
    bar: { buy: 56950, sell: 57150 },
    ornament: { taxBase: 55803.96, sell: 57950 },
    changeFromPrevious: 0,
    changeFromYesterday: -150,
  })
  const later = parseThaiGoldPage(page({ time: '14:32', round: 7, chPrev: '+50.00' }))
  assert.equal(later.round, 7)
  assert.equal(later.changeFromPrevious, 50)
})

test('parseThaiGoldPage rejects a changed layout or implausible prices', () => {
  assert.equal(parseThaiGoldPage('<p>Loading latest prices...</p>'), null)
  assert.equal(parseThaiGoldPage(page({ barBuy: '569.50' })), null) // not a baht-weight price
  assert.equal(parseThaiGoldPage(page({ barBuy: '57,350.00' })), null) // buy above sell
  assert.equal(parseThaiGoldPage(null), null)
})

test('getThaiGoldPrice returns null on HTTP errors and network failures', async () => {
  assert.equal((await getThaiGoldPrice(async () => ({ ok: true, text: async () => page() }))).bar.sell, 57150)
  assert.equal(await getThaiGoldPrice(async () => ({ ok: false, text: async () => '' })), null)
  assert.equal(await getThaiGoldPrice(async () => { throw new Error('down') }), null)
})
