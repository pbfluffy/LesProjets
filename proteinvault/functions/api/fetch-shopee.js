import {
  isAllowedShopeeUrl,
  resolveCanonicalUrl,
  extractShopAndItemId,
  fetchShopeeItem,
  normalizeShopeeItem,
} from './_shared/shopee.js'

// Cloudflare Pages Function — proxies a Shopee product page fetch so the
// browser doesn't hit Shopee directly (CORS) and so Shopee's response
// shape doesn't leak straight into client code. Deliberately
// unauthenticated: it only proxies PUBLIC Shopee product data and never
// touches Firestore — writes still happen client-side, gated by Firestore
// security rules (see SEEDING.md). Verifying a Firebase ID token here would
// need a service-account key, which this project avoids everywhere else on
// purpose (see seed.js). Restricted to Shopee hostnames as a basic abuse
// guard since this fetches a caller-supplied URL server-side.
export async function onRequestPost({ request }) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const url = body?.url
  if (!url || typeof url !== 'string' || !isAllowedShopeeUrl(url)) {
    return jsonError('url must be a shopee.co.th or s.shopee.co.th link', 400)
  }

  try {
    const canonicalUrl = url.includes('s.shopee.co.th') ? await resolveCanonicalUrl(url) : url
    const ids = extractShopAndItemId(canonicalUrl)
    if (!ids) {
      return jsonError(
        "Couldn't find a product id in that URL — paste the full product page link.",
        422,
      )
    }
    const raw = await fetchShopeeItem(ids.shopId, ids.itemId)
    const normalized = normalizeShopeeItem(raw, canonicalUrl)
    return new Response(JSON.stringify(normalized), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Shopee's endpoint is unofficial and can fail for reasons outside our
    // control (rate limiting, shape changes) — surface a plain message,
    // the admin UI degrades to manual entry on any error.
    return jsonError(err.message || 'Could not fetch that Shopee listing.', 502)
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
