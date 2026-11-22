// GET /thai-gold — the Gold Traders Association's (สมาคมค้าทองคำ) posted price
// for 96.5% gold, per baht-weight, for the app's Gold tab.
//
// -> { source: 'goldtraders.or.th', announcedAt (unix s), round,
//      bar: { buy, sell }, ornament: { taxBase, sell },
//      changeFromPrevious, changeFromYesterday }      (THB)
// -> 502 { error } if the page can't be read or parsed (the app then just
//    keeps showing its own estimate).
//
// The association has no public API; its home page is server-rendered and
// carries the latest announcement as plain text ("ราคาทองตามประกาศ ...
// ประจำวันที่ 22/11/2569 เวลา 09:09 (ครั้งที่ 1) ทองคำแท่ง 96.5% รับซื้อ ...").
// Its robots.txt allows general access (it only opts out of AI training);
// this route reads that one page, at most once per CACHE window per
// location, and nothing from it is passed to an AI model.
//
// Ornament gold's first figure is the tax base (ฐานภาษี), not a buy price —
// shops buy ornaments back at their own discount — so it's kept under that
// name rather than shown as "buy".

export const THAI_GOLD_URL = 'https://www.goldtraders.or.th/'
export const THAI_GOLD_CACHE_SECONDS = 10 * 60
const UA = 'Mozilla/5.0 (compatible; stock-ranges/1.0; +https://pumbafluffycorgi.com/stock-ranges/)'

const num = (s) => {
  const v = parseFloat(String(s).replace(/,/g, ''))
  return Number.isFinite(v) ? v : null
}

// Page HTML -> visible text, whitespace collapsed (scripts/styles dropped).
export function htmlToText(html) {
  return String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

const ANNOUNCEMENT_RE = new RegExp([
  'ประจำวันที่\\s*(\\d{1,2})/(\\d{1,2})/(\\d{4})\\s*เวลา\\s*(\\d{1,2})[:.](\\d{2})\\s*(?:น\\.)?\\s*\\(ครั้งที่\\s*(\\d+)\\)',
  '\\s*ทองคำแท่ง\\s*96\\.5\\s*%\\s*รับซื้อ\\s*([\\d,.]+)\\s*ขายออก\\s*([\\d,.]+)',
  '\\s*ทองรูปพรรณ\\s*96\\.5\\s*%\\s*ฐานภาษี\\s*([\\d,.]+)\\s*ขายออก\\s*([\\d,.]+)',
  '(?:\\s*เทียบกับประกาศก่อนหน้า\\s*([+-]?[\\d,.]+))?',
  '(?:\\s*เทียบกับวันก่อนหน้า\\s*([+-]?[\\d,.]+))?',
].join(''))

// Thai Buddhist-era date + Bangkok time (UTC+7, no DST) -> unix seconds.
export function bangkokTime(day, month, yearBE, hour, minute) {
  const t = Date.UTC(yearBE - 543, month - 1, day, hour - 7, minute)
  return Number.isFinite(t) ? t / 1000 : null
}

// Returns the parsed announcement, or null if the page doesn't contain one
// in the expected shape (e.g. the site was redesigned) or a price is not
// plausible for one baht-weight of gold.
export function parseThaiGoldPage(html) {
  const m = ANNOUNCEMENT_RE.exec(htmlToText(html))
  if (!m) return null
  const [, d, mo, y, hh, mm, round, barBuy, barSell, ornBase, ornSell, chPrev, chDay] = m
  const out = {
    source: 'goldtraders.or.th',
    announcedAt: bangkokTime(+d, +mo, +y, +hh, +mm),
    round: +round,
    bar: { buy: num(barBuy), sell: num(barSell) },
    ornament: { taxBase: num(ornBase), sell: num(ornSell) },
    changeFromPrevious: chPrev === undefined ? null : num(chPrev),
    changeFromYesterday: chDay === undefined ? null : num(chDay),
  }
  const prices = [out.bar.buy, out.bar.sell, out.ornament.taxBase, out.ornament.sell]
  // A baht-weight has cost THB 10k–200k for decades; anything else means the
  // regex matched the wrong numbers.
  if (!out.announcedAt || prices.some((p) => p == null || p < 10000 || p > 200000)) return null
  if (out.bar.sell < out.bar.buy) return null
  return out
}

export async function getThaiGoldPrice(fetchFn = fetch) {
  try {
    const res = await fetchFn(THAI_GOLD_URL, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
    if (!res.ok) return null
    return parseThaiGoldPage(await res.text())
  } catch {
    return null
  }
}
