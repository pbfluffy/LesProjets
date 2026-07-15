// Grouped by product (brand), each with an array of flavors. Each flavor
// has its own `shops` array: [{ shopId, url? }]. `url` is optional — when
// present it's a specific listing URL (used for real Shopee affiliate
// links, which are per-product, not one link per shop); when absent, the
// shop's generic `url` from shops.js is used instead.
//
// Each flavor can also carry: calories, carbsG, fatG, sugarG — all
// optional, all in grams except calories (kcal). Added 2026-07-12,
// expanded 2026-07-13. 18 of 24 flavors now have real confirmed data,
// sourced via FatSecret/CarbManager/MyNetDiary/Amazon/manufacturer product
// pages — see per-flavor comments. Remaining gaps: Musashi's plain
// "Caramel" and "Deluxe Choc Caramel" (no clean source match found), all 3
// Go On flavors (Sante makes several Go On sub-lines at different protein
// %, couldn't confirm which matches our exact flavor names — declined to
// guess), and Guyvy (found data for a different 80g Guyvy product line,
// not this specific 50g hydrolysate bar — not applied here). Note:
// carbsG isn't consistently NET vs TOTAL carbs across brands — flagged
// per-flavor where it matters (Quest specifically markets net carbs;
// other sources here gave total carbs). Where sources conflicted
// significantly (e.g. Musashi Peanut Crunch's carb figure ranged 7-24g
// across sources), the conflicting field was left out rather than guessed
// — see inline comments. formatMacros() only shows whatever fields
// actually exist for a flavor.
//
// GUYVY (added 2026-07-12): real Thai brand, confirmed via a Shopee link
// + independently (GMP-certified, sold at Tops/Gourmet Market, sponsors
// the Thailand Bodybuilding & Fitness Association). The listing itself
// had no pack-size selector, and ฿1,126 for a single 50g bar would've been
// ~10x what comparable Guyvy products sell for elsewhere — confirmed
// directly that it's a 10-bar set before recording a per-bar price, rather
// than publishing a ratio that would've been badly wrong.
//
// Protein grams live on the FLAVOR, not the product — confirmed necessary
// again in this update: Musashi's "High Protein" line is 45g/bar, their
// "Deluxe" line is 21g/bar, and their "Crisp" line is 20g/bar, all under
// one brand.
//
// SOURCES:
//   - Quest flavors confirmed at Tops (tops.co.th). Tops shows "price may
//     vary by branch" without a figure — pricing illustrative.
//   - Musashi Tops-sourced flavors (High Protein Milk Choc Brownie, Dark
//     Choc Salted Caramel, Crisp Vanilla Caramel) confirmed at Tops,
//     pricing illustrative.
//   - Musashi Shopee-sourced flavors: fetched directly from Pumba's own
//     Shopee affiliate links (2026-07-12). "High Protein" box flavors
//     (Caramel, Cookies & Cream, White Choc Caramel, Peanut Butter) —
//     45g protein confirmed on-page, box of 12 priced ฿890–1,290
//     depending on pack size; ฿890/12 used as the per-bar estimate.
//     "Deluxe" flavors (Peanut Crunch, Jam Donut, Rocky Road, Choc
//     Caramel) — 21g protein confirmed on-page, box of 12 for ฿890, but
//     that listing is explicitly a near-expiry clearance price
//     ("สินค้าใกล้หมดอายุ ลดราคาพิเศษ") — NOT a stable everyday price,
//     don't treat it as one.
//   - Go On flavors: Cranberry Goji & Chocolate confirmed + priced at
//     Villa Market; Vanilla Flavour and Chocolate confirmed at Tops (price
//     still illustrative); Peanut and Chocolate confirmed + priced at Tops
//     (currently out of stock there). Country of origin confirmed as
//     Poland via Tops' own product page — see resolved note below.
//   - FitWin is a new brand, entirely from a real Shopee listing fetched
//     2026-07-12. Country of Origin ("Thailand"), FDA registration
//     numbers per flavor, and protein content (20g) are all taken
//     directly from Shopee's own product-spec fields, not inferred.
//     Box of 12x60g bars, ฿700/box → ฿58.33/bar.
//
// REMOVED: Nutrend, FURI, and Kauai aren't confirmed at any of the three
// scoped shops (Shopee, Tops, Villa Market) — out until someone confirms
// where they're actually sold.
//
// RESOLVED 2026-07-12: Go On Protein's country of origin was flagged as
// unconfirmed in earlier drafts (it resembled the Polish brand "Sante Go
// On Nutrition"). Confirmed via Tops' own product page, which explicitly
// lists "Poland" as country of origin — corrected below.

export const products = [
  {
    id: 'guyvy',
    brand: 'Guyvy',
    country: 'Thailand', // confirmed via Shopee's own field + independently (GMP-certified Thai brand, sold at Tops/Gourmet Market)
    countryCode: 'TH',
    // No confirmed standalone official website — Guyvy sells via LINE, Facebook,
    // and retailers (Tops, Gourmet Market, Lazada, Shopee), not their own site.
    // Real logo provided directly by Pumba, self-hosted at public/logos/guyvy.png
    // rather than fetched from a domain that doesn't exist.
    logoUrl: './logos/guyvy.png',
    tags: ['thai-made'],
    flavors: [
      {
        id: 'hydrolysate-peanut-dark-chocolate',
        name: 'Hydrolysate Peanut Dark Chocolate',
        priceThb: 112.6, // ฿1,126 for a confirmed 10-bar set, per-bar = 1126/10
        proteinG: 35,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/8Knt7njKyi' }],
      },
    ],
  },
  {
    id: 'fitwin',
    brand: 'FitWin',
    country: 'Thailand', // confirmed via Shopee's own "Country of Origin" field
    // Worth noting: FitWin Thailand's own About page describes the brand as
    // "European sports nutrition... now proudly represented in Thailand" —
    // likely means Thailand is where this product is manufactured, not
    // necessarily the brand's origin story. Not a contradiction, just a
    // nuance — keeping "Thailand" since that's what the product listing
    // itself specifies.
    logoDomain: 'fitexpo.co.th', // FitWin Thailand's real site, confirmed via search
    countryCode: 'TH',
    tags: ['thai-made'],
    flavors: [
      {
        id: 'forma-chocolate',
        name: 'Forma Chocolate',
        priceThb: 58,
        proteinG: 20,
        calories: 178,
        carbsG: 3.5,
        fatG: 4.9,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/60PwjBKiC6?share_channel_code=6' }],
      },
      {
        id: 'forma-raspberry-cheesecake',
        name: 'Forma Raspberry Cheesecake',
        priceThb: 58,
        proteinG: 20,
        calories: 178,
        carbsG: 3.5,
        fatG: 4.9,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/60PwjBKiC6?share_channel_code=6' }],
      },
      {
        id: 'forma-strawberry-yoghurt',
        name: 'Forma Strawberry Yoghurt',
        priceThb: 58,
        proteinG: 20,
        calories: 178,
        carbsG: 3.5,
        fatG: 4.9,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/60PwjBKiC6?share_channel_code=6' }],
      },
      {
        id: 'forma-cookies-cream',
        name: 'Forma Cookies & Cream',
        priceThb: 58,
        proteinG: 20,
        calories: 178,
        carbsG: 3.5,
        fatG: 4.9,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/60PwjBKiC6?share_channel_code=6' }],
      },
      {
        id: 'forma-coconut',
        name: 'Forma Coconut',
        priceThb: 58,
        proteinG: 20,
        calories: 178,
        carbsG: 3.5,
        fatG: 4.9,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/60PwjBKiC6?share_channel_code=6' }],
      },
    ],
  },
  {
    id: 'quest-nutrition',
    brand: 'Quest Nutrition',
    country: 'United States',
    logoDomain: 'questnutrition.com',
    countryCode: 'US',
    tags: ['imported'],
    flavors: [
      { id: 'chocolate-brownie', name: 'Chocolate Brownie', priceThb: 139, proteinG: 21, calories: 170, carbsG: 4, sugarG: 1, shops: [{ shopId: 'tops' }] }, // carbsG is NET carbs (Quest's own labeling), not total — differs from other brands below, which use total carbs
      { id: 'double-chocolate-chunk', name: 'Double Chocolate Chunk', priceThb: 139, proteinG: 21, calories: 170, carbsG: 24, fatG: 7, shops: [{ shopId: 'tops' }] },
      { id: 'lemon-cake', name: 'Lemon Cake', priceThb: 139, proteinG: 21, calories: 170, carbsG: 23, fatG: 7, sugarG: 1, shops: [{ shopId: 'tops' }] },
      { id: 'white-chocolate-raspberry', name: 'White Chocolate Raspberry', priceThb: 139, proteinG: 21, carbsG: 21, sugarG: 2, shops: [{ shopId: 'tops' }] }, // total carbs this time, not net
    ],
  },
  {
    id: 'musashi',
    brand: 'Musashi',
    country: 'Australia',
    logoDomain: 'musashi.com',
    countryCode: 'AU',
    tags: ['imported'],
    flavors: [
      { id: 'high-protein-milk-choc-brownie', name: 'High Protein Milk Choc Brownie Bar', priceThb: 129, proteinG: 45, calories: 337, carbsG: 3.1, fatG: 6.9, sugarG: 2, shops: [{ shopId: 'tops' }] },
      { id: 'high-protein-dark-choc-salted-caramel', name: 'Dark Chocolate Salted Caramel Bar', priceThb: 129, proteinG: 45, calories: 337, carbsG: 2, fatG: 7.2, shops: [{ shopId: 'tops' }] },
      { id: 'crisp-vanilla-caramel', name: 'Crisp Vanilla Caramel', priceThb: 89, proteinG: 20, sugarG: 4, shops: [{ shopId: 'tops' }] }, // only sugar confirmed for this flavor — calories/carb/fat not found
      {
        id: 'high-protein-caramel-shopee',
        name: 'High Protein Caramel',
        priceThb: 74,
        proteinG: 45,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6pz3ifq1YS?share_channel_code=6' }],
      },
      {
        id: 'high-protein-cookies-cream-shopee',
        name: 'High Protein Cookies & Cream',
        priceThb: 74,
        proteinG: 45,
        calories: 337,
        carbsG: 3,
        fatG: 6.8,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6pz3ifq1YS?share_channel_code=6' }],
      },
      {
        id: 'high-protein-white-choc-caramel',
        name: 'High Protein White Choc Caramel',
        priceThb: 74,
        proteinG: 45,
        calories: 354,
        carbsG: 3.5, // retailer-listed figure; a nutrition-tracker site gave 25g for this flavor, discarded as an outlier — see file-level Musashi note
        fatG: 8.2,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6pz3ifq1YS?share_channel_code=6' }],
      },
      {
        id: 'high-protein-peanut-butter',
        name: 'High Protein Peanut Butter',
        priceThb: 74,
        proteinG: 45,
        calories: 347,
        carbsG: 24,
        fatG: 8.1,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6pz3ifq1YS?share_channel_code=6' }],
      },
      {
        id: 'deluxe-peanut-crunch',
        name: 'Deluxe Peanut Crunch', // clearance pricing — see note at top of file
        priceThb: 74,
        proteinG: 21,
        calories: 257,
        fatG: 11, // carb figures conflicted badly across sources (7g vs 22-24g) — left out rather than guess
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6ffdWMqetR?share_channel_code=6' }],
      },
      {
        id: 'deluxe-jam-donut',
        name: 'Deluxe Jam Donut',
        priceThb: 74,
        proteinG: 21,
        calories: 236,
        carbsG: 23,
        fatG: 9.3,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6ffdWMqetR?share_channel_code=6' }],
      },
      {
        id: 'deluxe-rocky-road',
        name: 'Deluxe Rocky Road',
        priceThb: 74,
        proteinG: 21,
        calories: 244,
        carbsG: 9.4,
        fatG: 8.4,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6ffdWMqetR?share_channel_code=6' }],
      },
      {
        id: 'deluxe-choc-caramel',
        name: 'Deluxe Choc Caramel',
        priceThb: 74,
        proteinG: 21,
        shops: [{ shopId: 'shopee-thailand', url: 'https://s.shopee.co.th/6ffdWMqetR?share_channel_code=6' }],
      },
    ],
  },
  {
    id: 'go-on-protein',
    brand: 'Go On Protein',
    country: 'Poland', // corrected 2026-07-12 — confirmed via Tops' own product page (see note above)
    logoDomain: 'sante.com.pl', // Sante — the Polish manufacturer, confirmed earlier via web search
    countryCode: 'PL',
    tags: ['imported'],
    flavors: [
      { id: 'vanilla-chocolate', name: 'Vanilla Flavour and Chocolate', priceThb: 69, proteinG: 18, shops: [{ shopId: 'tops' }] },
      { id: 'peanut-chocolate', name: 'Peanut and Chocolate', priceThb: 70, proteinG: 18, shops: [{ shopId: 'tops' }] }, // confirmed price, currently out of stock
      { id: 'cranberry-goji-chocolate', name: 'Cranberry Goji & Chocolate', priceThb: 129, proteinG: 18, shops: [{ shopId: 'villa-market' }] },
    ],
  },
]

export function ratio(priceThb, proteinG) {
  return (priceThb / proteinG).toFixed(2)
}

// Full nutrition fields (calories, carbsG, fatG, sugarG) are optional on
// each flavor — most of the current catalog doesn't have them yet,
// backfilled gradually as real links come in. This returns only the
// fields actually present, formatted, or null if none are set at all —
// never shows a blank/zero for data we don't actually have.
export function formatMacros(flavor) {
  const parts = []
  if (flavor.calories != null) parts.push(`${flavor.calories} kcal`)
  if (flavor.carbsG != null) parts.push(`${flavor.carbsG}g carb`)
  if (flavor.fatG != null) parts.push(`${flavor.fatG}g fat`)
  if (flavor.sugarG != null) parts.push(`${flavor.sugarG}g sugar`)
  return parts.length ? parts.join(' · ') : null
}

// A promo is only "active" if today falls within its optional start/end
// window — no lower bound means it's already started, no upper bound means
// it doesn't expire. Label alone (no dates) means an indefinite promo.
// Returns null if there's no promo or it isn't active right now, so
// callers can just check truthiness. Promos live on a flavor's individual
// shop entries (shops[].promo), not the flavor itself — a deal at Tops
// doesn't mean the same deal exists at Villa Market or Shopee, so this
// takes the promo object directly rather than a whole flavor/shop entity.
export function activePromo(promo) {
  if (!promo || !promo.label) return null
  const now = Date.now()
  if (promo.startsAt && now < promo.startsAt) return null
  if (promo.endsAt && now > promo.endsAt) return null
  return promo
}

// Converts an ISO 3166-1 alpha-2 code ('TH') to a flag image URL via
// flagcdn.com — flag emoji don't render as flags on Windows.
export function flagUrl(countryCode) {
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`
}

// Real favicon from the brand's own official domain — same approach as
// shopIconUrl in shops.js, for the same reason: an actual mark the brand
// itself serves, not a fabricated logo file.
export function brandLogoUrl(logoDomain) {
  if (!logoDomain) return null
  return `https://www.google.com/s2/favicons?sz=64&domain=${logoDomain}`
}

// Not every brand has a fetchable domain (Guyvy is real, GMP-certified,
// sells through LINE/Facebook/marketplaces, but has no standalone
// website). For those, `logoUrl` on the product points at a self-hosted
// image in public/logos/ instead — real, sourced from Pumba directly, not
// fabricated. This resolver prefers a self-hosted logoUrl when present,
// falls back to the domain-favicon approach otherwise.
export function resolveLogoUrl(product) {
  return product.logoUrl || brandLogoUrl(product.logoDomain)
}
