// Shop directory — scoped to three shops. Real, verified shops (via web
// search), not invented.
//
// type: 'online' | 'physical' | 'both'
// url:          for online — the storefront to visit
// address:      for physical — used to build a Google Maps directions link
// affiliateUrl: optional. When set, this is used instead of `url` for the
//               shop's action link/button, and that button gets visually
//               emphasized (filled accent style) instead of a plain text
//               link — Shopee is the priority channel for monetization, so
//               it's set up for that treatment now even though nothing
//               points to it yet.

export const shops = [
  {
    id: 'shopee-thailand',
    name: 'Shopee Thailand',
    type: 'online',
    url: 'https://shopee.co.th',
    affiliateUrl: null, // TODO: paste your Shopee affiliate link here — falls back to `url` until set
    note: 'In the directory but no confirmed protein-bar listings yet — not linked to any flavor',
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

// The link a shop's action button should actually use: affiliate link if
// set, otherwise the plain storefront URL.
export function shopLinkUrl(shop) {
  return shop.affiliateUrl || shop.url
}
