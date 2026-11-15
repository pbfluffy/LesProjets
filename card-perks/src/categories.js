export const CATEGORIES = [
  { id: 'dining', label: 'Dining', icon: '🍽️' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'lounge', label: 'Airport lounge', icon: '🛋️' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'cashback', label: 'Cashback', icon: '💸' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'fuel', label: 'Fuel & transport', icon: '⛽' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️' },
  { id: 'wellness', label: 'Health & wellness', icon: '💆' },
  { id: 'other', label: 'Other', icon: '⭐' },
]

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

// Sub-groups of scanned restaurant promotions (the bank's own grouping).
export const PROMO_GROUPS = {
  restaurants: 'Restaurants',
  buffets: 'Buffets',
  'hotel-dining': 'Hotel dining',
  'desserts-beverages': 'Café, desserts & drinks',
  'hot-pot-barbecue': 'Hot pot & BBQ',
}

// Venue-type chips, in display order.
export const PROMO_GROUP_CHIPS = [
  { id: 'restaurants', label: 'Restaurant', icon: '🍴' },
  { id: 'buffets', label: 'Buffet', icon: '🥘' },
  { id: 'desserts-beverages', label: 'Café & desserts', icon: '☕' },
  { id: 'hotel-dining', label: 'Hotel', icon: '🏨' },
  { id: 'hot-pot-barbecue', label: 'Hot pot & BBQ', icon: '🍲' },
]

export const NETWORKS =['Visa', 'Mastercard', 'JCB', 'UnionPay', 'Amex', 'Other']
