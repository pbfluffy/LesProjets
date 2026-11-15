import test from 'node:test'
import assert from 'node:assert/strict'
import { bankOptions } from './banks.js'

test('without a catalog every bank offers its static card list', () => {
  const ktc = bankOptions({}).find((b) => b.id === 'ktc')
  assert.ok(ktc.cards.length > 0)
  assert.ok(ktc.cards.every((c) => c.catalogCardId === null))
})

test('a catalog bank replaces the static cards and marks them as catalog cards', () => {
  const catalog = { ktc: { bank: { name: 'Krungthai (KTC)' }, cards: [{ id: 'ktc-visa-platinum', name: 'Visa Platinum' }] } }
  const ktc = bankOptions(catalog).find((b) => b.id === 'ktc')
  assert.deepEqual(ktc.cards, [{ key: 'ktc-visa-platinum', name: 'Visa Platinum', label: 'Visa Platinum', catalogCardId: 'ktc-visa-platinum' }])
})

test('discontinued catalog cards stay selectable but are labelled', () => {
  const catalog = { ktc: { bank: { name: 'Krungthai (KTC)' }, cards: [{ id: 'ktc-visa-gold', name: 'Visa Gold', discontinued: true }] } }
  const [c] = bankOptions(catalog).find((b) => b.id === 'ktc').cards
  assert.equal(c.name, 'Visa Gold') // saved name has no suffix
  assert.equal(c.label, 'Visa Gold (no longer issued)')
})

test('a catalog-only bank is appended', () => {
  const catalog = { newbank: { bank: { name: 'New Bank' }, cards: [{ id: 'a', name: 'A' }] } }
  const last = bankOptions(catalog).at(-1)
  assert.equal(last.id, 'newbank')
  assert.equal(last.name, 'New Bank')
})
