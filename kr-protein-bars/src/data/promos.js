// Researched July 31 – Aug 1, 2026. Real products/prices, sourced as noted
// per entry — NOT fabricated. Two confidence levels, via `confirmed`:
//
//   confirmed: true   — checked directly against the store's own live event
//                       page/search (CU, GS25: no explicit end date is shown
//                       on their sites, so endDate is null and the app shows
//                       "Ongoing" — it means "live as of this check," not
//                       "guaranteed to run all month." emart24 does publish
//                       explicit MM.DD-MM.DD windows, used as startDate/endDate).
//   confirmed: false  — a real, real-world-sourced entry (third-party
//                       tracker, or a direct in-store sighting) that
//                       couldn't be re-verified against an official source
//                       as *currently* active. Shown as "Not confirmed
//                       active this month."
//
// 7-Eleven's own site blocks automated access entirely (browser nav denied,
// direct fetch refused — main domain, mobile subdomain, a direct subpage,
// and a Wayback Machine route all tried), so nothing there can reach
// confirmed: true from this environment.
//
// Anything found ONLY on a third-party tracker with no other corroboration
// has been left out rather than kept as a guess — that's why the Orion bar
// (CU) and two Lotte bars (GS25) that used to be listed here are gone: a
// direct, exhaustive check of each store's own live listing (CU: all ~720
// items across its 1+1/2+1 tabs; GS25: its own keyword search for "단백질"
// and "프로틴", every result page) found no trace of them. The Dr.You PRO
// 24g-protein bar below is the exception: it also didn't turn up in either
// site search, but a direct first-hand sighting in stores (CU, GS25,
// 7-Eleven, July 2026) is stronger evidence than an incomplete web catalog,
// so it's listed as confirmed: false (not verified as *currently* active)
// rather than left out.
//
// proteinG and priceKrw are null wherever the real figure wasn't available
// (calories-only nutrition data, or no one recalling an exact shelf price)
// — better to omit than guess. daysLeft/value sorting treats null protein
// as unrankable (sorts last within its tier); null priceKrw skips the
// price/effective-price display entirely rather than showing ₩NaN.
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
    notes: 'Regular-price reference, not a promo — CU\'s catalog search only turns up this standard Dr.You bar (~12g protein), no active 1+1/2+1. Not to be confused with the 24g-protein "Dr.You PRO" bar (separate entry below) — that one doesn\'t show up in any store\'s own catalog search either, but was confirmed in stock via a direct in-store sighting.',
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
  // Dr.You PRO 단백질바 크런치 70g (24g protein) — CU/GS25/emart24's own
  // catalog searches all returned zero results for this (checked repeatedly,
  // Jul 31 and Aug 1, 2026), so it was initially treated as online-retail-
  // only. Corrected after direct, first-hand report: seen in stock, on a
  // 1+1 promo, at CU, GS25, AND 7-Eleven in Korea in July 2026 — a physical
  // sighting is better evidence than an incomplete website catalog search.
  // priceKrw is null (not guessed) since no one recalled the exact shelf
  // price; confirmed: false because the *current* status couldn't be
  // re-verified against any official source — same honest treatment as any
  // other unconfirmed-this-month entry, just sourced differently (a
  // real-world sighting instead of a third-party tracker).
  {
    id: 'cu-orion-doctoryou-pro-24g',
    store: 'CU',
    brand: '오리온 (Orion)',
    name: '닥터유 PRO 단백질바 크런치 70g',
    imageUrl: 'https://img.danuri.io/catalog-image/065/607/017/abbc82b4038d42f780fe7f866c1079f6.jpg',
    proteinG: 24,
    priceKrw: null,
    promo: '1+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://prod.danawa.com/info/?pcode=17607065',
    notes: 'Seen in stock at CU on a 1+1 promo in July 2026 (direct report) — CU\'s own catalog search doesn\'t list it, and exact shelf price wasn\'t recalled, so price is left unconfirmed rather than guessed. Source link is an online price-comparison listing for reference only, not this store\'s price.',
  },
  {
    id: 'gs25-orion-doctoryou-pro-24g',
    store: 'GS25',
    brand: '오리온 (Orion)',
    name: '닥터유 PRO 단백질바 크런치 70g',
    imageUrl: 'https://img.danuri.io/catalog-image/065/607/017/abbc82b4038d42f780fe7f866c1079f6.jpg',
    proteinG: 24,
    priceKrw: null,
    promo: '1+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://prod.danawa.com/info/?pcode=17607065',
    notes: 'Seen in stock at GS25 on a 1+1 promo in July 2026 (direct report) — GS25\'s own catalog search doesn\'t list it, and exact shelf price wasn\'t recalled, so price is left unconfirmed rather than guessed. Source link is an online price-comparison listing for reference only, not this store\'s price.',
  },
  {
    id: 'seven-orion-doctoryou-pro-24g',
    store: '7-Eleven',
    brand: '오리온 (Orion)',
    name: '닥터유 PRO 단백질바 크런치 70g',
    imageUrl: 'https://img.danuri.io/catalog-image/065/607/017/abbc82b4038d42f780fe7f866c1079f6.jpg',
    proteinG: 24,
    priceKrw: null,
    promo: '1+1',
    percentOff: null,
    confirmed: false,
    startDate: null,
    endDate: null,
    sourceUrl: 'https://prod.danawa.com/info/?pcode=17607065',
    notes: 'Seen in stock at 7-Eleven on a 1+1 promo in July 2026 (direct report). 7-Eleven\'s own site blocks automated access entirely so it couldn\'t be cross-checked there either way; exact shelf price wasn\'t recalled, so price is left unconfirmed rather than guessed. Source link is an online price-comparison listing for reference only, not this store\'s price.',
  },
]
