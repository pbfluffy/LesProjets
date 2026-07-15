// Helpers shared by the admin CRUD forms. Mirrors the schema documented in
// src/firebase.js — a product doc is { id, brand, country, countryCode,
// tags, flavors: [{ id, name, priceThb, proteinG, calories?, carbsG?,
// fatG?, sugarG?, imageUrl?, lastVerifiedAt?, shops: [{shopId, url?}] }] }.

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Builds a flavor id from its name, deduping against sibling flavors on the
// same product (e.g. two flavors that'd both slugify to "chocolate" become
// "chocolate" and "chocolate-2").
export function makeFlavorId(name, existingFlavors) {
  const base = slugify(name)
  const existingIds = new Set(existingFlavors.map((f) => f.id))
  if (!existingIds.has(base)) return base
  let n = 2
  while (existingIds.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

// Throws with a specific message on the first structural problem found,
// rather than silently writing a malformed doc to Firestore. Only checks
// the fields the public site actually reads (see ListingTable.jsx /
// listings.js) — not a full schema validator.
export function assertValidProduct(product) {
  if (!product.id) throw new Error('Product is missing an id')
  if (!product.brand) throw new Error('Brand name is required')
  if (!product.country) throw new Error('Country is required')
  if (!product.countryCode) throw new Error('Country code is required')
  if (!Array.isArray(product.flavors)) throw new Error('Product must have a flavors array')
  product.flavors.forEach((f, i) => {
    if (!f.id) throw new Error(`Flavor #${i + 1} is missing an id`)
    if (!f.name) throw new Error(`Flavor #${i + 1} is missing a name`)
    if (typeof f.priceThb !== 'number' || f.priceThb <= 0) {
      throw new Error(`Flavor "${f.name || i + 1}" needs a price greater than 0`)
    }
    if (typeof f.proteinG !== 'number' || f.proteinG <= 0) {
      throw new Error(`Flavor "${f.name || i + 1}" needs protein grams greater than 0`)
    }
    if (!Array.isArray(f.shops) || f.shops.length === 0) {
      throw new Error(`Flavor "${f.name}" needs at least one shop`)
    }
    if (f.promo) {
      if (!f.promo.label) throw new Error(`Flavor "${f.name}" has a promo with no label`)
      if (f.promo.startsAt && f.promo.endsAt && f.promo.endsAt < f.promo.startsAt) {
        throw new Error(`Flavor "${f.name}"'s promo ends before it starts`)
      }
    }
  })
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

// Flavors that have never been verified, or haven't been touched in 90+
// days — surfaced on the dashboard so re-checking prices happens as part
// of normal admin visits instead of needing a separate reminder system.
export function staleFlavors(products) {
  const now = Date.now()
  const stale = []
  products.forEach((product) => {
    product.flavors.forEach((flavor) => {
      if (!flavor.lastVerifiedAt || now - flavor.lastVerifiedAt > NINETY_DAYS_MS) {
        stale.push({ product, flavor })
      }
    })
  })
  stale.sort((a, b) => (a.flavor.lastVerifiedAt || 0) - (b.flavor.lastVerifiedAt || 0))
  return stale
}
