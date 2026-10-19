import { createContext, useContext } from 'react'

export const LangContext = createContext(null)

// Categories are stored by key in Firestore so a post reads in either
// language; only the labels live here.
export const MARKET_CATEGORIES = ['food', 'home', 'clothes', 'electronics', 'plants', 'vehicles', 'other']
export const TRADES = ['electrician', 'plumber', 'aircon', 'builder', 'painter', 'gardener', 'cleaning', 'mechanic', 'other']

export const STRINGS = {
  th: {
    appName: 'หมู่บ้านของเรา',
    tagline: 'ซื้อขาย หาช่าง ช่วยเหลือกันในหมู่บ้าน',
    navHome: 'หน้าหลัก',
    navMarket: 'ตลาดซื้อขาย',
    navServices: 'สารพัดช่าง',
    backToHome: 'กลับหน้าพอร์ตโฟลิโอ',

    ownerHint: 'แก้ไขหรือลบประกาศได้จากเครื่องนี้เท่านั้น',

    homeWelcome: 'ยินดีต้อนรับสู่ชุมชนของเรา',
    homeBlurb: 'ขายของ หาของ หรือหาช่างใกล้บ้าน — ประกาศจากเพื่อนบ้านและคนนอกหมู่บ้าน มีป้ายบอกชัดเจน',
    homeMarketCard: 'ของขายล่าสุด {n} รายการ',
    homeServicesCard: 'ช่างที่ลงทะเบียน {n} ราย',
    homeLatestMarket: 'ของขายล่าสุด',
    homeLatestServices: 'ช่างล่าสุด',
    seeAll: 'ดูทั้งหมด →',

    resident: 'คนในหมู่บ้าน',
    outsider: 'คนนอกหมู่บ้าน',
    filterAll: 'ทั้งหมด',
    searchPlaceholder: 'ค้นหา…',
    allCategories: 'ทุกหมวด',
    loading: 'กำลังโหลด…',
    emptyMarket: 'ยังไม่มีของขาย — ลงประกาศเป็นคนแรกเลย!',
    emptyServices: 'ยังไม่มีช่างลงทะเบียน — ลงทะเบียนเป็นคนแรกเลย!',
    noMatches: 'ไม่พบรายการที่ตรงกับตัวกรอง',

    addListing: '+ ลงขายของ',
    addProvider: '+ ลงทะเบียนช่าง',
    editListing: 'แก้ไขประกาศ',
    editProvider: 'แก้ไขข้อมูลช่าง',

    fTitle: 'ชื่อสินค้า',
    fTitlePh: 'เช่น โต๊ะไม้สัก, ทุเรียนหมอนทอง',
    fPrice: 'ราคา (บาท)',
    fPricePh: 'ว่าง = สอบถาม, 0 = ฟรี',
    fCategory: 'หมวดหมู่',
    fTrade: 'ประเภทช่าง',
    fDescription: 'รายละเอียด',
    fDescriptionPh: 'สภาพ ขนาด จุดนัดรับ…',
    fProviderDescPh: 'งานที่รับ ประสบการณ์ ช่วงเวลาที่สะดวก…',
    fName: 'ชื่อที่แสดง',
    fNamePh: 'ชื่อร้านหรือชื่อเล่น',
    fPhone: 'เบอร์โทร',
    fLine: 'LINE ID',
    fAddress: 'บ้านเลขที่ / ซอย (ไม่บังคับ)',
    fAddressPh: 'เช่น ซอย 3, บ้านเลขที่ 45/12',
    fPhotos: 'รูปภาพ ({n}/{max})',
    fPhotoRemove: 'ลบรูป',
    photoOf: 'รูปที่ {i} จาก {n}',
    fResidentSeller: 'ผู้ขายอาศัยอยู่ในหมู่บ้าน',
    fResidentProvider: 'ช่างอาศัยอยู่ในหมู่บ้าน',
    fResidentHint: 'ไม่ติ๊ก = คนนอกหมู่บ้าน',
    fContactRequired: 'ใส่เบอร์โทรหรือ LINE ID อย่างน้อยหนึ่งอย่าง',
    save: 'บันทึก',
    saving: 'กำลังบันทึก…',
    cancel: 'ยกเลิก',
    saveFailed: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
    photoFailed: 'อ่านรูปไม่ได้ ลองรูปอื่น',

    priceFree: 'ฟรี',
    priceAsk: 'สอบถามราคา',
    sold: 'ขายแล้ว',
    markSold: 'ทำเครื่องหมายว่าขายแล้ว',
    markAvailable: 'กลับมาขายต่อ',
    call: 'โทร',
    line: 'LINE',
    edit: 'แก้ไข',
    delete: 'ลบ',
    deleteConfirm: 'ลบประกาศนี้? ไม่สามารถย้อนกลับได้',
    postedBy: 'โดย {name}',

    cat_food: 'อาหาร/ผลไม้',
    cat_home: 'ของใช้ในบ้าน',
    cat_clothes: 'เสื้อผ้า',
    cat_electronics: 'เครื่องใช้ไฟฟ้า',
    cat_plants: 'ต้นไม้',
    cat_vehicles: 'ยานพาหนะ',
    cat_other: 'อื่นๆ',

    trade_electrician: 'ช่างไฟ',
    trade_plumber: 'ช่างประปา',
    trade_aircon: 'ช่างแอร์',
    trade_builder: 'ช่างก่อสร้าง/ไม้',
    trade_painter: 'ช่างสี',
    trade_gardener: 'จัดสวน/ตัดหญ้า',
    trade_cleaning: 'ทำความสะอาด',
    trade_mechanic: 'ช่างยนต์',
    trade_other: 'อื่นๆ',
  },
  en: {
    appName: 'Our Village',
    tagline: 'Buy, sell and find a handyman — neighbours helping neighbours',
    navHome: 'Home',
    navMarket: 'Marketplace',
    navServices: 'Handymen',
    backToHome: 'Back to portfolio',

    ownerHint: 'You can edit or delete this post from this device only',

    homeWelcome: 'Welcome to our community',
    homeBlurb: 'Sell things, find things, or find a handyman nearby — every post is clearly marked as a villager or an outsider.',
    homeMarketCard: 'For sale: {n}',
    homeServicesCard: 'Listed: {n}',
    homeLatestMarket: 'Latest for sale',
    homeLatestServices: 'Latest handymen',
    seeAll: 'See all →',

    resident: 'Villager',
    outsider: 'Outsider',
    filterAll: 'All',
    searchPlaceholder: 'Search…',
    allCategories: 'All categories',
    loading: 'Loading…',
    emptyMarket: 'Nothing for sale yet — be the first to post!',
    emptyServices: 'No handymen listed yet — be the first!',
    noMatches: 'Nothing matches these filters',

    addListing: '+ Sell something',
    addProvider: '+ List a handyman',
    editListing: 'Edit listing',
    editProvider: 'Edit handyman',

    fTitle: 'Item',
    fTitlePh: 'e.g. Teak table, Monthong durian',
    fPrice: 'Price (THB)',
    fPricePh: 'Empty = ask, 0 = free',
    fCategory: 'Category',
    fTrade: 'Trade',
    fDescription: 'Details',
    fDescriptionPh: 'Condition, size, pick-up spot…',
    fProviderDescPh: 'Jobs you take, experience, best times to call…',
    fName: 'Display name',
    fNamePh: 'Shop name or nickname',
    fPhone: 'Phone',
    fLine: 'LINE ID',
    fAddress: 'House no. / soi (optional)',
    fAddressPh: 'e.g. Soi 3, house 45/12',
    fPhotos: 'Photos ({n}/{max})',
    fPhotoRemove: 'Remove photo',
    photoOf: 'Photo {i} of {n}',
    fResidentSeller: 'Seller lives in the village',
    fResidentProvider: 'Handyman lives in the village',
    fResidentHint: 'Unchecked = outsider',
    fContactRequired: 'Add a phone number or a LINE ID',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    saveFailed: "Couldn't save — try again",
    photoFailed: "Couldn't read that photo — try another one",

    priceFree: 'Free',
    priceAsk: 'Ask for price',
    sold: 'Sold',
    markSold: 'Mark as sold',
    markAvailable: 'Mark as available',
    call: 'Call',
    line: 'LINE',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: "Delete this post? This can't be undone.",
    postedBy: 'by {name}',

    cat_food: 'Food & fruit',
    cat_home: 'Household',
    cat_clothes: 'Clothes',
    cat_electronics: 'Electronics',
    cat_plants: 'Plants',
    cat_vehicles: 'Vehicles',
    cat_other: 'Other',

    trade_electrician: 'Electrician',
    trade_plumber: 'Plumber',
    trade_aircon: 'Air-con',
    trade_builder: 'Builder / carpenter',
    trade_painter: 'Painter',
    trade_gardener: 'Gardener',
    trade_cleaning: 'Cleaning',
    trade_mechanic: 'Mechanic',
    trade_other: 'Other',
  },
}

export function useLangContext() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLangContext must be used within LangContext.Provider')
  return ctx
}

// Simple {placeholder} interpolation, matching the rest of the monorepo's apps.
export function interp(template, vars) {
  if (typeof template !== 'string') return ''
  return Object.entries(vars || {}).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  )
}
