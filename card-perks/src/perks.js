// Pure logic for the privilege checker — no React, so it can be unit-tested.

export const DEFAULT_FILTERS = {
  search: '',
  categories: [],      // empty = every category
  points: 'any',       // 'any' | 'free' (no points needed) | 'points' (points needed)
  spend: 'any',        // 'any' | 'none' (no minimum spend)
  cardId: 'all',
  hideExpired: true,
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
      if (f.hideExpired && isExpired(perk, today)) continue
      if (q) {
        const hay = `${perk.title} ${perk.conditions || ''} ${card.name} ${card.nickname || ''}`.toLowerCase()
        if (!q.split(/\s+/).every((w) => hay.includes(w))) continue
      }
      rows.push({ card, perk })
    }
  }
  // Free perks first, then cheaper point cost, then title.
  rows.sort((a, b) =>
    Number(a.perk.requiresPoints) - Number(b.perk.requiresPoints)
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
