// Placeholder catalog. Replace with real distributor pricing before launch —
// these numbers are illustrative, not sourced.
//
// ratioThbPerG is derived, not stored: priceThb / proteinG, rounded to 2dp.

export const products = [
  {
    id: 'quest-overload-cookie',
    brand: 'Quest Nutrition',
    name: 'Overload Cookie Commotion',
    priceThb: 139,
    proteinG: 21,
    tags: ['imported'],
    inStock: true,
  },
  {
    id: 'musashi-deluxe-peanut',
    brand: 'Musashi',
    name: 'Deluxe Peanut Crunch',
    priceThb: 89,
    proteinG: 20,
    tags: ['imported'],
    inStock: true,
  },
  {
    id: 'nutrend-excelent-dubai',
    brand: 'Nutrend',
    name: 'Excelent 25% Dubai Chocolate',
    priceThb: 79,
    proteinG: 20,
    tags: ['imported'],
    inStock: true,
  },
  {
    id: 'furi-thai-cacao',
    brand: 'FURI',
    name: 'Thai Cacao, No Added Sugar',
    priceThb: 99,
    proteinG: 18,
    tags: ['thai-made'],
    inStock: true,
  },
  {
    id: 'goon-whey-berry',
    brand: 'Go On Protein',
    name: 'Whey Bar, Mixed Berry',
    priceThb: 69,
    proteinG: 18,
    tags: ['thai-made'],
    inStock: true,
  },
  {
    id: 'kauai-plant-based',
    brand: 'Kauai',
    name: 'Plant Based, GMO-free',
    priceThb: 95,
    proteinG: 18,
    tags: ['plant-based'],
    inStock: true,
  },
]

export function ratio(product) {
  return (product.priceThb / product.proteinG).toFixed(2)
}
