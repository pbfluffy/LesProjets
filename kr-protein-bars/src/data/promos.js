// Placeholder sample data — none of this is real. Swap these entries out for
// actual promos you spot in-store; keep the same shape.
//
// promo: '1+1' | '2+1' | 'percent' | 'none'
//   '1+1' / '2+1'  — buy N get 1 free, buys 2 or 3 units for the price of 1/2
//   'percent'      — priceKrw is the pre-discount price; percentOff applies
//   'none'         — no active promo, just tracking the regular price
export const STORES = ['CU', 'GS25', '7-Eleven', 'emart24', 'ministop']

export const promos = [
  {
    id: 'sample-1',
    store: 'CU',
    brand: 'Sample Brand',
    name: 'Whey Protein Bar (Chocolate)',
    proteinG: 20,
    priceKrw: 3000,
    promo: '1+1',
    percentOff: null,
    startDate: '2026-07-15',
    endDate: '2026-08-15',
    notes: 'Placeholder — replace with a real CU promo.',
  },
  {
    id: 'sample-2',
    store: 'GS25',
    brand: 'Sample Brand',
    name: 'High Protein Bar (Peanut Butter)',
    proteinG: 15,
    priceKrw: 2800,
    promo: '2+1',
    percentOff: null,
    startDate: '2026-07-01',
    endDate: '2026-08-05',
    notes: 'Placeholder — replace with a real GS25 promo.',
  },
  {
    id: 'sample-3',
    store: '7-Eleven',
    brand: 'Another Sample',
    name: 'Protein Cookie Bar',
    proteinG: 12,
    priceKrw: 2500,
    promo: 'percent',
    percentOff: 20,
    startDate: '2026-07-20',
    endDate: '2026-08-03',
    notes: 'Placeholder — replace with a real 7-Eleven promo.',
  },
  {
    id: 'sample-4',
    store: 'emart24',
    brand: 'Sample Brand',
    name: 'Protein Yogurt Bar',
    proteinG: 18,
    priceKrw: 3200,
    promo: 'none',
    percentOff: null,
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    notes: 'Placeholder — regular price, no promo tracked yet.',
  },
  {
    id: 'sample-5',
    store: 'ministop',
    brand: 'Another Sample',
    name: 'Low-Sugar Protein Bar',
    proteinG: 21,
    priceKrw: 3500,
    promo: '1+1',
    percentOff: null,
    startDate: '2026-05-01',
    endDate: '2026-07-10',
    notes: 'Placeholder — an already-ended promo, to show that state.',
  },
]
