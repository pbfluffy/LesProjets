// Shared helper for the /api/fetch-shopee route. Everything here talks to
// an unofficial, undocumented Shopee endpoint — field names and the
// price-scaling factor were inferred by comparing known listing prices
// against the raw API response, not from any published Shopee docs. This
// can break if Shopee changes their page/API shape; the caller is expected
// to catch and surface failures rather than assume this always works.

const ALLOWED_HOSTS = new Set(['shopee.co.th', 'www.shopee.co.th', 's.shopee.co.th'])

export function isAllowedShopeeUrl(rawUrl) {
  try {
    const { hostname } = new URL(rawUrl)
    return ALLOWED_HOSTS.has(hostname)
  } catch {
    return false
  }
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Referer: 'https://shopee.co.th/',
  Accept: 'application/json',
}

// Short links (s.shopee.co.th/...) redirect to the canonical product page —
// resolve that first so extractShopAndItemId has something to match.
export async function resolveCanonicalUrl(rawUrl) {
  const res = await fetch(rawUrl, { headers: BROWSER_HEADERS, redirect: 'follow' })
  return res.url || rawUrl
}

// Shopee product URLs show up in three shapes we've actually seen, tried
// in order:
//   1. Classic canonical: /product-slug-i.{shopid}.{itemid}
//   2. Modern canonical:  /product/{shopid}/{itemid}
//   3. Affiliate short links now redirect through an "opaanlp" (open-app
//      landing page) intermediary — a further JS-driven redirect gets
//      you to shape 2, but the two numbers already in the opaanlp path
//      ARE the shopid/itemid pair, confirmed by comparing against a real
//      browser's fully-resolved URL for the same link. No need to wait
//      for that second redirect.
// None of this is documented anywhere official — inferred from the URL
// shapes of real product pages and redirects.
export function extractShopAndItemId(canonicalUrl) {
  const classic = canonicalUrl.match(/-i\.(\d+)\.(\d+)/)
  if (classic) return { shopId: classic[1], itemId: classic[2] }

  const modern = canonicalUrl.match(/\/product\/(\d+)\/(\d+)/)
  if (modern) return { shopId: modern[1], itemId: modern[2] }

  const opaanlp = canonicalUrl.match(/\/opaanlp\/(\d+)\/(\d+)/)
  if (opaanlp) return { shopId: opaanlp[1], itemId: opaanlp[2] }

  return null
}

export async function fetchShopeeItem(shopId, itemId) {
  const apiUrl = `https://shopee.co.th/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`
  const res = await fetch(apiUrl, { headers: BROWSER_HEADERS })
  if (!res.ok) throw new Error(`Shopee responded ${res.status}`)
  const json = await res.json()
  if (!json?.data) throw new Error('Unexpected Shopee response shape')
  return json.data
}

// Shopee's raw `price` field is scaled by 100000 (e.g. 5900000 -> ฿59.00).
export function normalizeShopeeItem(data, sourceUrl) {
  const priceThb =
    typeof data.price === 'number' ? Math.round((data.price / 100000) * 100) / 100 : null
  const images = Array.isArray(data.images)
    ? data.images.map((id) => `https://cf.shopee.co.th/file/${id}`)
    : []
  const attributes = Array.isArray(data.attributes)
    ? data.attributes.map((a) => ({ name: a.name, value: a.value }))
    : []
  return {
    name: data.name || null,
    priceThb,
    images,
    attributes,
    rawDescription: data.description || null,
    sourceUrl,
  }
}
