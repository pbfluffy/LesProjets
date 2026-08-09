// Curated birthday-month privileges for Thai brands. This is intentionally a
// short, hand-checked list, not an attempt at a comprehensive database — see
// README.md for why. Every entry was checked directly against the brand's
// own site/app/social account on `lastVerified`; confidence reflects how
// citable that source actually is:
//   'official'  — a dated, structured page on the brand's own domain
//   'social'    — confirmed via the brand's own official social account,
//                 but no stable webpage states the same terms
// Brands that were checked and turned up nothing citable (dead campaign
// pages, boutique brands with only third-party aggregator mentions, no
// birthday privilege found at all) are deliberately left out rather than
// included with a guess — see the research log in README.md.

export const CATEGORIES = ['cafe', 'restaurant', 'buffet', 'fastfood', 'entertainment', 'wellness']

// Tier reflects how "free" the privilege actually is end-to-end — both
// whether the item itself costs money, and what it takes to become eligible.
// Ordered best (SSS) to worst (B); see each entry's `tierReason` for the
// specific reasoning. This is a judgment call made by hand per entry, not a
// formula — kept as an explicit field rather than derived at render time so
// the reasoning is visible and reviewable in the data itself.
export const TIERS = [
  {
    key: 'SSS',
    color: 'green',
    label: { th: 'SSS — ฟรีจริง ไม่มีเงื่อนไข', en: 'SSS — Actually free, no strings' },
  },
  {
    key: 'S',
    color: 'blue',
    label: { th: 'S — ของฟรี แต่มีทางลัดจ่ายเงินเล็กน้อย', en: 'S — Free item, small paid shortcut exists' },
  },
  {
    key: 'A',
    color: 'amber',
    label: { th: 'A — ของฟรี แต่ต้องมียอดใช้จ่ายสะสม', en: 'A — Free item, but needs a real spend threshold' },
  },
  {
    key: 'B',
    color: 'red',
    label: { th: 'B — ไม่ใช่ของฟรี เป็นแค่ราคาพิเศษ', en: 'B — Not actually free, just a member discount' },
  },
]

export const privileges = [
  {
    id: 'starbucks-th',
    brand: 'Starbucks Thailand',
    category: 'cafe',
    item: {
      th: 'เครื่องดื่มชงสด 1 แก้ว (ปรับสูตรได้ฟรี 2 อย่าง) + เค้ก 1 ชิ้น (มูลค่าไม่เกิน 150 บาท)',
      en: 'One free handcrafted drink (any size, 2 free customizations) + one free slice of cake (max value 150฿)',
    },
    tier: 'A',
    tierReason: {
      th: 'ของฟรี แต่ต้องสะสม 300 ดาว (~7,500 บาท) ภายใน 12 เดือนก่อนถึงจะได้สิทธิ์ ไม่มีทางลัดจ่ายเงินแทน',
      en: 'Item is free, but reaching Gold takes ~7,500฿ of spend (300 Stars) within 12 months — no paid shortcut',
    },
    gate: {
      th: 'ต้องเป็นสมาชิกระดับ Gold (สะสม 300 ดาวภายใน 12 เดือน) — ระดับ Green ยังไม่ได้สิทธิ์นี้',
      en: 'Gold Level members only (300+ Stars within 12 months) — not available at entry Green level',
    },
    howToClaim: {
      th: 'ลงทะเบียนบัตร Starbucks Card หรือแอป Starbucks TH แล้วรับสิทธิ์อัตโนมัติในเดือนเกิด',
      en: 'Register a Starbucks Card or the Starbucks TH app; the reward is added automatically in your birth month',
    },
    confidence: 'official',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.stagingsr.com/Home/Faq',
    sourceLabel: 'Starbucks Rewards — official FAQ',
  },
  {
    id: 'mk-restaurant',
    brand: 'MK Restaurant',
    category: 'restaurant',
    item: {
      th: 'ชุด Birthday Special ราคาพิเศษสำหรับสมาชิก (ราคาลดจากปกติ)',
      en: 'Birthday Special Set at a discounted member price',
    },
    tier: 'B',
    tierReason: {
      th: 'สมัครสมาชิก MK Red ฟรี แต่ตัวชุดวันเกิดเองยังต้องจ่ายเงิน (แค่ลดราคา) ไม่ใช่ของแจกฟรี',
      en: 'MK Red membership is free to join, but the birthday set itself still costs money — it\'s a discount, not a giveaway',
    },
    gate: {
      th: 'ต้องเป็นสมาชิก MK Red การ์ดขึ้นไป ใช้ได้ 1 ครั้งต่อบิล เฉพาะทานที่ร้าน',
      en: 'MK Red card members and above; once per receipt, dine-in only',
    },
    howToClaim: {
      th: 'จองสิทธิ์ผ่าน LINE OA ของ MK, เว็บไซต์ thisismymk.com หรือแอป MyMK',
      en: 'Claim via MK LINE Official Account, thisismymk.com, or the MyMK app',
    },
    confidence: 'official',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.mkrestaurant.com/th/promotion/detail/สมาชิก-mk-red-ฉลองวันเกิดสุดพิเศษกับชุด-birthday-special-เพียง-599-บาท-ปกติ-859-บาท-1',
    sourceLabel: 'MK Restaurant — official promotion page',
  },
  {
    id: 'sizzler-th',
    brand: 'Sizzler',
    category: 'buffet',
    item: {
      th: 'Combination Platter มูลค่า 399 บาท เลือกได้ 1 จานเมนูใดก็ได้ (เฉพาะเดือนเกิด)',
      en: 'Combination Platter worth 399฿, any 1 dish (birth month only)',
    },
    tier: 'S',
    tierReason: {
      th: 'ของฟรี และมีทางลัดจ่ายครั้งเดียว 399 บาทซื้อบัตรสมาชิก แทนการรอสะสมยอดใช้จ่าย 8,000 บาท',
      en: 'Item is free, and there\'s a one-time 399฿ paid-card shortcut instead of waiting to hit the 8,000฿ spend threshold',
    },
    gate: {
      th: 'ต้องเป็นสมาชิกระดับ Gold ขึ้นไป (สะสมยอดใช้จ่าย 8,000 บาทใน 12 เดือน หรือซื้อบัตรสมาชิก 399 บาท)',
      en: 'Gold Level+ members only (8,000฿ spend within 12 months, or purchase the 399฿ member card)',
    },
    howToClaim: {
      th: 'แลกคูปองผ่าน LINE Official Account ของ Sizzler ก่อนเข้าใช้บริการ',
      en: 'Redeem the coupon via Sizzler\'s LINE Official Account before dining',
    },
    confidence: 'official',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.sizzler.co.th/th/e-member-benefits-info',
    sourceLabel: 'Sizzler — official member benefits table',
  },
  {
    id: 'cafe-amazon',
    brand: 'Café Amazon',
    category: 'cafe',
    item: {
      th: 'เครื่องดื่มฟรี 1 แก้วในเดือนเกิด',
      en: 'One free drink in your birth month',
    },
    tier: 'A',
    tierReason: {
      th: 'ของฟรี แต่ต้องสะสมคะแนนจากยอดใช้จ่าย (~7,200 บาทขึ้นไป) ก่อนถึงระดับ Gold ไม่มีทางลัดจ่ายเงินแทน',
      en: 'Item is free, but reaching Gold takes real spend (~7,200฿+ to earn 360 points) — no paid shortcut',
    },
    gate: {
      th: 'ต้องเป็นสมาชิกระดับ Gold (สะสม 360 คะแนน) หรือ Platinum (สะสม 1,000 คะแนน) ผ่านแอป blueplus+',
      en: 'Gold (360+ points) or Platinum (1,000+ points) member via the blueplus+ app',
    },
    howToClaim: {
      th: 'ตรวจสอบระดับสมาชิกและรับสิทธิ์ผ่านเมนู Café Amazon Rewards ในแอป blueplus+',
      en: 'Check tier and claim via the Café Amazon Rewards section in the blueplus+ app',
    },
    confidence: 'social',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.tiktok.com/@cafeamazon.official',
    sourceLabel: 'Café Amazon — official TikTok account (no static page states this)',
  },
  {
    id: 'mcdonalds-th',
    brand: "McDonald's Thailand",
    category: 'fastfood',
    item: {
      th: 'ไอศกรีมซันเดฟรี 1 ถ้วยในเดือนเกิด',
      en: 'One free ice cream sundae in your birth month',
    },
    tier: 'SSS',
    tierReason: {
      th: 'ฟรีทันทีที่สมัครแอป ไม่ต้องมียอดใช้จ่ายหรือค่าสมาชิกใดๆ',
      en: 'Free the moment you register in the app — no spend, no membership fee',
    },
    gate: {
      th: 'สมัครสมาชิกผ่านแอป McDonald\'s พร้อมระบุวันเกิดในโปรไฟล์',
      en: 'Free app membership — just register with your birthdate in your profile',
    },
    howToClaim: {
      th: 'คูปองจะปรากฏในแอป McDonald\'s Thailand ในช่วงเดือนเกิดของสมาชิก',
      en: 'The coupon appears in the McDonald\'s Thailand app during your birth month',
    },
    confidence: 'social',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.facebook.com/McThai/',
    sourceLabel: "McDonald's Thailand — official Facebook page (no static page states this)",
  },
  {
    id: 'greyhound-cafe',
    brand: 'Greyhound Café',
    category: 'cafe',
    item: {
      th: 'เค้กวันเกิดพิเศษ + Gift Voucher มูลค่า 500 บาท ที่ Greyhound Café / Another Hound Café ในเดือนเกิด',
      en: 'A specially-made birthday cake + 500฿ Gift Voucher at Greyhound Café / Another Hound Café in your birth month',
    },
    tier: 'SSS',
    tierReason: {
      th: 'ของฟรีและสมัครสมาชิกฟรี ไม่มีเงื่อนไขยอดใช้จ่ายขั้นต่ำสำหรับสิทธิพิเศษวันเกิดพื้นฐาน',
      en: 'Free item, free membership — no spend threshold required for the base birthday privilege',
    },
    gate: {
      th: 'สมัครสมาชิก Greyhound Family ฟรีผ่านแอป ไม่ต้องมียอดใช้จ่ายขั้นต่ำ (สมาชิกระดับ Black ที่สะสม 10,000 คะแนน จะได้เค้กไอศกรีมรุ่นพิเศษกว่าและคะแนนโบนัส 2.5 เท่าเพิ่มเติม)',
      en: 'Free to join via the Greyhound Family app, no spend threshold for the base benefit (Black Members, 10,000+ points, get an upgraded ice-cream cake plus 2.5x bonus points on top)',
    },
    howToClaim: {
      th: 'แสดงบัตรสมาชิกหรือแอป Greyhound Family เมื่อทานที่ร้านในเดือนเกิด',
      en: 'Show your Greyhound Family app/membership when dining in during your birth month',
    },
    confidence: 'official',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.greyhoundcafe.co.th/news/greyhound-member-privilege/',
    sourceLabel: 'Greyhound Café — official member privilege page',
  },
  {
    id: 'oh-juice',
    brand: 'Oh! Juice',
    category: 'cafe',
    item: {
      th: 'เครื่องดื่มฟรี 1 แก้วในเดือนเกิด (เลือกได้ทุกขนาด ทุกเมนู ยกเว้น Signature)',
      en: 'One free drink in your birth month (any size, any menu except Signature items)',
    },
    tier: 'A',
    tierReason: {
      th: 'ของฟรี แต่ต้องสะสมแต้มให้ครบ 50 Star ก่อนถึงจะใช้สิทธิ์ได้ ไม่มีทางลัดจ่ายเงินแทน',
      en: 'Item is free, but you must accumulate 50 Stars before you can redeem it — no paid shortcut',
    },
    gate: {
      th: 'สมัครสมาชิกฟรีผ่าน LINE OA แล้วสะสมแต้มจากการซื้อจนครบ 50 Star',
      en: 'Free membership via LINE Official Account, then accumulate 50 Stars from purchases',
    },
    howToClaim: {
      th: 'แสดงสถานะสมาชิกผ่าน LINE OA @ohjuice.thailand เมื่อครบ 50 Star ในเดือนเกิด',
      en: 'Show your member status via LINE OA @ohjuice.thailand once you have 50+ Stars, during your birth month',
    },
    confidence: 'social',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.facebook.com/61557673142882/posts/122174373278255771/',
    sourceLabel: 'Oh! Juice — official Facebook post (7 Jan 2025)',
  },
  {
    id: 'potato-corner',
    brand: 'Potato Corner',
    category: 'fastfood',
    item: {
      th: 'เฟรนช์ฟรายส์ฟรี 1 ถ้วยในเดือนเกิด (ใช้ได้ 1 ครั้ง/ปี)',
      en: 'One free cup of French fries in your birth month (once per year)',
    },
    tier: 'SSS',
    tierReason: {
      th: 'ของฟรีและสมัครสมาชิก TOTO Club ฟรีทันที ไม่มีเงื่อนไขยอดใช้จ่ายขั้นต่ำ',
      en: 'Free item and free TOTO Club membership with immediate privileges — no spend threshold',
    },
    gate: {
      th: 'สมัครสมาชิก TOTO Club ฟรีผ่าน LINE OA @PotatoCornerTH ได้สิทธิ์ทันทีที่สมัคร',
      en: 'Free TOTO Club membership via LINE OA @PotatoCornerTH — privileges apply immediately upon signup',
    },
    howToClaim: {
      th: 'กดรับคูปองในเมนู TOTO Club > Promotion ผ่าน LINE OA ใช้ได้ภายใน 1 ชั่วโมงหลังกดรับ ทุกสาขายกเว้นสนามบิน',
      en: 'Claim the coupon via the LINE OA menu: TOTO Club > Promotion. Valid for 1 hour after claiming, all branches except airport locations',
    },
    confidence: 'social',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.tiktok.com/@potatocornerth/video/7459270262756756744',
    sourceLabel: 'Potato Corner Thailand — official TikTok account',
  },
  {
    id: 'suki-teenoi',
    brand: 'สุกี้ตี๋น้อย (Suki Teenoi)',
    category: 'buffet',
    item: {
      th: 'บุฟเฟต์สุกี้ฟรี 1 มื้อ (มูลค่า 276 บาท) ในเดือนเกิด + ผู้ติดตาม 1-5 คนลด 50% (ตามระดับสถานะ)',
      en: 'One free hotpot buffet meal (worth 276฿) in your birth month, plus 50% off for 1-5 guests dining with you (depending on tier)',
    },
    tier: 'A',
    tierReason: {
      th: 'ของฟรี แต่ต้องสะสมยอดใช้จ่ายให้ครบ 50 คอนโด (1 คอนโด = 276 บาท) คือประมาณ 13,800 บาทภายในปีปฏิทิน ก่อนถึงจะได้สถานะ Baby ซึ่งเป็นสถานะต่ำสุดที่มีสิทธิ์นี้ และคะแนนรีเซ็ตทุกสิ้นปี — เกณฑ์สูงกว่าแบรนด์อื่นในลิสต์นี้',
      en: 'Item is free, but you need ~13,800฿ of spend within the calendar year (50 points at 276฿ each) just to reach the lowest qualifying tier, and points reset every December 31 — a notably higher bar than other entries here',
    },
    gate: {
      th: 'สมัครฟรีผ่าน LINE OA @sukiteenoi แต่ต้องสะสมคะแนนให้ครบ 50 คอนโด (Baby) / 70 คอนโด (Teen) / 100 คอนโด (Topfan) ภายในปีปฏิทิน จึงจะได้สิทธิ์ในปีถัดไป',
      en: 'Free registration via LINE OA @sukiteenoi, but must accumulate 50 points (Baby) / 70 (Teen) / 100 (Topfan) within the calendar year to unlock the benefit the following year',
    },
    howToClaim: {
      th: 'แสดงคูปองจากระบบสะสมแต้ม @Sukiteenoi พร้อมบัตรประชาชนที่ร้านในเดือนเกิด (ใช้ได้ 1 ครั้ง/ปี)',
      en: 'Show the coupon from the @Sukiteenoi points system plus your ID card at the restaurant during your birth month (once per year)',
    },
    confidence: 'social',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.facebook.com/sukiteenoithailand/posts/982969643864831/',
    sourceLabel: 'สุกี้ตี๋น้อย (Suki Teenoi) — official Facebook post (2 Dec 2024)',
  },
  {
    id: 'major-cineplex-mgen',
    brand: 'Major Cineplex (M GEN)',
    category: 'entertainment',
    item: {
      th: 'ตั๋วหนังฟรี 1 ที่นั่ง (ที่นั่งปกติ ระบบดิจิตอล) ในสัปดาห์เกิด',
      en: 'One free movie ticket (standard seat, digital format) during your birth week',
    },
    tier: 'SSS',
    tierReason: {
      th: 'ของฟรีและสมัครสมาชิก M GEN ฟรีผ่านแอป ไม่มีเงื่อนไขยอดใช้จ่ายขั้นต่ำ — สิทธิ์นี้ใช้ได้ทุกระดับสมาชิก ไม่ใช่แค่ระดับสูง',
      en: 'Free item and free M GEN membership via the app, no spend threshold — available at every membership level, not just the top tier',
    },
    gate: {
      th: 'สมัครสมาชิก M GEN ฟรีผ่านแอป ต้องสมัครหรือต่ออายุบัตรอย่างน้อย 2 สัปดาห์ก่อนวันเกิด (หมายเหตุ: หน้าเงื่อนไขหลักที่พบระบุช่วงเวลา "ถึง 31 ธ.ค. 2562" แต่พบประกาศเปลี่ยนแปลงสิทธิ์ระดับ First Class ที่ไม่ระบุวันที่แยกต่างหาก ซึ่งยืนยันว่าโปรแกรมนี้ยังดำเนินการอยู่และมีการอัปเดตต่อเนื่อง ไม่ใช่หน้าที่ถูกทิ้งร้าง)',
      en: 'Free M GEN membership via the app; must register or renew your card at least 2 weeks before your birthday (note: the main terms page found is dated "through 31 Dec 2019", but a separate undated notice about a First Class tier change confirms the program is still actively maintained, not an abandoned page)',
    },
    howToClaim: {
      th: 'แสดงบัตร/แอป M GEN พร้อมบัตรประชาชนที่ตู้ E-ticketing ในสัปดาห์เกิด (อาทิตย์-เสาร์)',
      en: 'Show your M GEN card/app plus ID at the E-ticketing kiosk during your birth week (Sunday-Saturday)',
    },
    confidence: 'official',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.majorcineplex.com/promotion/m-gen-happy-birthday',
    sourceLabel: 'Major Cineplex — official promotion page',
  },
  {
    id: 'lets-relax-spa',
    brand: "Let's Relax Spa (WellnessMe)",
    category: 'wellness',
    item: {
      th: 'ส่วนลดค่าบริการสปา 20-30% ตลอดเดือนเกิด (ตามระดับสมาชิก Silver/Gold/Platinum)',
      en: '20-30% off spa services throughout your birth month (Silver/Gold/Platinum tier dependent)',
    },
    tier: 'B',
    tierReason: {
      th: 'เป็นส่วนลด ไม่ใช่ของฟรี — ยังต้องจ่ายค่าบริการอยู่ดี แม้สมัครสมาชิก WellnessMe จะฟรี',
      en: "It's a discount, not a free service — you still pay, even though WellnessMe membership itself is free to join",
    },
    gate: {
      th: 'สมัครสมาชิก WellnessMe ฟรีผ่าน www.WellnessMe.co หรือ LINE OA ของแบรนด์ในเครือ ส่วนลดขึ้นกับระดับสมาชิก (Silver 20% / Gold 25% / Platinum 30%) ซึ่งอิงจากคะแนนสะสม (ทุก 25 บาท = 1 คะแนน) แต่ไม่พบเกณฑ์คะแนนที่ต้องใช้เพื่อขึ้นแต่ละระดับจากแหล่งทางการ',
      en: "Free WellnessMe membership via www.WellnessMe.co or the brand's LINE OA; the discount depends on tier (Silver 20% / Gold 25% / Platinum 30%), based on accumulated points (25฿ = 1 point), but the exact point thresholds for each tier weren't stated on any official source found",
    },
    howToClaim: {
      th: 'Birthday Voucher จะขึ้นในระบบ WellnessMe อัตโนมัติเมื่อถึงเดือนเกิด แสดงให้พนักงานก่อนรับบริการที่ Let\'s Relax Spa ทุกสาขา',
      en: "The Birthday Voucher appears automatically in the WellnessMe app during your birth month; show it to staff before your service at any Let's Relax Spa branch",
    },
    confidence: 'official',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://letsrelaxspa.com/news/wellnessme-birthday-privilege/',
    sourceLabel: "Let's Relax Spa — official WellnessMe birthday privilege page",
  },
  {
    id: 'dream-world',
    brand: 'Dream World',
    category: 'entertainment',
    item: {
      th: 'บัตรเข้าสวนสนุกดรีมเวิลด์ฟรี 1 ใบ (มูลค่า 800 บาท) เฉพาะวันเกิดจริง',
      en: 'One free Dream World theme park ticket (worth 800฿) on your actual birthday',
    },
    tier: 'SSS',
    tierReason: {
      th: 'ของฟรีทั้งใบ ลงทะเบียนล่วงหน้าฟรี ไม่มีค่าสมาชิกหรือยอดใช้จ่ายขั้นต่ำ',
      en: 'Fully free ticket, free advance registration, no membership fee or spend threshold',
    },
    gate: {
      th: 'ลงทะเบียนล่วงหน้าอย่างน้อย 1 วันที่ dreamworld.co.th/regdw และแสดงบัตรประชาชนตัวจริงตรงกับวันเกิดที่หน้าประตู (ผู้ติดตามสูงสุด 3 ท่าน ซื้อบัตรราคาพิเศษ 695 บาทได้)',
      en: 'Register in advance (at least 1 day ahead) at dreamworld.co.th/regdw and show your real ID card matching your birthdate at the gate (up to 3 companions can buy discounted 695฿ tickets)',
    },
    howToClaim: {
      th: 'หลังลงทะเบียนแล้ว ไปที่สวนสนุกในวันเกิดจริงพร้อมบัตรประชาชน รับบัตรเข้าฟรีที่หน้าประตู',
      en: 'After registering, visit the park on your actual birthday with your ID card to receive the free entry ticket at the gate',
    },
    confidence: 'official',
    lastVerified: '2026-08-08',
    sourceUrl: 'https://www.dreamworld.co.th/promotion',
    sourceLabel: 'Dream World — official promotion page',
  },
]
