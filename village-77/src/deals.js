// Promotions on shop items: an item is "on sale" when it has a "was" price
// (oldPrice, only saved above the price now) and "new" for NEW_DAYS after
// it was first added (addedAt, ms — items saved before this have none).
export const NEW_DAYS = 3
const DAY = 24 * 60 * 60 * 1000

export const isOnSale = (it) => !it.sold && typeof it.oldPrice === 'number' && typeof it.price === 'number' && it.oldPrice > it.price
export const isNewItem = (it) => !it.sold && typeof it.addedAt === 'number' && Date.now() - it.addedAt < NEW_DAYS * DAY
export const salePercent = (it) => Math.round((1 - it.price / it.oldPrice) * 100)

// Shops with a sale or a new item, the most recently added first.
export function shopsWithDeals(shops) {
  return shops
    .map((s) => {
      const items = s.items || []
      const hot = items.filter((it) => isOnSale(it) || isNewItem(it))
      return hot.length ? { shop: s, latest: Math.max(0, ...hot.map((it) => it.addedAt || 0)) } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.latest - a.latest)
    .map((x) => x.shop)
}
