// Backs the /api/fetch-tops route. Unlike Shopee/Villa Market, Tops
// doesn't need a separate API call at all — the product page itself is
// server-rendered with the full product object embedded in a
// `__NEXT_DATA__` script tag (Next.js's own SSR data), found by
// inspecting a live product page. No endpoint discovery needed, just HTML
// parsing.
//
// CONFIRMED BLOCKED IN PRODUCTION (2026-07-15): this route works from a
// local `wrangler dev` and even from plain `curl`, but the actual
// deployed Worker — running on Cloudflare's own edge network — gets a
// flat, consistent 403 from Tops on every request. Best guess: Tops is
// also behind Cloudflare, and their WAF blocks traffic from Cloudflare's
// own datacenter/Workers IP ranges, an ironic same-infra collision. This
// isn't a header or timing issue — retries and header tuning didn't help.
// Deliberately NOT wired into ImportPanel.jsx's auto-detect as a result —
// offering a button that reliably fails isn't better than no button.
// Kept here in case Cloudflare's routing/Tops' WAF rules change later.

const ALLOWED_HOSTS = new Set(['www.tops.co.th', 'tops.co.th'])

export function isAllowedTopsUrl(rawUrl) {
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
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

export async function fetchTopsPage(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS })
  if (!res.ok) throw new Error(`Tops responded ${res.status}`)
  const html = await res.text()
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s)
  if (!match) throw new Error('Unexpected Tops page shape — could not find embedded product data')
  const data = JSON.parse(match[1])
  const productData = data?.props?.pageProps?.productData
  if (!productData) throw new Error('Unexpected Tops page shape — no productData in embedded JSON')
  return productData
}

export function normalizeTopsItem(pd, sourceUrl) {
  const images = Array.isArray(pd.images)
    ? pd.images.map((img) => `https://assets.tops.co.th/${img.url}`)
    : []
  const attributes = []
  const countryBadge = pd.badges?.find((b) => b.active)
  if (countryBadge) attributes.push({ name: 'Country', value: countryBadge.label })
  if (pd.sku) attributes.push({ name: 'SKU', value: pd.sku })
  if (pd.discount) attributes.push({ name: 'Discount on page', value: String(pd.discount) })
  return {
    name: pd.nameEN || pd.name || null,
    priceThb: typeof pd.price === 'number' ? pd.price : null,
    images,
    attributes,
    rawDescription: pd.productProperty || null,
    sourceUrl,
  }
}
