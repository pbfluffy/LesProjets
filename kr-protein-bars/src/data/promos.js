// Researched July 31, 2026. Real products/prices, sourced as noted per entry —
// NOT fabricated. Every entry below is `confirmed: true` — checked directly
// against the store's own live event page/search (CU, GS25: no explicit end
// date is shown on their sites, so endDate is null and the app shows
// "Ongoing" — it means "live as of this check," not "guaranteed to run all
// month." emart24 does publish explicit MM.DD-MM.DD windows, used as
// startDate/endDate). The `confirmed` field is kept in the schema (rather
// than dropped) because it'll matter again the moment a future entry can
// only be sourced from a third-party tracker instead of the store itself.
//
// Anything that could only be found on a third-party tracker, not the
// store's own site, has been deliberately left OUT rather than kept as an
// unverified guess. That's why 7-Eleven currently has zero entries — its own
// site blocks automated access entirely (browser nav denied, direct fetch
// refused, tried the main domain, mobile subdomain, a direct subpage, and a
// Wayback Machine route) — and why the Orion bar (CU) and two Lotte bars
// (GS25) that used to be listed here are gone: a direct, exhaustive check of
// each store's own live listing (CU: all ~720 items across its 1+1/2+1 tabs;
// GS25: its own keyword search for "단백질" and "프로틴", every result page)
// found no trace of them.
//
// proteinG is null where I found the product's calories but not an exact
// protein-gram figure — better to omit than guess. daysLeft/value sorting
// treats null protein as unrankable (sorts last within its tier).
//
// imageUrl points at each store's own product-image CDN (extracted from the
// same page each entry was verified against) — not self-hosted. If a URL
// ever breaks, the card just hides the image (onError) rather than showing
// a broken-image icon.
//
// promo: '1+1' | '2+1' | 'percent' | 'none'
export const STORES = ['CU', 'GS25', '7-Eleven', 'emart24']

export const promos = [
  {
    id: 'cu-orion-doctoryou-regular',
    store: 'CU',
    brand: '오리온 (Orion)',
    name: '닥터유 단백질바',
    imageUrl: 'https://tqklhszfkvzk6518638.edge.naverncp.com/product/8801117478100.jpg',
    proteinG: 12,
    priceKrw: 1600,
    promo: 'none',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://cu.bgfretail.com/product/search.do?searchKeyword=%EB%8B%A5%ED%84%B0%EC%9C%A0',
    notes: 'Regular-price reference, not a promo — CU\'s catalog search only turns up this standard Dr.You bar (~12g protein), no active 1+1/2+1. The 24g-protein "Dr.You PRO" bar specifically was searched for directly (CU, GS25, emart24 catalogs, plus the 7-Eleven tracker) and doesn\'t appear to be carried at any of the four stores at all — it looks like an online-retail-only SKU (Coupang/SSG/Kurly/Dr.You\'s own mall).',
  },
  {
    id: 'cu-dongsuh-post',
    store: 'CU',
    brand: '동서 (Dongsuh)',
    name: '포스트 프로틴바 50g',
    imageUrl: 'https://tqklhszfkvzk6518638.edge.naverncp.com/product/8801037094701.png',
    proteinG: 14,
    priceKrw: 2100,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://cu.bgfretail.com/event/plus.do?category=event&depth2=1&sf=N',
    notes: 'Found live on CU\'s own 2+1 event tab (checked Jul 31, 2026) — same ₩2,100 price as at emart24/GS25. CU\'s site doesn\'t publish an explicit promo end date.',
  },
  {
    id: 'emart24-dongsuh-post',
    store: 'emart24',
    brand: '동서 (Dongsuh)',
    name: '포스트 프로틴바 50g',
    imageUrl: 'https://msave.emart24.co.kr/cmsbo/upload/nHq/plu_image/500x500/8801037094701.JPG',
    proteinG: 14,
    priceKrw: 2100,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: '2026-08-01',
    endDate: '2026-08-14',
    sourceUrl: 'https://emart24.co.kr/goods/event?search=%EB%8B%A8%EB%B0%B1%EC%A7%88',
    notes: 'Re-verified Jul 31, 2026 against emart24\'s own event page. Protein/nutrition confirmed at 14g per 50g bar.',
  },
  {
    id: 'gs25-dongsuh-post',
    store: 'GS25',
    brand: '동서 (Dongsuh)',
    name: '포스트 프로틴바 50g',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8801037094701_002.jpg',
    proteinG: 14,
    priceKrw: 2100,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found via GS25\'s own product-search box (checked Jul 31, 2026) — same product/price as CU and emart24. GS25\'s site doesn\'t publish an explicit promo end date.',
  },
  {
    id: 'emart24-dongwon-tofu',
    store: 'emart24',
    brand: '동원 (Dongwon)',
    name: '어단백프로틴바 두부 70g',
    imageUrl: 'https://msave.emart24.co.kr/cmsbo/upload/nHq/plu_image/500x500/8801047521006.JPG',
    proteinG: null,
    priceKrw: 3500,
    promo: '1+1',
    percentOff: null,
    confirmed: true,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    sourceUrl: 'https://emart24.co.kr/goods/event?search=%ED%94%84%EB%A1%9C%ED%8B%B4',
    notes: 'Re-verified Jul 31, 2026 against emart24\'s own event page. 117 kcal per 70g found, but no confirmed protein-gram figure.',
  },
  {
    id: 'emart24-dongwon-chicken',
    store: 'emart24',
    brand: '동원 (Dongwon)',
    name: '어단백프로틴바 닭가슴살 70g',
    imageUrl: 'https://msave.emart24.co.kr/cmsbo/upload/nHq/plu_image/500x500/8801047521013.JPG',
    proteinG: null,
    priceKrw: 3500,
    promo: '1+1',
    percentOff: null,
    confirmed: true,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    sourceUrl: 'https://emart24.co.kr/goods/event?search=%ED%94%84%EB%A1%9C%ED%8B%B4',
    notes: 'Re-verified Jul 31, 2026 against emart24\'s own event page — same line as the tofu flavor above, no confirmed protein-gram figure.',
  },
  {
    id: 'gs25-dongwon-tofu',
    store: 'GS25',
    brand: '동원 (Dongwon)',
    name: '어단백프로틴바 두부 70g',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8801047521006_001.jpg',
    proteinG: null,
    priceKrw: 3500,
    promo: '1+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found via GS25\'s own product search (checked Jul 31, 2026) — same product/price as the emart24 listing.',
  },
  {
    id: 'gs25-dongwon-chicken',
    store: 'GS25',
    brand: '동원 (Dongwon)',
    name: '어단백프로틴바 닭가슴살 70g',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8801047521013_001.jpg',
    proteinG: null,
    priceKrw: 3500,
    promo: '1+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found via GS25\'s own product search (checked Jul 31, 2026) — same product/price as the emart24 listing.',
  },
  {
    id: 'gs25-mars-bekind-almond',
    store: 'GS25',
    brand: '한국마즈 (Mars)',
    name: '비카인드 다크초콜릿 아몬드 단백질바',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8804973309267_002.jpg',
    proteinG: 9,
    priceKrw: 2500,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found live via GS25\'s own "단백질" product search (checked Jul 31, 2026), same ₩2,500 price as previously found on the third-party tracker.',
  },
  {
    id: 'gs25-proteinone-peanutbutter',
    store: 'GS25',
    brand: '프로티원 (Proteine1)',
    name: '단백질바 피넛버터',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8809606560312_001.jpg',
    proteinG: null,
    priceKrw: 3900,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found live via GS25\'s own "단백질" product search (checked Jul 31, 2026). No protein-gram figure found for this specific SKU.',
  },
  {
    id: 'gs25-hyosung-tofu-fishmeat',
    store: 'GS25',
    brand: '효성 (Hyosung)',
    name: '프로틴 두부어육바 80g',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8809331461007_001.jpg',
    proteinG: null,
    priceKrw: 3700,
    promo: '1+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found live via GS25\'s own "프로틴" product search (checked Jul 31, 2026). Tofu/fish-meat bar; no protein-gram figure found for this specific SKU.',
  },
  {
    id: 'gs25-meals-deepchoco',
    store: 'GS25',
    brand: '밀스 · 인테이크 (Meals · Intake)',
    name: '프로틴바 딥초코',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8809403539306_001.jpg',
    proteinG: 15,
    priceKrw: 2500,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found live via GS25\'s own "프로틴" product search (checked Jul 31, 2026). "15" in the product\'s own name is its protein-gram claim (Intake\'s own marketing: "단백질 15g 프로틴바"), not the bar\'s weight (that\'s ~60g).',
  },
  {
    id: 'gs25-meals-vanillacaramel',
    store: 'GS25',
    brand: '밀스 · 인테이크 (Meals · Intake)',
    name: '프로틴바 바닐라카라멜',
    imageUrl: 'https://image.woodongs.com/imgsvr/item/GD_8809403539313_001.jpg',
    proteinG: 15,
    priceKrw: 2500,
    promo: '2+1',
    percentOff: null,
    confirmed: true,
    startDate: null,
    endDate: null,
    sourceUrl: 'http://gs25.gsretail.com/gscvs/ko/products/event-goods',
    notes: 'Found live via GS25\'s own "프로틴" product search (checked Jul 31, 2026) — same line as the deep-chocolate flavor above.',
  },
  // 7-Eleven currently has no entries here. 7-eleven.co.kr blocks automated
  // access entirely (browser nav denied, direct fetch connection refused —
  // tried the main domain, mobile subdomain, a direct subpage, and a Wayback
  // Machine snapshot route). The two third-party-tracker-only bars that used
  // to be listed here were dropped rather than kept as unverified guesses —
  // add real entries back once 7-Eleven's own site is reachable, or once you
  // spot something in store yourself.
]
