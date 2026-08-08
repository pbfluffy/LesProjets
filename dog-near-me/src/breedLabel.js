// The AI's breed guess is stored as raw English text (Gemini's output), not
// a translation key — so it'd show/match untranslated even in the Thai UI.
// "mixed breed" is the overwhelming common case for street dogs, so that
// one value is always localized. Beyond that, the worker's prompt (see
// worker/src/index.js) tends to name breeds from a fairly small recurring
// set for Thailand street/rescue dogs, usually as "<Breed> mix" — this
// dictionary covers that common set so the typical case is fully Thai;
// anything not in the dictionary (rarer or oddly-phrased AI output) just
// falls back to the original English rather than a mangled partial
// translation. Shared by DogDetail's display and searchDogs's matching, so
// searching in Thai finds dogs by the breed term actually shown on screen,
// not just the underlying English value.
const BREED_TH = {
  'thai bangkaew': 'ไทยบางแก้ว',
  'bangkaew': 'บางแก้ว',
  'thai ridgeback': 'ไทยหลังอาน',
  'pembroke welsh corgi': 'เพมโบรกเวลช์คอร์กี้',
  'corgi': 'คอร์กี้',
  'golden retriever': 'โกลเด้น รีทรีฟเวอร์',
  'labrador retriever': 'ลาบราดอร์ รีทรีฟเวอร์',
  'labrador': 'ลาบราดอร์',
  'poodle': 'พุดเดิ้ล',
  'shih tzu': 'ชิห์สุ',
  'pomeranian': 'ปอมเมอเรเนียน',
  'chihuahua': 'ชิวาวา',
  'siberian husky': 'ไซบีเรียน ฮัสกี้',
  'husky': 'ฮัสกี้',
  'shiba inu': 'ชิบะ อินุ',
  'beagle': 'บีเกิ้ล',
  'french bulldog': 'เฟรนช์ บูลด็อก',
  'bulldog': 'บูลด็อก',
  'rottweiler': 'ร็อตไวเลอร์',
  'german shepherd': 'เยอรมันเชพเพิร์ด',
  'dachshund': 'ดัชชุนด์',
  'pug': 'ปั๊ก',
  'schnauzer': 'ชเนาเซอร์',
  'jack russell terrier': 'แจ็คราสเซลล์เทอร์เรีย',
  'great dane': 'เกรทเดน',
}

export function localizedBreed(breedGuess, lang) {
  if (lang !== 'th' || !breedGuess) return breedGuess
  const trimmed = breedGuess.trim()
  if (trimmed.toLowerCase() === 'mixed breed') return 'พันทาง'
  const mixMatch = trimmed.match(/^(.*?)\s+mix$/i)
  const base = (mixMatch ? mixMatch[1] : trimmed).toLowerCase()
  const th = BREED_TH[base]
  if (!th) return breedGuess
  return mixMatch ? `${th}ผสม` : th
}
