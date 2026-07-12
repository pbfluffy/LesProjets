// Shop directory — scoped down to three shops per Pumba's request. Real,
// verified shops (via web search), not invented.
//
// type: 'online' | 'physical' | 'both'
// url:     for online — the storefront to visit
// address: for physical — used to build a Google Maps directions link.
//          Only set when there's a single relevant branch; chains with many
//          branches (Tops) use `note` instead and rely on their own site's
//          branch locator.

export const shops = [
  {
    id: 'villa-market',
    name: 'Villa Market',
    type: 'both',
    url: 'https://shoponline.villamarket.com',
    address: '591/1, 4-7 Sukhumvit Rd (Sukhumvit 33 branch), Khlong Toei Nuea, Watthana, Bangkok 10110',
    note: 'Multiple 24-hour branches across Bangkok',
  },
  {
    id: 'tops',
    name: 'Tops',
    type: 'both',
    url: 'https://www.tops.co.th',
    note: 'Multiple branches nationwide — use the branch locator on their site',
  },
  {
    id: 'shopee-thailand',
    name: 'Shopee Thailand',
    type: 'online',
    url: 'https://shopee.co.th',
    note: 'In the directory but no confirmed protein-bar listings yet — not linked to any flavor below',
  },
]

export function getShop(shopId) {
  return shops.find((s) => s.id === shopId)
}

export function mapsDirectionsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
