import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickGoldHeadlines, goldMoves, parseGoldExplanation, buildGoldNews, buildGoldPrompt, GOLD_MECHANISMS } from '../worker/src/goldNews.js'

const NOW = Date.UTC(2026, 10, 22, 6)
const item = (title, hoursAgo, extra = {}) => ({ title, publisher: 'Pub', link: 'https://example.com/a', providerPublishTime: Math.floor((NOW - hoursAgo * 3600e3) / 1000), ...extra })

test('pickGoldHeadlines keeps recent gold price headlines and drops miner noise', () => {
  const out = pickGoldHeadlines([
    item('UBS flags further gold weakness before Fed rate-cut expectations return', 12),
    item('Goldman favours gold over silver as central bank demand supports prices', 13),
    item('Royal Gold Heads 3 Top Gold Stocks To Watch', 6),
    item('Arizona Gold and Silver CEO highlights 59 g/t gold result – ICYMI', 17),
    item('Gold prices slip as dollar firms', 24 * 8), // older than a week
    item('UBS flags further gold weakness before Fed rate-cut expectations return', 14), // duplicate
    item('Oil prices rise on supply worries', 2), // not gold
    item('Gold rallies to record high', 1, { link: 'javascript:alert(1)' }),
  ], NOW)
  assert.deepEqual(out.map((h) => h.title), [
    'Gold rallies to record high',
    'UBS flags further gold weakness before Fed rate-cut expectations return',
    'Goldman favours gold over silver as central bank demand supports prices',
  ])
  assert.equal(out[0].link, null) // only https links are passed through
  assert.deepEqual(pickGoldHeadlines(null, NOW), [])
})

test('pickGoldHeadlines needs the price word next to "gold" and drops personal-finance stories', () => {
  const keep = [
    'UBS flags further gold weakness before Fed rate-cut expectations return',
    'Goldman favours gold over silver as central bank demand supports prices',
    "Peter Schiff Says Gold's $2,000 Pullback Could Be A Warning — 'Stocks Will Ultimately Fall Much Further'",
    'Gold Takes a Beating as Hawkish Fed Sparks Worst Week in Eight Months',
    'Gold prices slip as dollar firms',
    'Bullion rebounds after Fed minutes',
  ]
  const drop = [
    // "record" is six words away from "gold": a story about one family, not the market.
    'He Handed His Daughter 50 Ounces of Gold in January, Worth $265,920 at the Record Close. It’s Down to About $177,000 Now, and if He Needs Medicaid, His Penalty Will Still Be Figured on $265,920',
    'I’m 62 and hold gold in my IRA — prices fell, should I sell before I retire?',
    'My husband wants to sell our gold coins now that prices dropped',
    'Gold Fields CEO steps down after record year', // miner name
    'Olympic gold medalist sees ticket prices rise', // not the metal
  ]
  // The ones to drop are the newest, so the 6-headline cap can't hide a miss.
  const out = pickGoldHeadlines([...drop, ...keep].map((t, i) => item(t, i + 1)), NOW).map((h) => h.title)
  assert.deepEqual(out, keep)
})

test('goldMoves gives day, week and month change from daily closes', () => {
  const prices = Array.from({ length: 30 }, (_, i) => 100 + i) // 100 … 129
  const m = goldMoves({ prices, current: 129, previousClose: 128 })
  assert.equal(m.day, +(((129 - 128) / 128) * 100).toFixed(2))
  assert.equal(m.week, +(((129 - 124) / 124) * 100).toFixed(2))
  assert.equal(m.month, +(((129 - 108) / 108) * 100).toFixed(2))
  assert.deepEqual(goldMoves(null), { day: null, week: null, month: null })
})

const driver = (over = {}) => ({ effect: 'down', factor_en: 'Hawkish Fed', why_en: 'Higher rates make gold cost more to hold.', factor_th: 'เฟดเข้มงวด', why_th: 'ดอกเบี้ยสูงทำให้ถือทองมีต้นทุนมากขึ้น', ...over })

test('parseGoldExplanation reads summary + drivers from an object or JSON inside text', () => {
  const reply = { summary_en: ' Gold  fell. ', summary_th: 'ทองลง', drivers: [driver(), driver({ effect: 'up', factor_en: 'Central banks' })] }
  const out = parseGoldExplanation(reply)
  assert.deepEqual(out.summary, { en: 'Gold fell.', th: 'ทองลง' })
  assert.deepEqual(out.drivers[0], { effect: 'down', en: { factor: 'Hawkish Fed', why: 'Higher rates make gold cost more to hold.' }, th: { factor: 'เฟดเข้มงวด', why: 'ดอกเบี้ยสูงทำให้ถือทองมีต้นทุนมากขึ้น' } })
  assert.equal(out.drivers[1].effect, 'up')
  assert.deepEqual(parseGoldExplanation('Sure!\n```json\n' + JSON.stringify(reply) + '\n```').summary, { en: 'Gold fell.', th: 'ทองลง' })
})

test('parseGoldExplanation drops incomplete drivers, caps at 4, needs both summary languages', () => {
  const drivers = [driver({ effect: 'sideways' }), driver({ why_th: '' }), driver(), driver(), driver(), driver(), driver()]
  const out = parseGoldExplanation({ summary_en: 'x', summary_th: 'ย', drivers })
  assert.equal(out.drivers.length, 4)
  assert.ok(out.drivers.every((d) => d.effect === 'down' && d.th.why))
  // Old flat { en, th } replies still give a summary (no drivers).
  assert.deepEqual(parseGoldExplanation('{"en":"x","th":"ย"}'), { summary: { en: 'x', th: 'ย' }, drivers: [] })
  assert.deepEqual(parseGoldExplanation({ summary_en: 'x', drivers: [driver()] }), { summary: null, drivers: [] })
  assert.deepEqual(parseGoldExplanation('no json here'), { summary: null, drivers: [] })
  assert.deepEqual(parseGoldExplanation(undefined), { summary: null, drivers: [] })
})

test('buildGoldPrompt passes the move and only the given headlines', () => {
  const msgs = buildGoldPrompt({ day: -4.62, week: 1, month: null }, [{ title: 'Gold falls', publisher: 'P', ts: NOW }])
  assert.match(msgs[0].content, /ONLY from the headlines/)
  // The "why" comes from the fixed mechanism list, which is passed in full.
  for (const m of GOLD_MECHANISMS) assert.ok(msgs[1].content.includes(m))
  assert.match(msgs[1].content, /1 day -4\.62%, 1 week \+1\.00%, 1 month unknown/)
  assert.match(msgs[1].content, /1\. Gold falls \(P, 2026-11-22\)/)
})

test('buildGoldNews: summary from AI; degrades without AI, news or a usable reply', async () => {
  const news = { news: [item('Gold prices fall as dollar strengthens', 3)] }
  const fetchFn = async () => ({ ok: true, json: async () => news })
  const getGoldQuote = async () => ({ prices: [100, 110], current: 99, previousClose: 110 })
  let sent = null
  const ai = { run: async (model, input) => { sent = input; return { response: { summary_en: 'Gold fell as the dollar rose.', summary_th: 'ทองลงเพราะดอลลาร์แข็งค่า', drivers: [driver({ factor_en: 'Strong dollar' })] } } } }

  const full = await buildGoldNews({ fetchFn, ai, getGoldQuote, now: NOW })
  assert.equal(full.summary.en, 'Gold fell as the dollar rose.')
  assert.equal(full.drivers[0].en.factor, 'Strong dollar')
  assert.equal(full.headlines.length, 1)
  assert.equal(full.moves.day, -10)
  assert.ok(sent.messages[1].content.includes('Gold prices fall as dollar strengthens'))

  const noAi = await buildGoldNews({ fetchFn, ai: null, getGoldQuote, now: NOW })
  assert.equal(noAi.summary, null)
  assert.equal(noAi.headlines.length, 1)

  let aiCalled = false
  const noNews = await buildGoldNews({ fetchFn: async () => { throw new Error('down') }, ai: { run: async () => { aiCalled = true } }, getGoldQuote, now: NOW })
  assert.deepEqual(noNews.headlines, [])
  assert.equal(noNews.summary, null)
  assert.equal(aiCalled, false) // no headlines → no AI call to make things up from

  const badReply = await buildGoldNews({ fetchFn, ai: { run: async () => ({ response: 'I cannot help' }) }, getGoldQuote: async () => { throw new Error('x') }, now: NOW })
  assert.equal(badReply.summary, null)
  assert.deepEqual(badReply.moves, { day: null, week: null, month: null })
})
