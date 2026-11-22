// GET /gold-news — "Why gold moved" for the app's Gold tab.
//
// -> { updatedAt, moves: { day, week, month } (percent, null if unknown),
//      summary: { en, th } | null,
//      drivers: [{ effect: 'up'|'down', en: { factor, why }, th: { factor, why } }],
//      headlines: [{ title, publisher, link, ts }] }
//
// Yahoo's news search (same host as the quote/search routes) returns
// headlines only, and for "gold" most are mining-stock or "stocks to watch"
// pieces. So headlines are first narrowed to ones about gold's *price* and
// its usual drivers (Fed, dollar, yields, central-bank buying, safe-haven
// demand…), then Workers AI writes a 2–3 sentence EN + TH summary of those
// headlines next to the real GC=F move. The model is told to use only the
// headlines given and to say so when they don't explain the move — this is a
// news digest, not a forecast, and the app labels it as such.
//
// One AI call per cache window per Cloudflare location: the result is
// edge-cached for CACHE_SECONDS (index.js), under a key that changes every
// window, so the summary refreshes a few times a day and costs stay tiny.

export const GOLD_NEWS_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
export const CACHE_SECONDS = 3 * 60 * 60
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_HEADLINES = 6
const MAX_SUMMARY_CHARS = 700
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; stock-ranges/1.0)' }

const GOLD_RE = /\b(gold|bullion|xau)\b/i
// Words that make a gold headline about the price rather than a miner,
// a royalty company or a drill result.
const DRIVER_RE = /\b(prices?|rall(y|ies|ied)|record|highs?|lows?|falls?|fell|drop(s|ped)?|slump\w*|slips?|slipped|slide\w*|tumble\w*|plunge\w*|sink\w*|sank|rises?|rose|gains?|surge\w*|jump\w*|climb\w*|soar\w*|rebound\w*|retreat\w*|pullback|beating|weak(ness)?|strength|demand|fed|hawkish|dovish|rates?|dollar|yields?|inflation|safe[- ]haven|central banks?|futures|tariffs?|etf (outflows?|inflows?)|sell-?off)\b/i
const NOISE_RE = /stocks to watch|penny stock|g\/t|drill|resource estimate|royalt|ICYMI|exploration/i
// "Gold" that isn't the metal's market: company names, medals.
const NOT_THE_METAL_RE = /\b(gold fields|royal gold|gold medal\w*|olympic)\b/i
// One person's or family's money story (retirement, inheritance, "should I
// sell?"). It can quote the gold price, but says nothing about why it moved.
const PERSONAL_RE = /\b(i|i['’]m|i['’]ve|my|our|he|she|his|her|daughter|son|husband|wife|retire\w*|retiree\w*|medicaid|social security|ira|401\(k\)|inherit\w*|should i)\b/i
// How close (in words) a price/driver word must be to "gold": a headline
// that merely mentions gold somewhere and "record" somewhere else isn't
// about the gold market.
const DRIVER_WINDOW = 5

function driverNearGold(title) {
  const words = title.split(/\s+/)
  return words.some((w, i) => GOLD_RE.test(w)
    && DRIVER_RE.test(words.slice(Math.max(0, i - DRIVER_WINDOW), i + DRIVER_WINDOW + 1).join(' ')))
}

export function isGoldMarketHeadline(title) {
  return GOLD_RE.test(title)
    && !NOISE_RE.test(title)
    && !NOT_THE_METAL_RE.test(title)
    && !PERSONAL_RE.test(title)
    && driverNearGold(title)
}

// Keeps recent, de-duplicated, price-related gold headlines, newest first.
export function pickGoldHeadlines(news, now = Date.now()) {
  if (!Array.isArray(news)) return []
  const seen = new Set()
  const out = []
  for (const n of news) {
    const title = typeof n?.title === 'string' ? n.title.trim() : ''
    const ts = Number(n?.providerPublishTime) * 1000
    const link = typeof n?.link === 'string' && /^https:\/\//.test(n.link) ? n.link : null
    if (!title || !Number.isFinite(ts) || now - ts > MAX_AGE_MS) continue
    if (!isGoldMarketHeadline(title)) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title: title.slice(0, 200), publisher: String(n.publisher || '').slice(0, 60), link, ts })
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, MAX_HEADLINES)
}

const pct = (from, to) => (Number.isFinite(from) && Number.isFinite(to) && from > 0 ? ((to - from) / from) * 100 : null)

// Day / ~week / ~month change from a daily-interval GC=F quote (prices are
// trading-day closes, oldest first; `current` is the live price).
export function goldMoves(quote) {
  const p = Array.isArray(quote?.prices) ? quote.prices : []
  const cur = Number.isFinite(quote?.current) ? quote.current : p[p.length - 1]
  const back = (n) => (p.length > n ? p[p.length - 1 - n] : null)
  const round = (v) => (v == null ? null : Math.round(v * 100) / 100)
  return {
    day: round(pct(quote?.previousClose ?? back(1), cur)),
    week: round(pct(back(5), cur)),
    month: round(pct(back(21), cur)),
  }
}

const fmt = (v) => (v == null ? 'unknown' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)

// How each common driver moves the gold price — textbook relationships, given
// to the model so its "why" explanations come from this list rather than from
// whatever it improvises. *What happened* must still come from the headlines.
export const GOLD_MECHANISMS = [
  'Higher interest rates or a hawkish Fed (fewer/later rate cuts): gold pays no interest, so when bonds and savings pay more, holding gold costs more in lost interest and the price tends to fall. Expected rate cuts do the opposite.',
  'Rising real (after-inflation) bond yields: same effect as higher rates, gold tends to fall; falling real yields support it.',
  'Stronger US dollar: gold is priced in dollars, so it becomes more expensive for buyers using other currencies and demand drops, pushing the price down. A weaker dollar supports gold.',
  'Central bank buying: central banks buying gold for their reserves is large, steady demand that supports the price; central bank selling weighs on it.',
  'Safe-haven demand: wars, political or financial crises and market fear make investors buy gold as protection, pushing it up; when fear fades, that demand fades too.',
  'Stock market sell-offs: they can lift gold as a safe haven, but in sharp crashes investors sometimes sell gold to raise cash or cover losses, pushing it down short term.',
  'Inflation: gold is seen as a store of value when money loses purchasing power, so high or rising inflation tends to support it.',
  'Gold ETF flows: money flowing into gold funds means buying of physical gold (up); outflows mean selling (down).',
  'Profit-taking after a big rally: after a large rise, investors lock in gains by selling, which can cause sharp drops.',
  'Jewellery and physical demand (e.g. India, China, Thailand): strong buying supports the price, weak buying at high prices weighs on it.',
]

export function buildGoldPrompt(moves, headlines) {
  const list = headlines.map((h, i) => `${i + 1}. ${h.title} (${h.publisher}, ${new Date(h.ts).toISOString().slice(0, 10)})`).join('\n')
  const mechanisms = GOLD_MECHANISMS.map((m) => `- ${m}`).join('\n')
  return [
    {
      role: 'system',
      content: [
        'You explain gold price moves to everyday app users who are not finance experts.',
        'Facts about what happened (events, who said what, numbers) must come ONLY from the headlines given. Do not add events, numbers, forecasts or advice.',
        'To explain WHY a factor moves the gold price, use the mechanisms listed by the user, in plain simple words.',
        'If the headlines do not explain the move, say that no clear news reason was found and leave drivers empty.',
        'Reply with JSON only, no other text:',
        '{"summary_en": "2-3 sentences: what moved and the main reason", "summary_th": "same in natural Thai",',
        ' "drivers": [{"effect": "down" or "up", "factor_en": "short name, e.g. Hawkish Fed", "why_en": "1-2 sentences: what the headline says and how that pushes gold up or down",',
        '   "factor_th": "same in Thai", "why_th": "same in natural Thai"}]}',
        'Give 1 to 4 drivers, most important first. "effect" is the direction that factor pushes gold.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Gold (COMEX futures) price change: 1 day ${fmt(moves.day)}, 1 week ${fmt(moves.week)}, 1 month ${fmt(moves.month)}.\n\nHow common factors affect gold:\n${mechanisms}\n\nRecent headlines:\n${list}\n\nExplain why gold has moved recently and how each factor in these headlines affects its price.`,
    },
  ]
}

const MAX_DRIVERS = 4
const MAX_DRIVER_CHARS = 300

function parseJsonReply(response) {
  if (response && typeof response === 'object') return response
  if (typeof response !== 'string') return null
  const s = response.replace(/```(json)?/gi, '')
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a === -1 || b < a) return null
  try { return JSON.parse(s.slice(a, b + 1)) } catch { return null }
}

// Pulls { summary: {en, th}, drivers: [{ effect, en: {factor, why}, th: {factor, why} }] }
// out of the model's reply (an object, or a string with fences/prose around
// the JSON). summary is null if either language is missing; drivers with a
// missing field or an unknown effect are dropped rather than shown half-empty.
export function parseGoldExplanation(response) {
  const obj = parseJsonReply(response)
  const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const en = clean(obj?.summary_en ?? obj?.en, MAX_SUMMARY_CHARS)
  const th = clean(obj?.summary_th ?? obj?.th, MAX_SUMMARY_CHARS)
  const summary = en && th ? { en, th } : null
  const drivers = (Array.isArray(obj?.drivers) ? obj.drivers : [])
    .map((d) => ({
      effect: d?.effect === 'up' || d?.effect === 'down' ? d.effect : null,
      en: { factor: clean(d?.factor_en, 60), why: clean(d?.why_en, MAX_DRIVER_CHARS) },
      th: { factor: clean(d?.factor_th, 60), why: clean(d?.why_th, MAX_DRIVER_CHARS) },
    }))
    .filter((d) => d.effect && d.en.factor && d.en.why && d.th.factor && d.th.why)
    .slice(0, MAX_DRIVERS)
  return { summary, drivers: summary ? drivers : [] }
}

// Builds the /gold-news body. `fetchFn`, `ai` and `getGoldQuote` are passed
// in so tests can run it without network or bindings. A failed news fetch or
// AI call degrades (no headlines / no summary) rather than failing the route.
export async function buildGoldNews({ fetchFn = fetch, ai, getGoldQuote, now = Date.now() }) {
  const [quote, news] = await Promise.all([
    getGoldQuote().catch(() => null),
    fetchFn('https://query1.finance.yahoo.com/v1/finance/search?q=gold&quotesCount=0&newsCount=20', { headers: UA })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.news || [])
      .catch(() => []),
  ])
  const moves = goldMoves(quote)
  const headlines = pickGoldHeadlines(news, now)

  let summary = null
  let drivers = []
  if (ai && headlines.length) {
    try {
      // Thai text takes many tokens; 1600 leaves room for 4 drivers in both languages.
      const result = await ai.run(GOLD_NEWS_MODEL, { messages: buildGoldPrompt(moves, headlines), max_tokens: 1600, temperature: 0.2 })
      ;({ summary, drivers } = parseGoldExplanation(result?.response))
    } catch {
      summary = null
      drivers = []
    }
  }
  // `summary` keeps its { en, th } shape so app builds from before `drivers`
  // existed still show it.
  return { updatedAt: now, moves, summary, drivers, headlines }
}
