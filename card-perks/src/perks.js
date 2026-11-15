// Pure logic for the privilege checker — no React, so it can be unit-tested.

export const DEFAULT_FILTERS = {
  search: '',
  categories: [],      // empty = every category
  points: 'any',       // 'any' | 'free' (no points needed) | 'points' (points needed)
  spend: 'any',        // 'any' | 'none' (no minimum spend)
  cardId: 'all',
  kind: 'any',         // 'any' | 'privilege' (the card's own privileges) | 'promo' (restaurant promotions)
  hideExpired: true,
}

// "KBank The Wisdom" — bank is optional because cards saved before the bank
// picker existed only have a name.
export function cardFullName(card) {
  return [card.bank, card.name].filter(Boolean).join(' ')
}

// What to call a card in lists: the user's nickname if they gave one.
export function cardLabel(card) {
  return card.nickname || cardFullName(card)
}

// Privileges the scanner collected for a card the user picked from the catalog.
// A card stores only a reference ({ bank, card }), never a copy, so when the
// bank changes its page and the scanner republishes, every user sees it.
// Ids are prefixed so they can never collide with the user's own privileges.
export function autoPerksFor(card, catalog) {
  const ref = card.catalogRef
  if (!ref) return []
  const doc = catalog?.[ref.bank]
  const found = doc?.cards?.find((c) => c.id === ref.card)
  if (!found) return []
  return (found.perks || []).map((p) => ({
    id: 'auto:' + p.id,
    title: p.title,
    category: p.category || 'other',
    requiresPoints: !!p.requiresPoints,
    pointsCost: null,
    minSpend: null,
    conditions: p.conditions || '',
    validUntil: null,
    auto: true,
    sourceUrl: found.url || null,
    checkedAt: doc.scannedAt || null,
  }))
}

// 'visa' | 'mastercard' | 'jcb' | 'unionpay' | null, from the card's name or network.
export function cardBrand(card) {
  const s = `${card.name || ''} ${card.network || ''}`
  if (/visa/i.test(s)) return 'visa'
  if (/master\s?card/i.test(s)) return 'mastercard'
  if (/jcb/i.test(s)) return 'jcb'
  if (/union\s?pay/i.test(s)) return 'unionpay'
  return null
}

const PROMO_ORIGIN = { ktc: 'https://www.ktc.co.th' }

// Restaurant promotions the scanner collected for a card's bank, limited to the
// ones its brand is eligible for (a "KTC MASTERCARD" promotion is not for a Visa).
// promoData = { [bankId]: { promos: [...], scannedAt } }
export function promosFor(card, promoData) {
  const bank = card.catalogRef?.bank
  const set = bank && promoData?.[bank]
  if (!set) return []
  const brand = cardBrand(card)
  return set.promos
    .filter((p) => !p.brands?.length || (brand && p.brands.includes(brand)))
    .map((p) => ({
      id: 'promo:' + p.id,
      title: p.title,
      category: 'dining',
      requiresPoints: !!p.requiresPoints,
      pointsCost: null,
      minSpend: p.minSpend || null,
      conditions: p.summary || '',
      validUntil: p.end || null,
      auto: true,
      promo: true,
      group: p.group,
      brands: p.brands || [],
      sourceUrl: (PROMO_ORIGIN[bank] || '') + p.path,
      checkedAt: set.scannedAt || null,
    }))
}

// Cards with catalog privileges and promotions merged in front of the user's own.
export function resolveCards(cards, catalog, promoData) {
  return cards.map((card) => {
    const extra = [...autoPerksFor(card, catalog), ...promosFor(card, promoData)]
    return extra.length ? { ...card, perks: [...extra, ...(card.perks || [])] } : card
  })
}

export function isExpired(perk, today = new Date()) {
  if (!perk.validUntil) return false
  const end = new Date(perk.validUntil + 'T23:59:59')
  return end < today
}

// Flatten every card's perks into rows carrying their card, then filter.
export function filterPerks(cards, filters, today = new Date()) {
  const f = { ...DEFAULT_FILTERS, ...filters }
  const q = f.search.trim().toLowerCase()
  const rows = []
  for (const card of cards) {
    if (f.cardId !== 'all' && card.id !== f.cardId) continue
    for (const perk of card.perks || []) {
      if (f.categories.length && !f.categories.includes(perk.category)) continue
      if (f.points === 'free' && perk.requiresPoints) continue
      if (f.points === 'points' && !perk.requiresPoints) continue
      if (f.spend === 'none' && perk.minSpend) continue
      if (f.kind === 'privilege' && perk.promo) continue
      if (f.kind === 'promo' && !perk.promo) continue
      if (f.hideExpired && isExpired(perk, today)) continue
      if (q) {
        const hay = `${perk.title} ${perk.conditions || ''} ${cardFullName(card)} ${card.nickname || ''}`.toLowerCase()
        if (!q.split(/\s+/).every((w) => hay.includes(w))) continue
      }
      rows.push({ card, perk })
    }
  }
  // The card's own privileges before the (many) promotions, then free before
  // points, then cheaper point cost, then title.
  rows.sort((a, b) =>
    Number(!!a.perk.promo) - Number(!!b.perk.promo)
    || Number(a.perk.requiresPoints) - Number(b.perk.requiresPoints)
    || (a.perk.pointsCost || 0) - (b.perk.pointsCost || 0)
    || a.perk.title.localeCompare(b.perk.title))
  return rows
}

export function newId() {
  return (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 36)
}

// Normalises user input into a stored perk. Returns null if it has no title.
export function cleanPerk(raw) {
  const title = String(raw.title || '').trim().slice(0, 120)
  if (!title) return null
  const requiresPoints = !!raw.requiresPoints
  const num = (v) => {
    const n = Number(v)
    return v !== '' && v != null && Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }
  return {
    id: raw.id || newId(),
    title,
    category: raw.category || 'other',
    requiresPoints,
    pointsCost: requiresPoints ? num(raw.pointsCost) : null,
    minSpend: num(raw.minSpend),
    conditions: String(raw.conditions || '').trim().slice(0, 300),
    validUntil: /^\d{4}-\d{2}-\d{2}$/.test(raw.validUntil || '') ? raw.validUntil : null,
  }
}
