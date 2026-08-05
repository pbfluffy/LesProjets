// arl-status-check — Cloudflare Worker
//
// There is no official real-time API for Bangkok's Airport Rail Link (ARL).
// This worker approximates current service status by scanning Bing News RSS
// (which aggregates Bangkok Post / The Star / Thaiger / etc. — one no-auth
// feed) for recent ARL coverage, and classifying the most recent in-window
// article with a keyword heuristic. This is a best-effort estimate, not a
// confirmed status — it will miss minor delays that never make the news,
// and is only as fast as news coverage of a real incident.
//
// NOTE: Google News RSS was tried first, but Google returns a 503
// "unusual traffic" block page to Cloudflare Workers' shared egress IPs
// (confirmed via `wrangler tail` — it works fine from a residential IP in
// local `wrangler dev`, but fails once deployed). Bing News RSS does not
// block Workers' IPs, so it's used instead.
//
// REQUIRED BINDING:
//   ARL_STATUS_KV  KV namespace — caches the classified result (5 min TTL,
//                  to avoid hammering Bing on every page load/check) and
//                  persists the last-known status indefinitely (to detect
//                  a status *change* for the scheduled alert).
//
// GET /  ->  { status: 'normal'|'disrupted'|'unknown', previousStatus,
//              statusChanged,
//              headlines: [{title, link, source, pubDate, eventType}],
//              checkedAt, error? }
// eventType per headline is 'disruption' | 'resume' | 'neutral' — the same
// keyword match used to derive the overall status, exposed per-item so the
// frontend can render a timeline instead of a flat list.

const FEEDS = [
  'https://www.bing.com/news/search?q=%22Airport+Rail+Link%22+Bangkok&format=RSS',
  'https://www.bing.com/news/search?q=%E0%B9%81%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%9E%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%95%E0%B9%80%E0%B8%A3%E0%B8%A5%E0%B8%A5%E0%B8%B4%E0%B8%87%E0%B8%81%E0%B9%8C&format=RSS',
]

// How long an unresolved disruption report stays trusted before the
// classifier gives up and says "unknown" instead of quietly reverting to
// "normal". This used to be 36h, which was wrong: a real incident (e.g. a
// derailment causing reduced 30-min intervals) gets one wave of breaking-
// news coverage and then goes quiet as it stops being "news" — even while
// the reduced service is still ongoing days later, because no one writes a
// follow-up article just to say "still running slow." Silence is NOT the
// same signal as an explicit resume/normal-service article, so it must not
// be treated as one. 14 days is long enough to cover that gap without
// letting a truly stale, forgotten report claim "disrupted" forever.
const DISRUPTION_STALE_MS = 14 * 24 * 60 * 60 * 1000
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

// Bing wraps the real article URL behind a apiclick.aspx redirect with the
// actual destination in its `url` query param — unwrap it so the UI links
// straight to the source article instead of a Bing tracking redirect.
function unwrapBingLink(link) {
  try {
    const real = new URL(link).searchParams.get('url')
    return real || link
  } catch {
    return link
  }
}

// Minimal regex-based RSS parser — Workers has no DOMParser, and a full XML
// lib is overkill for Bing News' consistently-shaped <item> blocks.
function parseRssItems(xml) {
  const items = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRe.exec(xml))) {
    const block = m[1]
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]
    const source = block.match(/<(?:\w+:)?[Ss]ource[^>]*>([\s\S]*?)<\/(?:\w+:)?[Ss]ource>/)?.[1]
    if (!title || !link) continue
    items.push({
      title: decodeEntities(title.trim()),
      link: unwrapBingLink(decodeEntities(link.trim())),
      pubDate: pubDate ? new Date(pubDate.trim()).toISOString() : null,
      source: source ? decodeEntities(source.trim()) : null,
    })
  }
  return items
}

async function fetchFeed(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ARLStatus/1.0 (https://pumbafluffycorgi.com/arl-status/)' } })
    if (!res.ok) {
      console.error('feed fetch non-OK:', url, res.status, (await res.text()).slice(0, 300))
      return []
    }
    const text = await res.text()
    const items = parseRssItems(text)
    if (items.length === 0) console.error('feed parsed 0 items, body head:', url, text.slice(0, 300))
    return items
  } catch (e) {
    console.error('feed fetch failed:', url, e)
    return []
  }
}

// 'resume' takes priority over 'disruption' when a title matches both word
// lists (rare, but a "resumes after disruption" headline should read as the
// resolution event, not a new incident).
function matchEventType(title) {
  const t = title.toLowerCase()
  if (RESUME_WORDS.some((w) => t.includes(w.toLowerCase()))) return 'resume'
  if (DISRUPTION_WORDS.some((w) => t.includes(w.toLowerCase()))) return 'disruption'
  return 'neutral'
}

// items must already be sorted newest-first — whichever non-neutral item is
// most recent (any age) decides the current status. No recency window on
// the 'resume' side: an explicit "back to normal" article stays trusted
// indefinitely, since ARL not making news is itself the expected, unremarkable
// state for a working transit line. An unresolved 'disruption' report is
// different — it's only trusted for DISRUPTION_STALE_MS before the
// classifier admits it doesn't actually know the current state anymore.
function classify(items) {
  const signal = items.find((i) => i.eventType !== 'neutral' && i.pubDate)
  if (!signal) return 'normal' // no disruption/resume signal found at all — see UI copy: "no recent disruption reports", not "confirmed normal"
  if (signal.eventType === 'resume') return 'normal'
  const ageMs = Date.now() - new Date(signal.pubDate).getTime()
  return ageMs <= DISRUPTION_STALE_MS ? 'disrupted' : 'unknown'
}

async function computeStatus(env) {
  const results = await Promise.all(FEEDS.map(fetchFeed))
  const byLink = new Map()
  for (const item of results.flat()) {
    if (!byLink.has(item.link)) byLink.set(item.link, item)
  }
  const items = [...byLink.values()]
    .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
    .map((item) => ({ ...item, eventType: matchEventType(item.title) }))

  const previousStatus = env.ARL_STATUS_KV ? await env.ARL_STATUS_KV.get('laststatus') : null

  // Both feeds came back with zero items — a Bangkok transit line doesn't
  // genuinely go quiet in the news, so this means a feed/parsing problem,
  // not a real all-clear. Report 'unknown' instead of letting classify()
  // default to 'normal', which would look identical to a confirmed-fine
  // status. Deliberately don't overwrite `laststatus` here, so once the
  // feed recovers, statusChanged compares against the last REAL status
  // rather than this gap (avoids a spurious "back to normal" alert).
  if (items.length === 0) {
    return {
      status: 'unknown',
      previousStatus,
      statusChanged: previousStatus !== null && previousStatus !== 'unknown',
      headlines: [],
      checkedAt: new Date().toISOString(),
      error: 'both feeds returned zero items',
    }
  }

  const status = classify(items)
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
