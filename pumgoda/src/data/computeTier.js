// Pumgoda — paw tier ladder
// A venue earns 1–4 paws from a strict ladder of three universal yes/no
// questions. The heart (♥) is separate: it marks Pumba's hand-picked
// favorites and never changes the paw count.
//
//   🐾        stroller required
//   🐾🐾       no stroller — outdoor seating only
//   🐾🐾🐾      no stroller, indoor seating OK — no pet food
//   🐾🐾🐾🐾     all of the above + a dedicated pet menu
//
// Driven entirely by three sheet columns: stroller_required,
// indoor_allowed, pet_menu. No weights, no thresholds.

// Sheet stores booleans as the strings "TRUE"/"FALSE". Coerce safely.
export const isTrue = (v) =>
  v === true || String(v).trim().toUpperCase() === 'TRUE'

// The four rungs, low → high. `paws` is the rung number; `en`/`th` are the
// short badge labels; `enDesc`/`thDesc` are the help-modal explanations.
export const TIERS = [
  {
    paws: 1,
    key: 'stroller',
    en: 'Stroller required',
    th: 'ต้องใช้รถเข็น',
    enDesc: 'The dog must stay in a stroller while at the venue',
    thDesc: 'สัตว์เลี้ยงต้องอยู่ในรถเข็นตลอดเวลาที่อยู่ในร้าน',
  },
  {
    paws: 2,
    key: 'outdoor',
    en: 'Outdoor only',
    th: 'นั่งนอกร้านเท่านั้น',
    enDesc: 'No stroller needed, but seating is outdoor only',
    thDesc: 'ไม่ต้องใช้รถเข็น แต่นั่งได้เฉพาะนอกร้าน',
  },
  {
    paws: 3,
    key: 'indoor',
    en: 'Indoor welcome',
    th: 'เข้าในร้านได้',
    enDesc: 'No stroller needed and indoor seating is allowed',
    thDesc: 'ไม่ต้องใช้รถเข็น และเข้าไปนั่งในร้านได้',
  },
  {
    paws: 4,
    key: 'menu',
    en: 'Indoor + pet menu',
    th: 'เข้าในร้านได้ + มีเมนูสัตว์เลี้ยง',
    enDesc: 'Indoor seating plus a dedicated menu for pets',
    thDesc: 'เข้าไปนั่งในร้านได้ และมีเมนูสำหรับสัตว์เลี้ยงโดยเฉพาะ',
  },
]

// The heart — Pumba's hand-picked favorites. Rendered alongside the paws,
// never instead of them.
export const FAVORITE_TIER = {
  key: 'favorite',
  en: "Pumba's favorite",
  th: 'ที่โปรดของพุมบ้า',
  enDesc: 'Hand-picked by Pumba — a personal top spot',
  thDesc: 'พุมบ้าเลือกเอง — ที่โปรดส่วนตัวของเขา',
}

// Strict ladder: stroller is the gate, then indoor access, then a pet menu.
function pawCount(venue) {
  if (isTrue(venue.stroller_required)) return 1
  if (!isTrue(venue.indoor_allowed)) return 2
  if (!isTrue(venue.pet_menu)) return 3
  return 4
}

// Returns { paws, key, en, th, enDesc, thDesc, heart }.
// `heart` is true for Pumba's favorites and is independent of the paw count.
export function computeTier(venue) {
  const paws = pawCount(venue)
  const tier = TIERS.find((t) => t.paws === paws)
  return { ...tier, heart: isTrue(venue.pumba?.favorite) }
}

// "🐾🐾🐾 Indoor welcome" — convenience for plain-text rendering.
export function tierLabel(venue, lang = 'en') {
  const { paws, en, th } = computeTier(venue)
  return '🐾'.repeat(paws) + ' ' + (lang === 'th' ? th : en)
}
