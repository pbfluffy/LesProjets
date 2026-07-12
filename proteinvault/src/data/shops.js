// Shop directory — real, verified shops where possible (via web search),
// not invented. Where a specific detail couldn't be confirmed, it's noted
// in listings.js rather than asserted here as fact.
//
// type: 'online' | 'physical' | 'both'
// url:     for online — the storefront to visit
// address: for physical — used to build a Google Maps directions link
//          (no lat/lng stored; we don't have confirmed precise coordinates,
//          and a maps search-by-address link doesn't need them)

export const shops = [
  {
    id: 'nutrition-depot',
    name: 'Nutrition Depot',
    type: 'both',
    url: 'https://nutritiondepot.co.th',
    address: 'Sukhumvit Rd (near BTS Asoke), Khlong Toei Nuea, Watthana, Bangkok 10110',
  },
  {
    id: 'iherb-thailand',
    name: 'iHerb Thailand',
    type: 'online',
    url: 'https://th.iherb.com',
  },
  {
    id: 'lazada-thailand',
    name: 'Lazada Thailand',
    type: 'online',
    url: 'https://www.lazada.co.th',
  },
  {
    id: 'thai-sports-supplements',
    name: 'Thai Sports Supplements',
    type: 'physical',
    address: '235, 16 Soi Sawatdi, Khlong Toei Nuea, Watthana, Bangkok 10110',
  },
  {
    id: 'kauai-thailand',
    name: 'Kauai',
    type: 'both',
    url: 'https://www.kauaithailand.com',
    note: 'Plus retail locations across Bangkok malls',
  },
]

export function getShop(shopId) {
  return shops.find((s) => s.id === shopId)
}

export function mapsDirectionsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
