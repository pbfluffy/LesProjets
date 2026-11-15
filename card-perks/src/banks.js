// Issuers and well-known card lines, used to speed up adding a card.
// This static list is a convenience fallback, NOT authoritative: banks rename and
// retire cards often, so every step has an "Other" escape hatch. For banks the
// scanner covers (see card-perks/scanner), the catalog read from Firestore
// replaces the card list here AND supplies the privileges; for everything else
// privileges are entered by the user (or started from templates.js).
export const OTHER = '__other__'

export const BANKS = [
  { id: 'kbank', name: 'KBank', cards: ['The Wisdom', 'Platinum', 'Signature', 'World / Infinite', 'Titanium'] },
  { id: 'scb', name: 'SCB', cards: ['Prime', 'Platinum', 'M', 'Thai Airways Royal Orchid Plus'] },
  { id: 'krungsri', name: 'Krungsri', cards: ['Now', 'Platinum', 'Visa Signature', 'First Choice', 'Central The 1'] },
  { id: 'bbl', name: 'Bangkok Bank', cards: ['Be1st', 'Platinum', 'Signature'] },
  { id: 'ktc', name: 'Krungthai (KTC)', cards: ['X Visa Signature', 'Visa Signature', 'X World Rewards Mastercard', 'World Rewards Mastercard', 'JCB Ultimate', 'UnionPay Diamond', 'Visa Platinum', 'Platinum Mastercard', 'JCB Platinum', 'UnionPay Platinum', 'Gold Mastercard'] },
  { id: 'ttb', name: 'ttb', cards: ['Reserve', 'Absolute', 'So Fast', 'So Smart'] },
  { id: 'uob', name: 'UOB', cards: ['PRVI Miles', "Lady's", 'One', 'Absolute'] },
  { id: 'aeon', name: 'AEON', cards: ['Gold', 'Platinum'] },
  { id: 'amex', name: 'American Express', network: 'Amex', cards: ['Platinum', 'Gold', 'Green'] },
  { id: 'cimb', name: 'CIMB Thai', cards: [] },
  { id: 'scbt', name: 'Standard Chartered', cards: [] },
  { id: 'hsbc', name: 'HSBC', cards: [] },
]

// `name` is what gets saved on the card; `label` is what the dropdown shows
// (cards closed to new applicants are still held by existing customers).
const catalogCard = (c) => ({
  key: c.id,
  name: c.name,
  label: c.discontinued ? `${c.name} (no longer issued)` : c.name,
  catalogCardId: c.id,
})

// Banks and cards offered in the Add card form: the static list, with any bank
// the scanner has published taking its cards from the catalog instead.
// Each card is { key, name, catalogCardId } — catalogCardId is set only for
// catalog cards (those get privileges filled in automatically).
export function bankOptions(catalog = {}) {
  const fromStatic = BANKS.map((b) => {
    const doc = catalog[b.id]
    const cards = doc?.cards?.length
      ? doc.cards.map(catalogCard)
      : b.cards.map((name) => ({ key: name, name, catalogCardId: null }))
    return { ...b, cards }
  })
  const extra = Object.entries(catalog)
    .filter(([id]) => !BANKS.some((b) => b.id === id))
    .map(([id, doc]) => ({
      id,
      name: doc.bank?.name || id,
      cards: (doc.cards || []).map(catalogCard),
    }))
  return [...fromStatic, ...extra]
}

export const bankById = (id, banks = BANKS) => banks.find((b) => b.id === id)
