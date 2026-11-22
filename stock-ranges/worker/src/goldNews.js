// GET /gold-news — "Why gold moved" for the app's Gold tab.
//
// -> { updatedAt, moves: { day, week, month } (percent, null if unknown),
//      summary: { en, th } | null, headlines: [{ title, publisher, link, ts }] }
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
const DRIVER_RE = /\b(price|prices|rall(y|ies|ied)|record|high|low|fall|falls|fell|drop|drops|slump|slip|slips|rise|rises|rose|gain|gains|surge|jump|weak(ness)?|strength|demand|fed|rate|rates|dollar|yield|yields|inflation|safe[- ]haven|central bank|ounce|tariff|etf outflow|etf inflow|sell-?off)\b/i
const NOISE_RE = /stocks to watch|penny stock|g\/t|drill|resource estimate|royalt|ICYMI|exploration/i

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
    if (!GOLD_RE.test(title) || !DRIVER_RE.test(title) || NOISE_RE.test(title)) continue
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

export function buildGoldPrompt(moves, headlines) {
  const list = headlines.map((h, i) => `${i + 1}. ${h.title} (${h.publisher}, ${new Date(h.ts).toISOString().slice(0, 10)})`).join('\n')
  return [
    {
      role: 'system',
      content: 'You summarize news for a price-tracking app. Use ONLY the headlines given; do not add facts, numbers, forecasts or advice of your own. If the headlines do not explain the move, say that no clear news reason was found. Reply with JSON only: {"en": "...", "th": "..."} where en is 2-3 plain English sentences and th is the same text in natural Thai.',
    },
    {
      role: 'user',
      content: `Gold (COMEX futures) price change: 1 day ${fmt(moves.day)}, 1 week ${fmt(moves.week)}, 1 month ${fmt(moves.month)}.\n\nRecent headlines:\n${list}\n\nExplain briefly why gold has moved recently, based on these headlines.`,
    },
  ]
}

// Pulls { en, th } out of the model's reply (an object, or a string that may
// carry code fences or prose around the JSON). null if unusable.
export function parseGoldSummary(response) {
  let obj = response
  if (typeof obj === 'string') {
    const s = obj.replace(/```(json)?/gi, '')
    const a = s.indexOf('{')
    const b = s.lastIndexOf('}')
    if (a === -1 || b < a) return null
    try { obj = JSON.parse(s.slice(a, b + 1)) } catch { return null }
  }
  const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_SUMMARY_CHARS) : '')
  const en = clean(obj?.en)
  const th = clean(obj?.th)
  return en && th ? { en, th } : null
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
  if (ai && headlines.length) {
    try {
      const result = await ai.run(GOLD_NEWS_MODEL, { messages: buildGoldPrompt(moves, headlines), max_tokens: 600, temperature: 0.2 })
      summary = parseGoldSummary(result?.response)
    } catch {
      summary = null
    }
  }
  return { updatedAt: now, moves, summary, headlines }
}
