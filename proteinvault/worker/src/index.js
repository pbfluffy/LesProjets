import {
  isAllowedShopeeUrl,
  resolveCanonicalUrl,
  extractShopAndItemId,
  fetchShopeeItem,
  normalizeShopeeItem,
} from './shopee.js'
import { isAllowedVillaUrl, extractProductId, fetchVillaItem, normalizeVillaItem } from './villa.js'
import { isAllowedTopsUrl, fetchTopsPage, normalizeTopsItem } from './tops.js'

// Standalone Cloudflare Worker, deployed separately from the static site
// (which is on GitHub Pages and can't run serverless functions at all —
// this replaces the earlier attempt at Cloudflare Pages Functions, which
// silently never worked in production for that exact reason). Only
// proxies PUBLIC product data from Shopee/Villa Market/Tops and never
// touches Firestore — writes still happen client-side from the admin
// panel, gated by Firestore security rules. See proteinvault/README.md.

function isAllowedOrigin(origin) {
  return origin === 'https://pumbafluffycorgi.com' || origin.startsWith('http://localhost:')
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

async function handleShopee(targetUrl, origin) {
  if (!isAllowedShopeeUrl(targetUrl)) {
    return jsonResponse({ error: 'url must be a shopee.co.th or s.shopee.co.th link' }, 400, origin)
  }
  try {
    const canonicalUrl = targetUrl.includes('s.shopee.co.th') ? await resolveCanonicalUrl(targetUrl) : targetUrl
    const ids = extractShopAndItemId(canonicalUrl)
    if (!ids) {
      return jsonResponse(
        { error: "Couldn't find a product id in that URL — paste the full product page link." },
        422,
        origin,
      )
    }
    const raw = await fetchShopeeItem(ids.shopId, ids.itemId)
    return jsonResponse(normalizeShopeeItem(raw, canonicalUrl), 200, origin)
  } catch (err) {
    // Unofficial endpoints can fail for reasons outside our control (rate
    // limiting, shape changes) — the admin UI degrades to manual entry.
    return jsonResponse({ error: err.message || 'Could not fetch that Shopee listing.' }, 502, origin)
  }
}

async function handleVilla(targetUrl, origin) {
  if (!isAllowedVillaUrl(targetUrl)) {
    return jsonResponse({ error: 'url must be a shop.villamarket.com link' }, 400, origin)
  }
  const productId = extractProductId(targetUrl)
  if (!productId) {
    return jsonResponse(
      { error: "Couldn't find a product id in that URL — paste the full product page link." },
      422,
      origin,
    )
  }
  try {
    const raw = await fetchVillaItem(productId)
    return jsonResponse(normalizeVillaItem(raw, targetUrl), 200, origin)
  } catch (err) {
    return jsonResponse({ error: err.message || 'Could not fetch that Villa Market listing.' }, 502, origin)
  }
}

async function handleTops(targetUrl, origin) {
  if (!isAllowedTopsUrl(targetUrl)) {
    return jsonResponse({ error: 'url must be a tops.co.th link' }, 400, origin)
  }
  try {
    const productData = await fetchTopsPage(targetUrl)
    return jsonResponse(normalizeTopsItem(productData, targetUrl), 200, origin)
  } catch (err) {
    return jsonResponse({ error: err.message || 'Could not fetch that Tops listing.' }, 502, origin)
  }
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || ''
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin)
    }
    const targetUrl = body?.url
    if (!targetUrl || typeof targetUrl !== 'string') {
      return jsonResponse({ error: 'url is required' }, 400, origin)
    }

    if (url.pathname === '/api/fetch-shopee') return handleShopee(targetUrl, origin)
    if (url.pathname === '/api/fetch-villa') return handleVilla(targetUrl, origin)
    if (url.pathname === '/api/fetch-tops') return handleTops(targetUrl, origin)
    return jsonResponse({ error: 'Not found' }, 404, origin)
  },
}
