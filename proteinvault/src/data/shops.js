// Shop directory — scoped to three shops. Real, verified shops (via web
// search / direct browsing), not invented.
//
// type: 'online' | 'physical' | 'both'
// url:               generic storefront URL — fallback when nothing more
//                     specific is set
// affiliateUrl:       general-purpose affiliate link for this shop (e.g. a
//                     storefront-level link). Used when a flavor doesn't
//                     specify its own listing URL.
// isAffiliateChannel: shops with this set render their action button in
//                     the emphasized "Buy" style instead of a plain
//                     "Visit" link.
// address:            for physical — used to build a Google Maps directions
//                     link when there's a single relevant branch
//
// Link priority per flavor, highest first: the flavor's own shops[].url
// (a specific product deep-link — real Shopee affiliate links are
// per-product, not one link for the whole storefront) → this shop's
// affiliateUrl → this shop's plain url.

export const shops = [
  {
    id: 'shopee-thailand',
    name: 'Shopee Thailand',
    type: 'online',
    url: 'https://shopee.co.th',
    affiliateUrl: 'https://collshp.com/nitiektawatkul352?view=storefront',
    isAffiliateChannel: true,
  },
  {
    id: 'tops',
    name: 'Tops',
    type: 'both',
    url: 'https://www.tops.co.th',
    note: 'Multiple branches nationwide — use the branch locator on their site',
  },
  {
    id: 'villa-market',
    name: 'Villa Market',
    type: 'both',
    url: 'https://shoponline.villamarket.com',
    address: '591/1, 4-7 Sukhumvit Rd (Sukhumvit 33 branch), Khlong Toei Nuea, Watthana, Bangkok 10110',
    note: 'Multiple 24-hour branches across Bangkok',
  },
]

export function getShop(shopId) {
  return shops.find((s) => s.id === shopId)
}

export function mapsDirectionsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// Real favicon for each shop's own domain — not a fabricated logo, just
// asking their site for the icon it already serves.
export function shopIconUrl(shop) {
  if (!shop.url) return null
  try {
    const hostname = new URL(shop.url).hostname
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
  } catch {
    return null
  }
}

// Resolves the actual URL a shop button should use: a flavor-specific
// listing URL (passed in as `flavorUrl`) beats the shop's own
// affiliateUrl, which beats its plain url.
export function shopLinkUrl(shop, flavorUrl) {
  return flavorUrl || shop.affiliateUrl || shop.url
}
