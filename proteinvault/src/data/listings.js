// Grouped by product (brand), each with an array of flavors, each flavor
// with an array of shopIds — the same flavor (or the same brand under a
// different flavor) can show up at more than one shop.
//
// Sourced flavors + prices, verified via web search:
//   - Quest "Overload" flavors + Nutrition Depot pricing: nutritiondepot.co.th
//   - Quest "Cookies & Cream" / "Lemon Cake" + iHerb Thailand pricing:
//     th.iherb.com (per-bar price derived from multi-bar pack price ÷ bar
//     count, since iHerb sells packs not singles)
//   - Nutrend Excelent 25% flavors + pricing: nutritiondepot.co.th
// Note Quest's flavor names genuinely differ between the two shops — Nutrition
// Depot carries the Thailand-market "Overload" line, iHerb carries the
// standard US line. Both are real Quest Nutrition products, just not the
// exact same SKU, which is why they're modeled as separate flavors rather
// than one flavor with two shopIds.
//
// Everything else (Musashi, FURI, Go On, Kauai) still has placeholder or
// partially-unconfirmed data — see the per-brand notes below.
//
// OPEN QUESTION, not yet resolved: Go On Protein's Thailand Lazada listing
// closely matches the Polish brand "Sante Go On Nutrition" (same 50g
// vanilla/chocolate format, sold internationally). The original
// countryCode: 'TH' below may be wrong — it might be a Polish import
// marketed under a Thailand-specific page, not a Thai-made product.
// Flagged here rather than corrected outright, since neither claim is
// confirmed — check before treating either as fact.

export const products = [
  {
    id: 'quest-nutrition',
    brand: 'Quest Nutrition',
    country: 'United States',
    countryCode: 'US',
    proteinG: 21,
    tags: ['imported'],
    flavors: [
      {
        id: 'overload-cookie-commotion',
        name: 'Overload Cookie Commotion',
        priceThb: 139,
        shopIds: ['nutrition-depot'],
      },
      {
        id: 'overload-sundae-funday',
        name: 'Overload Sundae Funday',
        priceThb: 139,
        shopIds: ['nutrition-depot'],
      },
      {
        id: 'overload-chocolate-explosion',
        name: 'Overload Chocolate Explosion',
        priceThb: 139,
        shopIds: ['nutrition-depot'],
      },
      {
        id: 'cookies-and-cream',
        name: 'Cookies & Cream',
        priceThb: 116,
        shopIds: ['iherb-thailand'],
      },
      {
        id: 'lemon-cake',
        name: 'Lemon Cake',
        priceThb: 110,
        shopIds: ['iherb-thailand'],
      },
    ],
  },
  {
    id: 'musashi',
    brand: 'Musashi',
    country: 'Australia',
    countryCode: 'AU',
    proteinG: 20,
    tags: ['imported'],
    flavors: [
      {
        id: 'deluxe-peanut-crunch',
        name: 'Deluxe Peanut Crunch',
        priceThb: 89,
        shopIds: ['nutrition-depot'], // shop assignment unconfirmed — verify before launch
      },
    ],
  },
  {
    id: 'nutrend',
    brand: 'Nutrend',
    country: 'Czech Republic',
    countryCode: 'CZ',
    proteinG: 20,
    tags: ['imported'],
    flavors: [
      {
        id: 'excelent-dubai-chocolate',
        name: 'Excelent 25% Dubai Chocolate',
        priceThb: 79,
        shopIds: ['nutrition-depot'],
      },
      {
        id: 'excelent-almond-pistachio',
        name: 'Excelent 25% Almonds & Pistachios',
        priceThb: 79,
        shopIds: ['nutrition-depot'],
      },
    ],
  },
  {
    id: 'furi',
    brand: 'FURI',
    country: 'Thailand',
    countryCode: 'TH',
    proteinG: 18,
    tags: ['thai-made'],
    flavors: [
      {
        id: 'thai-cacao',
        name: 'Thai Cacao, No Added Sugar',
        priceThb: 99,
        shopIds: ['lazada-thailand'],
      },
    ],
  },
  {
    id: 'go-on-protein',
    brand: 'Go On Protein',
    country: 'Thailand', // unconfirmed — see note at top of file
    countryCode: 'TH',
    proteinG: 18,
    tags: ['thai-made'], // unconfirmed, same caveat
    flavors: [
      {
        id: 'vanilla-chocolate',
        name: 'Vanilla & Chocolate',
        priceThb: 69, // illustrative — Lazada listing found, exact price not captured
        shopIds: ['lazada-thailand'],
      },
    ],
  },
  {
    id: 'kauai',
    brand: 'Kauai',
    country: 'South Africa',
    countryCode: 'ZA',
    proteinG: 18,
    tags: ['plant-based'],
    flavors: [
      {
        id: 'plant-based-gmo-free',
        name: 'Plant Based, GMO-free',
        priceThb: 95,
        shopIds: ['kauai-thailand'],
      },
    ],
  },
]

export function ratio(priceThb, proteinG) {
  return (priceThb / proteinG).toFixed(2)
}

// Converts an ISO 3166-1 alpha-2 code ('TH') to a flag image URL via
// flagcdn.com — flag emoji don't render as flags on Windows.
export function flagUrl(countryCode) {
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`
}
