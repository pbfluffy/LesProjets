// bill-splitter-og-meta — dynamic Open Graph text for shared bill links.
//
// bill-splitter is a client-rendered SPA on static hosting, so link-preview
// crawlers (LINE, Facebook, iMessage, ...) never run its JS and would
// otherwise always see the same static og:title/og:description for every
// shared bill. This worker sits on the pumbafluffycorgi.com/bill-splitter/*
// zone route (same pattern as pumgoda-og-meta and dog-near-me's worker) and,
// for the app-shell HTML request only, decodes the bill payload straight out
// of the URL (?d=<base64>, or ?s=<shortId> via a Firestore read) and
// rewrites the title/description in place to reflect the actual bill —
// e.g. "หารบิล ฿850 ระหว่าง 3 คน" instead of the generic tagline.
//
// No client-facing API surface at all — this worker is purely a zone-route
// HTML rewriter, unlike dog-near-me's worker which also serves an upload API.

import { calcSplit } from '../../src/billMath.js'

const PROJECT_ID = 'pumgoda'

const CURRENCY_SYMBOLS = {
  THB: '฿', KRW: '₩', JPY: '¥', USD: '$', EUR: '€',
  SGD: 'S$', HKD: 'HK$', GBP: '£', AUD: 'A$', CAD: 'C$', CNY: '¥',
}
function symbolFor(code) {
  return CURRENCY_SYMBOLS[code] || '฿'
}
function fmtAmount(n, code) {
  const decimals = code === 'JPY' || code === 'KRW' ? 0 : 2
  return symbolFor(code) + Number(n || 0).toFixed(decimals)
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
const b64urlToString = (s) => new TextDecoder().decode(b64urlToBytes(s))

// Mirrors bill-splitter/src/share.js's decodeShare exactly — same envelope
// shape ({v, t, s}), same three valid tab types.
function decodeShare(payload) {
  try {
    const obj = JSON.parse(b64urlToString(payload))
    if (obj && (obj.t === 'split' || obj.t === 'sushi' || obj.t === 'trips') && obj.s) return obj
  } catch {
    // malformed/unexpected payload — caller falls back to the generic tags
  }
  return null
}

async function resolveShortLink(shortId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shareLinks/${encodeURIComponent(shortId)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const doc = await res.json()
  const payload = doc.fields?.payload?.stringValue
  return payload ? decodeShare(payload) : null
}

// Uses the app's own split calculation (bundled in at deploy time), so the
// preview total can never disagree with the bill — discounts, "Applies to"
// selections, rounding and the owner clamp all behave identically.
function calcSplitTotal(s) {
  const members = Array.isArray(s.members) ? s.members : []
  return { grandTotal: calcSplit(s).grandTotal, memberCount: members.length, currency: s.currency || 'THB' }
}

// Mirrors useSushiroStore.js's calculate() — same PLATES price table.
const PLATE_PRICES = { white: 30, red: 40, silver: 60, gold: 80, black: 100 }
function calcSushiTotal(s) {
  const people = Array.isArray(s.people) ? s.people : []
  const plates = s.plates || {}
  const snacks = s.snacks || {}
  let subtotal = 0
  people.forEach((name) => {
    const p = plates[name] || {}
    Object.keys(PLATE_PRICES).forEach((id) => {
      subtotal += (p[id] || 0) * PLATE_PRICES[id]
    })
    ;(snacks[name] || []).forEach((item) => {
      subtotal += Number(item.price) || 0
    })
  })
  let mul = 1
  if (s.serviceChargeEnabled) mul *= 1.1
  if (s.vatEnabled) mul *= 1.07
  return { grandTotal: subtotal * mul, memberCount: people.length, currency: 'THB' }
}

// Trips already carries a precomputed snapshot.grandTotal — no math needed.
function calcTripsTotal(s) {
  const snap = s.snapshot || {}
  return {
    grandTotal: Number(snap.grandTotal) || 0,
    currency: snap.currency || s.currency || 'THB',
    billCount: Array.isArray(s.bills) ? s.bills.length : 0,
    name: (s.name || '').trim(),
  }
}

function buildTitle(decoded) {
  const { t, s } = decoded
  const billName = (s.billName || '').trim()
  const prefix = billName ? `${billName} · ` : ''

  if (t === 'split') {
    const { grandTotal, memberCount, currency } = calcSplitTotal(s)
    if (memberCount === 0) return null
    return `${prefix}หารบิล ${fmtAmount(grandTotal, currency)} ระหว่าง ${memberCount} คน`
  }
  if (t === 'sushi') {
    const { grandTotal, memberCount, currency } = calcSushiTotal(s)
    if (memberCount === 0) return null
    return `${prefix}บิลซูชิ ${fmtAmount(grandTotal, currency)} ระหว่าง ${memberCount} คน`
  }
  if (t === 'trips') {
    const { grandTotal, currency, billCount, name } = calcTripsTotal(s)
    if (billCount === 0) return null
    return `${name ? `ทริป "${name}"` : 'ทริป'} ${fmtAmount(grandTotal, currency)} จาก ${billCount} บิล`
  }
  return null
}

const DESCRIPTION = 'แตะเพื่อดูยอดที่ต้องจ่ายของแต่ละคน'

// setAttribute/setInnerContent both escape their input automatically, so no
// manual HTML-escaping needed here (bill/member names can contain quotes,
// ampersands, etc. safely).
class MetaContentRewriter {
  constructor(content) { this.content = content }
  element(el) { el.setAttribute('content', this.content) }
}
class TitleTextRewriter {
  constructor(newText) { this.newText = newText }
  element(el) { el.setInnerContent(this.newText) }
}

function rewriteMetaTags(response, { title, description, url }) {
  return new HTMLRewriter()
    .on('title', new TitleTextRewriter(title))
    .on('meta[property="og:title"]', new MetaContentRewriter(title))
    .on('meta[name="twitter:title"]', new MetaContentRewriter(title))
    .on('meta[property="og:description"]', new MetaContentRewriter(description))
    .on('meta[name="twitter:description"]', new MetaContentRewriter(description))
    .on('meta[property="og:url"]', new MetaContentRewriter(url))
    .transform(response)
}

async function handleAppShell(request, url) {
  const originResponse = await fetch(request) // bypasses the Workers route layer, hits the real GitHub Pages origin
  const dParam = url.searchParams.get('d')
  const sParam = url.searchParams.get('s')
  if (!dParam && !sParam) return originResponse

  try {
    const decoded = dParam ? decodeShare(dParam) : await resolveShortLink(sParam)
    if (!decoded) return originResponse

    const title = buildTitle(decoded)
    if (!title) return originResponse

    return rewriteMetaTags(originResponse, { title, description: DESCRIPTION, url: request.url })
  } catch (e) {
    console.error('bill-splitter-og-meta rewrite failed:', e)
    return originResponse
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.hostname !== 'pumbafluffycorgi.com') {
      return new Response('bill-splitter-og-meta: zone-route worker, not a public API', { status: 404 })
    }
    const isAppShell = request.method === 'GET' && (url.pathname === '/bill-splitter/' || url.pathname === '/bill-splitter/index.html')
    if (!isAppShell) return fetch(request) // JS/CSS/manifest/etc. pass straight through
    return handleAppShell(request, url)
  },
}
