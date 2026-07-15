// Backs the /api/fetch-nutritiondepot route. Nutrition Depot runs on
// Shopify, which ships a real, first-party, publicly documented JSON API
// on every storefront — append `.json` to any product page URL. Unlike
// Shopee/Villa Market/Tops, this isn't reverse-engineered or fragile: it's
// a supported Shopify feature, so it's the most reliable of the four
// integrations. Confirmed working via curl AND against the live deployed
// Worker (2026-07-15) — unlike Tops, which looked promising in every test
// except the one that matters (the deployed Worker).
//
// Rate limiting: Shopify throttles this endpoint per-IP (~2 req/s) — a
// real 429 here means "slow down," not "blocked," unlike the CAPTCHA/WAF
// walls on Shopee/Tops. No special handling needed for normal one-click
// admin usage; only shows up under rapid repeated testing.

const ALLOWED_HOSTS = new Set(['nutritiondepot.co.th', 'www.nutritiondepot.co.th'])

export function isAllowedNutritionDepotUrl(rawUrl) {
  try {
    const { hostname } = new URL(rawUrl)
    return ALLOWED_HOSTS.has(hostname)
  } catch {
    return false
  }
}

// Product URLs are {origin}/products/{handle} (handle may contain Thai
// characters, URL-encoded in the address bar but not necessarily when
// pasted from a browser's address bar, so this re-encodes to be safe).
export function toProductJsonUrl(rawUrl) {
  const url = new URL(rawUrl)
  const match = url.pathname.match(/\/products\/([^/?#]+)/)
  if (!match) return null
  const handle = decodeURIComponent(match[1])
  return `${url.origin}/products/${encodeURIComponent(handle)}.json`
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json',
}

export async function fetchNutritionDepotItem(jsonUrl) {
  const res = await fetch(jsonUrl, { headers: BROWSER_HEADERS })
  if (res.status === 429) throw new Error('Rate limited by Nutrition Depot — wait a few seconds and try again.')
  if (!res.ok) throw new Error(`Nutrition Depot responded ${res.status}`)
  const data = await res.json()
  if (!data?.product) throw new Error('Unexpected Nutrition Depot response shape')
  return data.product
}

export function normalizeNutritionDepotItem(product, sourceUrl) {
  const variant = product.variants?.[0]
  const priceThb = variant ? Number(variant.price) : null
  const compareAt = variant?.compare_at_price ? Number(variant.compare_at_price) : null
  const attributes = []
  if (product.vendor) attributes.push({ name: 'Brand', value: product.vendor })
  if (product.product_type) attributes.push({ name: 'Type', value: product.product_type })
  if (variant?.sku) attributes.push({ name: 'SKU', value: variant.sku })

  // Unlike protein/macros, this isn't freeform text to guess at — it's the
  // same structured, exact numeric field the price itself comes from, so
  // it's safe to auto-fill as a promo (see ImportPanel.jsx's handleImport).
  // No start/end date, since the source doesn't say how long it's on —
  // an indefinite promo (label only) until the admin edits it.
  let promo = null
  if (compareAt && priceThb && compareAt > priceThb) {
    const pct = Math.round((1 - priceThb / compareAt) * 100)
    promo = { label: `${pct}% off`, originalPriceThb: compareAt }
    attributes.push({ name: 'Regular price (on page)', value: `฿${compareAt}` })
  }

  return {
    name: product.title || null,
    priceThb,
    images: (product.images || []).map((img) => img.src),
    attributes,
    rawDescription: product.body_html ? product.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null,
    sourceUrl,
    promo,
  }
}
