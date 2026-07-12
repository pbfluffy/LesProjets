// Grouped by product (brand), each with an array of flavors. Protein grams
// now live on the FLAVOR, not the product — Musashi turned out to need
// this: their "High Protein" line and "Crisp" line carry very different
// protein content under the same brand (see note below), so a single
// product-level number was actively wrong.
//
// Sourced flavors, verified via web search against tops.co.th and
// shoponline.villamarket.com:
//   - Quest flavors (Chocolate Brownie, Double Chocolate Chunk, Lemon Cake,
//     White Chocolate Raspberry) confirmed at Tops. Tops' own product pages
//     say "prices may vary depending on the selected branch" and didn't
//     show a figure, so pricing below is still illustrative.
//   - Musashi flavors + protein content confirmed at Tops. High Protein
//     Milk Choc Brownie Bar and Dark Chocolate Salted Caramel Bar are both
//     90g bars from Musashi's "High Protein" line — 45g protein each,
//     confirmed via Musashi's own product specs. Crisp Vanilla Caramel is a
//     60g bar from their separate "Crisp" line — only 20g protein, also
//     confirmed directly. Pricing is illustrative.
//   - Go On "Cranberry Goji & Chocolate" + its ฿129 price are both
//     confirmed at Villa Market (shoponline.villamarket.com search
//     results). "Vanilla Flavour and Chocolate" is confirmed sold at Tops,
//     but its price wasn't captured — illustrative.
//
// REMOVED FOR NOW: Nutrend, FURI, and Kauai were in earlier drafts of this
// file but aren't confirmed sold at Villa Market, Tops, or Shopee — rather
// than leave them pointing at a shop that isn't real, they're out until
// someone confirms where they're actually sold. Re-add when known.
//
// STANDING OPEN QUESTION, still not resolved: Go On Protein's country of
// origin. The Thailand listings match the format of the Polish brand
// "Sante Go On Nutrition" sold internationally — countryCode: 'TH' below
// may be wrong. Flagged, not corrected, since neither claim is confirmed.

export const products = [
  {
    id: 'quest-nutrition',
    brand: 'Quest Nutrition',
    country: 'United States',
    countryCode: 'US',
    tags: ['imported'],
    flavors: [
      {
        id: 'chocolate-brownie',
        name: 'Chocolate Brownie',
        priceThb: 139,
        proteinG: 21,
        shopIds: ['tops'],
      },
      {
        id: 'double-chocolate-chunk',
        name: 'Double Chocolate Chunk',
        priceThb: 139,
        proteinG: 21,
        shopIds: ['tops'],
      },
      {
        id: 'lemon-cake',
        name: 'Lemon Cake',
        priceThb: 139,
        proteinG: 21,
        shopIds: ['tops'],
      },
      {
        id: 'white-chocolate-raspberry',
        name: 'White Chocolate Raspberry',
        priceThb: 139,
        proteinG: 21,
        shopIds: ['tops'],
      },
    ],
  },
  {
    id: 'musashi',
    brand: 'Musashi',
    country: 'Australia',
    countryCode: 'AU',
    tags: ['imported'],
    flavors: [
      {
        id: 'high-protein-milk-choc-brownie',
        name: 'High Protein Milk Choc Brownie Bar',
        priceThb: 129,
        proteinG: 45,
        shopIds: ['tops'],
      },
      {
        id: 'high-protein-dark-choc-salted-caramel',
        name: 'Dark Chocolate Salted Caramel Bar',
        priceThb: 129,
        proteinG: 45,
        shopIds: ['tops'],
      },
      {
        id: 'crisp-vanilla-caramel',
        name: 'Crisp Vanilla Caramel',
        priceThb: 89,
        proteinG: 20,
        shopIds: ['tops'],
      },
    ],
  },
  {
    id: 'go-on-protein',
    brand: 'Go On Protein',
    country: 'Thailand', // unconfirmed — see standing note above
    countryCode: 'TH',
    tags: ['thai-made'], // unconfirmed, same caveat
    flavors: [
      {
        id: 'vanilla-chocolate',
        name: 'Vanilla Flavour and Chocolate',
        priceThb: 69, // illustrative — confirmed sold at Tops, price not captured
        proteinG: 18,
        shopIds: ['tops'],
      },
      {
        id: 'cranberry-goji-chocolate',
        name: 'Cranberry Goji & Chocolate',
        priceThb: 129, // confirmed — Villa Market listing
        proteinG: 18,
        shopIds: ['villa-market'],
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
