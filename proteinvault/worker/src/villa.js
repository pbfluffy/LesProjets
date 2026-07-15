// Shared helper for the /api/fetch-villa route. Villa Market has a real,
// lightweight product-detail endpoint (api/product2/getcpr?cprcode={id}) —
// found by inspecting network requests on a live product page, not from
// any published API docs, so this can break without notice like the
// Shopee helper.
//
// Note: this endpoint does NOT include promotion/discount info (that
// requires either scraping the rendered page or a ~34MB full-catalog
// dump — impractical for a per-request lookup). Promos stay manual entry
// in the admin form regardless of which shop the flavor is at.

const ALLOWED_HOSTS = new Set(['shop.villamarket.com'])

export function isAllowedVillaUrl(rawUrl) {
  try {
    const { hostname } = new URL(rawUrl)
    return ALLOWED_HOSTS.has(hostname)
  } catch {
    return false
  }
}

// Villa product URLs are shop.villamarket.com/product/{cprcode}.
export function extractProductId(rawUrl) {
  const match = rawUrl.match(/\/product\/(\d+)/)
  return match ? match[1] : null
}

export async function fetchVillaItem(cprcode) {
  const apiUrl = `https://shop.villamarket.com/api/product2/getcpr?timestamp=${Date.now()}&cprcode=${cprcode}`
  const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Villa Market responded ${res.status}`)
  const data = await res.json()
  if (!data || data.cprcode == null) throw new Error('Unexpected Villa Market response shape')
  return data
}

// Product images live on a fixed CloudFront host, keyed by the cprcode
// zero-padded to 7 digits — confirmed against a real product page's <img>
// src, not documented anywhere official.
function imageUrl(cprcode) {
  return `https://d19oj5aeuefgv.cloudfront.net/${String(cprcode).padStart(7, '0')}`
}

export function normalizeVillaItem(data, sourceUrl) {
  const attributes = [
    data.hema_sizedesc && { name: 'Size', value: data.hema_sizedesc },
    data.pr_country_en && { name: 'Country', value: data.pr_country_en },
    data.pr_barcode && { name: 'Barcode', value: data.pr_barcode },
  ].filter(Boolean)
  return {
    name: data.pr_online_name_en || data.hema_name_en || null,
    priceThb: typeof data.ba_nprice === 'number' ? data.ba_nprice : null,
    images: [imageUrl(data.cprcode)],
    attributes,
    rawDescription: data.meta_description2 || data.meta_description || null,
    sourceUrl,
  }
}
