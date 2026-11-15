// Turns a scraped privilege (title + description text) into the app's
// structured fields. Deliberately simple keyword rules: the full official text
// is always kept as the privilege's "conditions", so a wrong category never
// hides what the bank actually said — it only affects which filter chip shows it.
//
// Category ids must match card-perks/src/categories.js.
const RULES = [
  ['other', /\b(annual fee|entrance fee|fee waiver)\b/i], // fee info, not a spending perk
  ['lounge', /\blounge\b/i],
  ['insurance', /\b(insurance|insured|coverage)\b/i],
  ['dining', /\b(dining|restaurant|cafe|café|food|meal|buffet)\b/i],
  ['travel', /\b(travel|flight|air ?ticket|airline|hotel|resort|visa application|schengen|airport)\b/i],
  ['fuel', /\b(fuel|petrol|gas station|ev charging|taxi|ride)\b/i],
  ['entertainment', /\b(movie|cinema|concert|show|streaming)\b/i],
  ['wellness', /\b(golf|spa|massage|health|hospital|wellness|fitness)\b/i],
  ['cashback', /\b(cash ?back|rebate|reward points?|points?|forever)\b/i],
  ['shopping', /\b(shop|shopping|online|store|mall|merchant)\b/i],
]

export function classifyCategory(title, text = '') {
  // Title first: "Travel Insurance" is insurance-or-travel by its heading, and
  // description words ("hotel dining") shouldn't outvote it.
  for (const [cat, re] of RULES) if (re.test(title)) return cat
  for (const [cat, re] of RULES) if (re.test(text)) return cat
  return 'other'
}

// "Requires points" means using the privilege costs points. A card that merely
// *earns* points (or says points can be redeemed somewhere) does not qualify,
// so require a redeem/exchange/use verb tied to points AND no "earn" wording.
export function requiresPoints(title, text = '') {
  const all = `${title}. ${text}`
  if (/\bearn(s|ed|ing)?\b/i.test(all)) return false
  return /\b(redeem(ed|able)?|exchange[sd]?|use|using|spend)\b[^.]{0,60}\bpoints?\b/i.test(all)
}

// First sentences of the description, capped, as human-readable conditions.
export function summarize(text, max = 300) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '))
  return (lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, '') + '…').trim()
}

export function slug(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}
