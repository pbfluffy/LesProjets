// Pumgoda — paw tier rubric
// Computes 1–4 paw tier from venue policy attributes. Tier 5 is reserved for Pumba's personal favorites (pumba.favorite === true).
// Sum the points, map total to a tier. All knobs (weights + thresholds) live here.

export const RUBRIC = {
  indoor_allowed: 2,
  no_size_limit: 2,
  water_bowl: 1,
  no_fee: 1,
  pet_menu: 2,
  off_leash_zone: 2,
  pet_bed_toys: 1,
  pet_pool_play_grooming: 2,
  overnight: 3,
  staff_welcoming: 1,
}

// Ordered high → low so .find() returns the highest tier the score qualifies for.
// Calibration note (2026-05): if a venue with overnight + pool + pet beds (score 10)
// still feels like paradise tier in practice, lower the top `min` to 10.
export const TIERS = [
  { min: 11, paws: 4, key: 'paradise',  en: 'Pet paradise', th: 'สวรรค์สัตว์เลี้ยง' },
  { min:  7, paws: 3, key: 'welcoming', en: 'Pet-welcoming', th: 'ยินดีต้อนรับ' },
  { min:  4, paws: 2, key: 'friendly',  en: 'Pet-friendly', th: 'เป็นมิตรกับสัตว์เลี้ยง' },
  { min:  0, paws: 1, key: 'allowed',   en: 'Pets allowed',  th: 'อนุญาตสัตว์เลี้ยง' },
]

// Tier 5 — reserved for Pumba's hand-picked favorites. Bypasses the rubric entirely.
export const FAVORITE_TIER = { paws: 5, key: 'favorite', en: "Pumba's favorite", th: 'ที่โปรดของพุมบ้า' }

// Sheet stores booleans as the strings "TRUE"/"FALSE". Coerce safely.
export const isTrue = (v) => v === true || v === 'TRUE' || v === 'true' || v === 1

export function scoreVenue(venue) {
  let total = 0
  for (const [field, weight] of Object.entries(RUBRIC)) {
    if (isTrue(venue[field])) total += weight
  }
  return total
}

export function computeTier(venue) {
  const score = scoreVenue(venue)
  // Pumba's favorite overrides the algorithmic tier entirely.
  if (isTrue(venue.pumba?.favorite)) return { score, ...FAVORITE_TIER }
  const tier = TIERS.find((t) => score >= t.min)
  return { score, ...tier }
}

// "🐾🐾🐾 Welcoming" — convenience for badge rendering
export function tierLabel(venue, lang = 'en') {
  const { paws, en, th } = computeTier(venue)
  return '🐾'.repeat(paws) + ' ' + (lang === 'th' ? th : en)
}
