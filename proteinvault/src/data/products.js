// Placeholder catalog. Replace with real distributor pricing before launch —
// these numbers are illustrative, not sourced. Country/countryCode ARE
// sourced (verified via web search) — ISO 3166-1 alpha-2 codes, used to
// render flag emoji without any icon assets.
//
// ratioThbPerG is derived, not stored: priceThb / proteinG, rounded to 2dp.

export const products = [
  {
    id: 'quest-overload-cookie',
    brand: 'Quest Nutrition',
    name: 'Overload Cookie Commotion',
    priceThb: 139,
    proteinG: 21,
    country: 'United States',
    countryCode: 'US',
    tags: ['imported'],
    inStock: true,
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
    inStock: true,
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
    inStock: true,
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
    inStock: true,
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
    inStock: true,
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
    inStock: true,
  },
]

export function ratio(product) {
  return (product.priceThb / product.proteinG).toFixed(2)
}

// Converts an ISO 3166-1 alpha-2 code ('TH') to its flag emoji ('🇹🇭') via
// regional indicator symbols — no icon assets needed.
export function flagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
}
