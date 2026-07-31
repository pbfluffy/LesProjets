// Researched July 31, 2026. Real products/prices, sourced as noted per entry —
// NOT fabricated. Two different confidence levels, shown via `confirmed`:
//
//   confirmed: true   — pulled straight from a store's own official event
//                       page with explicit promo dates (still worth a quick
//                       in-store double-check, prices/promos do change).
//   confirmed: false  — a real product with a real historical price/promo
//                       shown by a third-party price-tracking site, but I
//                       could not confirm it's *currently* running this
//                       month. Treat as "worth checking in store," not "live."
//
// proteinG is null where I found the product's calories but not an exact
// protein-gram figure — better to omit than guess. daysLeft/value sorting
// treats null protein as unrankable (sorts last within its tier).
//
// promo: '1+1' | '2+1' | 'percent' | 'none'
export const STORES = ['CU', 'GS25', '7-Eleven', 'emart24']

export const promos = [
  {
    id: 'emart24-dongsuh-post',
    store: 'emart24',
    brand: '동서 (Dongsuh)',
    name: '포스트 프로틴바 50g',
    proteinG: 14,
    priceKrw: 2100,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: '2026-08-01',
    endDate: '2026-08-14',
    sourceUrl: 'https://emart24.co.kr/goods/event?search=%EB%8B%A8%EB%B0%B1%EC%A7%88',
    notes: 'From emart24’s own event page. Protein/nutrition confirmed at 14g per 50g bar.',
  },
  {
    id: 'emart24-dongwon-tofu',
    store: 'emart24',
    brand: '동원 (Dongwon)',
    name: '프로틴바 두부 70g',
    proteinG: null,
    priceKrw: 3500,
    promo: '1+1',
    percentOff: null,
    confirmed: true,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    sourceUrl: 'https://emart24.co.kr/goods/event?search=%ED%94%84%EB%A1%9C%ED%8B%B4',
    notes: 'From emart24’s own event page (117 kcal per 70g found, but no confirmed protein-gram figure).',
  },
  {
    id: 'emart24-dongwon-chicken',
    store: 'emart24',
    brand: '동원 (Dongwon)',
    name: '프로틴바 닭가슴살 70g',
    proteinG: null,
    priceKrw: 3500,
    promo: '1+1',
    percentOff: null,
    confirmed: true,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    sourceUrl: 'https://emart24.co.kr/goods/event?search=%ED%94%84%EB%A1%9C%ED%8B%B4',
    notes: 'From emart24’s own event page — same line as the tofu flavor above, no confirmed protein-gram figure.',
  },
  {
    id: 'cu-orion-probar',
    store: 'CU',
    brand: '오리온 (Orion)',
    name: '단백질바프로',
    proteinG: 12,
    priceKrw: 2700,
    promo: '2+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://pyony.com/brands/cu/products/30549/',
    notes: 'Recurring CU 2+1 item (seen 2022, 2025, and May 2026) — not confirmed active this month. Protein figure (12g/50g) is from Orion’s Dr.You Pro protein-bar line, the closest confirmed match.',
  },
  {
    id: 'gs25-lotte-ezprotein-multi',
    store: 'GS25',
    brand: '롯데 (Lotte)',
    name: '이지프로틴 멀티단백질바 40g',
    proteinG: 12,
    priceKrw: 2000,
    promo: '2+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://pyony.com/brands/gs25/products/42931/',
    notes: 'Real product/price, but last seen listed as a promo in Dec 2024 — not confirmed active this month.',
  },
  {
    id: 'gs25-lotte-chodanbaek',
    store: 'GS25',
    brand: '롯데 (Lotte)',
    name: '초단백질바 40g',
    proteinG: 9,
    priceKrw: 1200,
    promo: '2+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://pyony.com/brands/gs25/products/15133/',
    notes: 'Long-running GS25 item (seen as far back as 2020, most recently Oct 2023) — not confirmed active this month.',
  },
  {
    id: 'gs25-mars-bekind-almond',
    store: 'GS25',
    brand: '한국마즈 (Mars)',
    name: '비카인드 다크초콜릿 아몬드 단백질바',
    proteinG: 9,
    priceKrw: 2500,
    promo: '2+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://pyony.com/brands/gs25/',
    notes: 'Most recently seen as a GS25 promo item in June 2026 (most recent hit of anything found for this store besides the two above) — not confirmed active this month.',
  },
  {
    id: 'seven-goraesa-lobster',
    store: '7-Eleven',
    brand: '고래사어묵 (Goraesa)',
    name: '프로틴바 (랍스터) 80g',
    proteinG: null,
    priceKrw: 3300,
    promo: '2+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://pyony.com/brands/seven/products/40032/',
    notes: 'Fish-cake (surimi) style protein snack, seen at 7-Eleven in 2023 and Dec 2025 — not confirmed active this month. Only calorie data found (73 kcal/80g), no confirmed protein-gram figure.',
  },
]
