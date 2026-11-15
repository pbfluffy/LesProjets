// Generic starter cards. These are NOT real issuer data — perks, limits and
// conditions change often, so they are examples to edit, not facts. Users
// can also start from a blank card and enter their own.
export const TEMPLATES = [
  {
    key: 'travel',
    name: 'Premium Travel Card (example)',
    network: 'Visa',
    perks: [
      { title: 'Airport lounge access', category: 'lounge', requiresPoints: false, pointsCost: null, minSpend: null, conditions: '4 visits per year, show card at the lounge' },
      { title: 'Redeem points for flights', category: 'travel', requiresPoints: true, pointsCost: 20000, minSpend: null, conditions: 'Economy domestic one-way' },
      { title: 'Travel accident insurance', category: 'insurance', requiresPoints: false, pointsCost: null, minSpend: null, conditions: 'Pay the full fare with this card' },
    ],
  },
  {
    key: 'dining',
    name: 'Lifestyle Dining Card (example)',
    network: 'Mastercard',
    perks: [
      { title: '1-for-1 set menu', category: 'dining', requiresPoints: false, pointsCost: null, minSpend: null, conditions: 'Participating restaurants, weekdays' },
      { title: '10% off at partner cafes', category: 'dining', requiresPoints: false, pointsCost: null, minSpend: 500, conditions: 'Minimum bill spend, max 2 uses per month' },
      { title: 'Movie ticket voucher', category: 'entertainment', requiresPoints: true, pointsCost: 3000, minSpend: null, conditions: 'Redeem in the card app' },
    ],
  },
  {
    key: 'cashback',
    name: 'Everyday Cashback Card (example)',
    network: 'JCB',
    perks: [
      { title: '5% cashback on groceries', category: 'cashback', requiresPoints: false, pointsCost: null, minSpend: 1000, conditions: 'Monthly cap applies' },
      { title: 'Fuel discount', category: 'fuel', requiresPoints: false, pointsCost: null, minSpend: 800, conditions: 'Per transaction, selected stations' },
      { title: 'Cash voucher', category: 'shopping', requiresPoints: true, pointsCost: 5000, minSpend: null, conditions: 'Redeem points for shopping vouchers' },
    ],
  },
]
