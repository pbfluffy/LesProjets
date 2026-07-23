// arl-status-check — Cloudflare Worker
//
// There is no official real-time API for Bangkok's Airport Rail Link (ARL).
// This worker approximates current service status by scanning Google News
// RSS (which aggregates Bangkok Post / Nation Thailand / Thaiger / etc. —
// one no-auth, no-scraping-ToS-risk feed) for recent ARL coverage, and
// classifying the most recent in-window article with a keyword heuristic.
// This is a best-effort estimate, not a confirmed status — it will miss
// minor delays that never make the news, and is only as fast as news
// coverage of a real incident.
//
// REQUIRED BINDING:
//   ARL_STATUS_KV  KV namespace — caches the classified result (5 min TTL,
//                  to avoid hammering Google News on every page load/check)
//                  and persists the last-known status indefinitely (to
//                  detect a status *change* for the scheduled alert).
//
// GET /  ->  { status: 'normal'|'disrupted'|'unknown', previousStatus,
//              statusChanged, headlines: [{title, link, source, pubDate}],
//              checkedAt, error? }

const FEEDS = [
  'https://news.google.com/rss/search?q=%22Airport+Rail+Link%22+Bangkok&hl=en-TH&gl=TH&ceid=TH:en',
  'https://news.google.com/rss/search?q=%E0%B9%81%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%9E%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%95%E0%B9%80%E0%B8%A3%E0%B8%A5%E0%B8%A5%E0%B8%B4%E0%B8%87%E0%B8%81%E0%B9%8C&hl=th&gl=TH&ceid=TH:th',
]

const RECENT_WINDOW_MS = 36 * 60 * 60 * 1000 // only articles from the last 36h drive the current status
const CACHE_TTL_SECONDS = 5 * 60
const MAX_HEADLINES = 12

const DISRUPTION_WORDS = [
  'derail', 'disrupt', 'delay', 'suspend', 'hourly interval', 'one train',
  'technical fault', 'service reduced', 'stop service', 'stops service',
  'breakdown', 'out of service', 'halt',
  'ตกราง', 'ขัดข้อง', 'ล่าช้า', 'หยุดวิ่ง', 'ระงับ', 'งดให้บริการ', 'เดินรถช้า',
]
const RESUME_WORDS = [
  'resume', 'full service', 'back to normal', 'restored', 'resolved', 'normal service',
  'กลับมาให้บริการปกติ', 'คืนสู่ภาวะปกติ', 'ให้บริการตามปกติ', 'กลับมาเป็นปกติ',
]

// Public, read-only, no auth/secrets/side-effects — an origin allowlist buys
// no real security here (unlike the other workers in this repo that gate
// paid API calls or user data), so this stays open like trip-planner's
// /generate endpoint rather than blocking local-dev origins for no benefit.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' }
function decodeEntities(s) {
  return s.replace(/&(#?\w+);/g, (m, name) => (name in ENTITIES ? ENTITIES[name] : m))
    .replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')
}

// Minimal regex-based RSS parser — Workers has no DOMParser, and a full XML
// lib is overkill for Google News' consistently-shaped <item> blocks.
function parseRssItems(xml) {
  const items = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRe.exec(xml))) {
    const block = m[1]
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]
    if (!title || !link) continue
    items.push({
      title: decodeEntities(title.trim()),
      link: decodeEntities(link.trim()),
      pubDate: pubDate ? new Date(pubDate.trim()).toISOString() : null,
      source: source ? decodeEntities(source.trim()) : null,
    })
  }
  return items
}

async function fetchFeed(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ARLStatus/1.0 (https://pumbafluffycorgi.com/arl-status/)' } })
    if (!res.ok) return []
    return parseRssItems(await res.text())
  } catch (e) {
    console.error('feed fetch failed:', url, e)
    return []
  }
}

function classify(items) {
  const now = Date.now()
  const recent = items
    .filter((i) => i.pubDate && now - new Date(i.pubDate).getTime() <= RECENT_WINDOW_MS)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

  for (const item of recent) {
    const t = item.title.toLowerCase()
    if (RESUME_WORDS.some((w) => t.includes(w.toLowerCase()))) return 'normal'
    if (DISRUPTION_WORDS.some((w) => t.includes(w.toLowerCase()))) return 'disrupted'
  }
  return 'normal' // no recent disruption/resume signal found — see UI copy: "no recent disruption reports", not "confirmed normal"
}

async function computeStatus(env) {
  const results = await Promise.all(FEEDS.map(fetchFeed))
  const byLink = new Map()
  for (const item of results.flat()) {
    if (!byLink.has(item.link)) byLink.set(item.link, item)
  }
  const items = [...byLink.values()].sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))

  const status = classify(items)
  const previousStatus = env.ARL_STATUS_KV ? await env.ARL_STATUS_KV.get('laststatus') : null
  const statusChanged = previousStatus !== null && previousStatus !== status

  if (env.ARL_STATUS_KV) {
    await env.ARL_STATUS_KV.put('laststatus', status)
  }

  return {
    status,
    previousStatus,
    statusChanged,
    headlines: items.slice(0, MAX_HEADLINES),
    checkedAt: new Date().toISOString(),
  }
}

async function handleStatus(env) {
  if (env.ARL_STATUS_KV) {
    const cached = await env.ARL_STATUS_KV.get('cache')
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        // fall through to recompute on a corrupted cache entry
      }
    }
  }

  let result
  try {
    result = await computeStatus(env)
  } catch (e) {
    console.error('status check failed:', e)
    return {
      status: 'unknown',
      previousStatus: null,
      statusChanged: false,
      headlines: [],
      checkedAt: new Date().toISOString(),
      error: String(e).slice(0, 200),
    }
  }

  if (env.ARL_STATUS_KV) {
    await env.ARL_STATUS_KV.put('cache', JSON.stringify(result), { expirationTtl: CACHE_TTL_SECONDS })
  }
  return result
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405)

    const result = await handleStatus(env)
    return json(result)
  },
}
