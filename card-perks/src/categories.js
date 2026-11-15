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
  'desserts-beverages': 'Desserts & drinks',
  'hot-pot-barbecue': 'Hot pot & BBQ',
}

export const NETWORKS =['Visa', 'Mastercard', 'JCB', 'UnionPay', 'Amex', 'Other']
