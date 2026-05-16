// Pumgoda — bilingual strings. Mirrors the S.th/S.en pattern in the portfolio index.html.
//
// Keys grouped by surface area:
//   - brand / hero / footer
//   - filters (region groups, venue types, policy chips)
//   - tabs (List/Map/Trips/Saved)
//   - place card / detail labels
//   - states (loading, empty, error)
//   - tier labels (also in computeTier.js for component-free use)

export const STRINGS = {
  th: {
    brand: 'Pumgoda',
    tagline: 'พาน้องไปไหนได้บ้าง?',
    subtitle: 'หาคาเฟ่ ร้านอาหาร โรงแรม ที่พาน้องไปได้ทั่วไทย',
    dogBadge: '🐾 corgi-approved',
    heroPhoto: {
      add: 'เพิ่มรูปน้องของคุณ',
      change: 'เปลี่ยนรูปน้อง',
      remove: 'ลบรูป',
    },
    footer: 'pumbafluffycorgi.com',

    header: {
      share: 'แชร์',
      refresh: 'รีเฟรช',
      linkCopied: 'คัดลอกลิงก์แล้ว',
      shareTitle: 'Pumgoda',
      shareText: 'Pumgoda — สถานที่ที่พาน้องไปได้ในประเทศไทย',
    },

    tabs: {
      list: 'รายการ',
      map: 'แผนที่',
      trips: 'แผนเที่ยว',
      saved: 'บันทึกไว้',
    },

    regions: {
      label: 'ภูมิภาค',
      all: 'ทั้งหมด',
      bangkok_metro: 'กรุงเทพและปริมณฑล',
      weekend_escape: 'ต่างจังหวัด',
    },

    types: {
      label: 'ประเภท',
      cafe: 'คาเฟ่',
      restaurant: 'ร้านอาหาร',
      hotel: 'ที่พัก',
      park: 'สวนสาธารณะ',
      mall: 'ห้างฯ',
      beach: 'ชายหาด',
      vet: 'สัตวแพทย์',
      pet_shop: 'ร้านสัตว์เลี้ยง',
      grooming: 'อาบน้ำตัดขน',
    },

    policy: {
      label: 'นโยบาย',
      indoor_allowed: 'เข้าในร้านได้',
      no_size_limit: 'ไม่จำกัดขนาด',
      water_bowl: 'มีชามน้ำ',
      pet_menu: 'มีเมนูสัตว์เลี้ยง',
      off_leash_zone: 'ปล่อยได้',
      no_fee: 'ฟรี',
      overnight: 'ค้างคืนได้',
      no_stroller_needed: 'ไม่ต้องใช้รถเข็น',
      stroller_required: 'ต้องใช้รถเข็น/กระเป๋าใส่สัตว์',
    },

    card: {
      pumbaBadge: 'พุมบ้าเคยมา',
      petsAllowed: 'พาน้องได้',
      petsLimit: 'ต่ำกว่า {kg} กก.',
      fee: 'ค่าธรรมเนียม {baht}฿',
      lastVerified: 'ตรวจสอบล่าสุด {date}',
    },

    detail: {
      back: '← กลับ',
      openInMaps: 'เปิดใน Google Maps',
      save: 'บันทึก',
      unsave: 'เลิกบันทึก',
      callPhone: 'โทร',
      visitWebsite: 'เว็บไซต์',
      sections: {
        policy: 'นโยบายสัตว์เลี้ยง',
        hours: 'เวลาเปิด-ปิด',
        contact: 'ติดต่อ',
        notes: 'หมายเหตุ',
        verification: 'การตรวจสอบ',
      },
    },

    states: {
      loading: 'กำลังโหลด…',
      empty: 'ไม่พบสถานที่ที่ตรงกับตัวกรอง',
      emptySaved: 'ยังไม่มีรายการบันทึกไว้',
      networkError: 'เชื่อมต่อไม่ได้ — กำลังแสดงข้อมูลที่บันทึกไว้',
      comingSoon: 'เร็วๆ นี้ — รอเวอร์ชัน 2',
    },

    sortBy: {
      label: 'จัดเรียง',
      newest: 'ใหม่ล่าสุด',
      paws: 'ระดับสูงสุด',
      nearby: 'ใกล้ที่สุด',
    },

    trip: {
      createTitle: 'สร้างแผนเที่ยว',
      namePlaceholder: 'ชื่อแผน เช่น ตะลุยคาเฟ่ทองหล่อ',
      create: '+ สร้างแผน',
      empty: 'ยังไม่มีแผนเที่ยว',
      emptySub: 'ร้อยสถานที่พาน้องได้ 3–5 แห่ง ให้เป็นทริปหนึ่งวัน',
      back: '← แผนเที่ยว',
      rename: 'ชื่อแผน',
      emptyStops: 'ยังไม่มีสถานที่ — เพิ่มสักสองสามแห่ง',
      unavailable: '(ไม่พบสถานที่นี้แล้ว)',
      moveUp: 'เลื่อนขึ้น',
      moveDown: 'เลื่อนลง',
      remove: 'นำออก',
      addStop: '+ เพิ่มสถานที่',
      full: 'หนึ่งแผนเพิ่มได้สูงสุด {n} จุด',
      hint: 'แนะนำ 3–5 จุดต่อหนึ่งวัน',
      share: 'แชร์ไป Line ↗',
      shareTitle: 'แผนเที่ยว Pumgoda',
      shareFooter: 'วางแผนด้วย Pumgoda',
      copied: 'คัดลอกแผนแล้ว ✓',
      delete: 'ลบแผนนี้',
      deleteConfirm: 'ลบแผนเที่ยวนี้หรือไม่?',
      pickerTitle: 'เพิ่มสถานที่',
      pickerSearch: 'ค้นหาสถานที่…',
      pickerEmpty: 'ไม่พบสถานที่ที่ค้นหา',
      pickerAllAdded: 'ทุกสถานที่อยู่ในแผนนี้แล้ว',
      add: 'เพิ่ม',
      done: 'เสร็จ',
      addToTrip: 'เพิ่มลงแผนเที่ยว',
    },
  },

  en: {
    brand: 'Pumgoda',
    tagline: 'Where can my fur baby go?',
    subtitle: 'Pet-friendly cafés, restaurants, and hotels across Thailand',
    dogBadge: '🐾 corgi-approved',
    heroPhoto: {
      add: "Add your pet's photo",
      change: 'Change pet photo',
      remove: 'Remove photo',
    },
    footer: 'pumbafluffycorgi.com',

    header: {
      share: 'Share',
      refresh: 'Refresh',
      linkCopied: 'Link copied',
      shareTitle: 'Pumgoda',
      shareText: 'Pumgoda — Find pet-friendly places across Thailand',
    },

    tabs: {
      list: 'List',
      map: 'Map',
      trips: 'Trips',
      saved: 'Saved',
    },

    regions: {
      label: 'Region',
      all: 'All',
      bangkok_metro: 'Bangkok metro',
      weekend_escape: 'Weekend escape',
    },

    types: {
      label: 'Type',
      cafe: 'Café',
      restaurant: 'Restaurant',
      hotel: 'Hotel',
      park: 'Park',
      mall: 'Mall',
      beach: 'Beach',
      vet: 'Vet',
      pet_shop: 'Pet shop',
      grooming: 'Grooming',
    },

    policy: {
      label: 'Policy',
      indoor_allowed: 'Indoor OK',
      no_size_limit: 'Any size',
      water_bowl: 'Water bowl',
      pet_menu: 'Pet menu',
      off_leash_zone: 'Off-leash',
      no_fee: 'Free',
      overnight: 'Overnight',
      no_stroller_needed: 'No stroller needed',
      stroller_required: 'Stroller/carrier required',
    },

    card: {
      pumbaBadge: 'Pumba was here',
      petsAllowed: 'Pets OK',
      petsLimit: 'Under {kg} kg',
      fee: 'Fee {baht}฿',
      lastVerified: 'Verified {date}',
    },

    detail: {
      back: '← Back',
      openInMaps: 'Open in Google Maps',
      save: 'Save',
      unsave: 'Saved',
      callPhone: 'Call',
      visitWebsite: 'Website',
      sections: {
        policy: 'Pet policy',
        hours: 'Hours',
        contact: 'Contact',
        notes: 'Notes',
        verification: 'Verification',
      },
    },

    states: {
      loading: 'Loading…',
      empty: 'No places match your filters',
      emptySaved: 'No saved places yet',
      networkError: 'Offline — showing cached data',
      comingSoon: 'Coming soon — v2',
    },

    sortBy: {
      label: 'Sort',
      newest: 'Newest',
      paws: 'Highest paws',
      nearby: 'Nearest',
    },

    trip: {
      createTitle: 'New trip',
      namePlaceholder: 'Trip name e.g. Thonglor café crawl',
      create: '+ Create trip',
      empty: 'No trips yet',
      emptySub: 'Chain 3–5 pet-friendly stops into a day out',
      back: '← Trips',
      rename: 'Trip name',
      emptyStops: 'No stops yet — add a few places',
      unavailable: '(place no longer available)',
      moveUp: 'Move up',
      moveDown: 'Move down',
      remove: 'Remove',
      addStop: '+ Add stop',
      full: 'A trip can hold up to {n} stops',
      hint: '3–5 stops makes a good day out',
      share: 'Share to Line ↗',
      shareTitle: 'Pumgoda trip',
      shareFooter: 'planned with Pumgoda',
      copied: 'Trip copied ✓',
      delete: 'Delete trip',
      deleteConfirm: 'Delete this trip?',
      pickerTitle: 'Add a stop',
      pickerSearch: 'Search places…',
      pickerEmpty: 'No places found',
      pickerAllAdded: 'Every place is already in this trip',
      add: 'Add',
      done: 'Done',
      addToTrip: 'Add to trip',
    },
  },
}

// Tiny helper to interpolate {placeholders}
export function interp(str, vars = {}) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
}
