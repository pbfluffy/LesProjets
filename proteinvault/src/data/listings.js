// Placeholder catalog. Prices for Quest and Nutrend items match real prices
// found on nutritiondepot.co.th at time of writing (Quest 3-bar pack ฿417 =
// ฿139/bar; Nutrend 3-bar pack ฿237 = ฿79/bar) — the rest are illustrative
// and need reconfirming before launch. shopId links each listing to its
// real shop in shops.js. Musashi's shop assignment below is a placeholder
// guess (commonly stocked at general supplement retailers) and specifically
// NOT confirmed — verify before treating it as fact.
//
// Country/countryCode ARE sourced (verified via web search) — ISO 3166-1
// alpha-2 codes, used to render flag emoji without any icon assets.
//
// ratioThbPerG is derived, not stored: priceThb / proteinG, rounded to 2dp.

export const listings = [
  {
    id: 'quest-overload-cookie',
    brand: 'Quest Nutrition',
    name: 'Overload Cookie Commotion',
    priceThb: 139,
    proteinG: 21,
    country: 'United States',
    countryCode: 'US',
    tags: ['imported'],
    shopId: 'nutrition-depot',
  },
  {
    id: 'musashi-deluxe-peanut',
    brand: 'Musashi',
    name: 'Deluxe Peanut Crunch',
    priceThb: 89,
    proteinG: 20,
    country: 'Australia',
    countryCode: 'AU',
    tags: ['imported'],
    shopId: 'nutrition-depot', // unconfirmed — verify before launch
  },
  {
    id: 'nutrend-excelent-dubai',
    brand: 'Nutrend',
    name: 'Excelent 25% Dubai Chocolate',
    priceThb: 79,
    proteinG: 20,
    country: 'Czech Republic',
    countryCode: 'CZ',
    tags: ['imported'],
    shopId: 'nutrition-depot',
  },
  {
    id: 'furi-thai-cacao',
    brand: 'FURI',
    name: 'Thai Cacao, No Added Sugar',
    priceThb: 99,
    proteinG: 18,
    country: 'Thailand',
    countryCode: 'TH',
    tags: ['thai-made'],
    shopId: 'lazada-thailand',
  },
  {
    id: 'goon-whey-berry',
    brand: 'Go On Protein',
    name: 'Whey Bar, Mixed Berry',
    priceThb: 69,
    proteinG: 18,
    country: 'Thailand',
    countryCode: 'TH',
    tags: ['thai-made'],
    shopId: 'lazada-thailand',
  },
  {
    id: 'kauai-plant-based',
    brand: 'Kauai',
    name: 'Plant Based, GMO-free',
    priceThb: 95,
    proteinG: 18,
    country: 'South Africa',
    countryCode: 'ZA',
    tags: ['plant-based'],
    shopId: 'kauai-thailand',
  },
]

export function ratio(listing) {
  return (listing.priceThb / listing.proteinG).toFixed(2)
}

// Converts an ISO 3166-1 alpha-2 code ('TH') to its flag emoji ('🇹🇭') via
// regional indicator symbols — no icon assets needed.
export function flagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
}
