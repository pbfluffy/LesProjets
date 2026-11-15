// Issuers and well-known card lines, used only to speed up adding a card.
// This is a convenience list, NOT authoritative: banks rename and retire cards
// often, so every step has an "Other" escape hatch and the list can be edited
// here without touching any UI code. It holds no perk data — perks are always
// entered by the user (or started from the generic examples in templates.js).
export const OTHER = '__other__'

export const BANKS = [
  { id: 'kbank', name: 'KBank', cards: ['The Wisdom', 'Platinum', 'Signature', 'World / Infinite', 'Titanium'] },
  { id: 'scb', name: 'SCB', cards: ['Prime', 'Platinum', 'M', 'Thai Airways Royal Orchid Plus'] },
  { id: 'krungsri', name: 'Krungsri', cards: ['Now', 'Platinum', 'Visa Signature', 'First Choice', 'Central The 1'] },
  { id: 'bbl', name: 'Bangkok Bank', cards: ['Be1st', 'Platinum', 'Signature'] },
  { id: 'ktc', name: 'Krungthai (KTC)', cards: ['X', 'Proud', 'Platinum'] },
  { id: 'ttb', name: 'ttb', cards: ['Reserve', 'Absolute', 'So Fast', 'So Smart'] },
  { id: 'uob', name: 'UOB', cards: ['PRVI Miles', "Lady's", 'One', 'Absolute'] },
  { id: 'aeon', name: 'AEON', cards: ['Gold', 'Platinum'] },
  { id: 'amex', name: 'American Express', network: 'Amex', cards: ['Platinum', 'Gold', 'Green'] },
  { id: 'cimb', name: 'CIMB Thai', cards: [] },
  { id: 'scbt', name: 'Standard Chartered', cards: [] },
  { id: 'hsbc', name: 'HSBC', cards: [] },
]

export const bankById = (id) => BANKS.find((b) => b.id === id)
