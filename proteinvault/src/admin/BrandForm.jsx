import { useState } from 'react'
import { slugify } from './adminProducts.js'
import FlavorForm from './FlavorForm.jsx'

const EMPTY_PRODUCT = { id: '', brand: '', country: '', countryCode: '', tags: [], flavors: [] }

// Product-level fields plus the flavor list for this brand. Flavor
// add/edit/remove only mutates local `draft` state (see FlavorForm.jsx) —
// the actual Firestore write is a single read-modify-write of the whole
// product doc, triggered by "Save brand" here.
export default function BrandForm({ product, existingIds, onSave, onClose }) {
  const isNew = !product
  const [draft, setDraft] = useState(() =>
    product ? { ...product, flavors: [...product.flavors] } : { ...EMPTY_PRODUCT },
  )
  const [editingFlavorId, setEditingFlavorId] = useState(null) // null | 'new' | flavor id
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function handleBrandNameChange(value) {
    setDraft((d) => {
      const next = { ...d, brand: value }
      if (isNew) next.id = slugify(value)
      return next
    })
  }

  async function handleSaveBrand(e) {
    e.preventDefault()
    setError('')
    if (isNew && existingIds.includes(draft.id)) {
      setError(`A product with id "${draft.id}" already exists — pick a different brand name.`)
      return
    }
    setSaving(true)
    try {
      await onSave(draft)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleSaveFlavor(flavor) {
    setDraft((d) => {
      const idx = d.flavors.findIndex((f) => f.id === flavor.id)
      const flavors =
        idx === -1 ? [...d.flavors, flavor] : d.flavors.map((f, i) => (i === idx ? flavor : f))
      return { ...d, flavors }
    })
    setEditingFlavorId(null)
  }

  function handleRemoveFlavor(flavorId) {
    if (!window.confirm('Remove this flavor?')) return
    setDraft((d) => ({ ...d, flavors: d.flavors.filter((f) => f.id !== flavorId) }))
  }

  if (editingFlavorId) {
    const editingFlavor =
      editingFlavorId === 'new' ? null : draft.flavors.find((f) => f.id === editingFlavorId)
    return (
      <FlavorForm
        flavor={editingFlavor}
        existingFlavors={draft.flavors}
        onSave={handleSaveFlavor}
        onClose={() => setEditingFlavorId(null)}
      />
    )
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2>{isNew ? 'New brand' : draft.brand}</h2>
        <button type="button" className="btn" onClick={onClose}>
          Back
        </button>
      </div>

      <form onSubmit={handleSaveBrand} className="admin-form">
        <label className="field">
          <span className="label">Brand name</span>
          <input
            className="input"
            value={draft.brand}
            onChange={(e) => handleBrandNameChange(e.target.value)}
            required
          />
        </label>
        {isNew && <div className="admin-hint mono">id: {draft.id || '—'}</div>}
        <label className="field">
          <span className="label">Country</span>
          <input
            className="input"
            value={draft.country}
            onChange={(e) => updateField('country', e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="label">Country code (ISO 3166-1 alpha-2)</span>
          <input
            className="input"
            value={draft.countryCode}
            onChange={(e) => updateField('countryCode', e.target.value.toUpperCase())}
            maxLength={2}
            required
          />
        </label>
        <label className="field">
          <span className="label">Tags (comma-separated)</span>
          <input
            className="input"
            value={draft.tags.join(', ')}
            onChange={(e) =>
              updateField(
                'tags',
                e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
              )
            }
          />
        </label>

        <div className="admin-flavor-section">
          <div className="admin-card-header">
            <h3>Flavors</h3>
            <button type="button" className="btn" onClick={() => setEditingFlavorId('new')}>
              + Add flavor
            </button>
          </div>
          {draft.flavors.length === 0 ? (
            <div className="empty-state">No flavors yet.</div>
          ) : (
            <ul className="admin-flavor-list">
              {draft.flavors.map((f) => (
                <li key={f.id} className="admin-flavor-row">
                  <div>
                    <div className="admin-flavor-row-name">{f.name}</div>
                    <div className="admin-flavor-row-meta mono">
                      ฿{f.priceThb} · {f.proteinG}g protein
                    </div>
                  </div>
                  <div className="admin-flavor-row-actions">
                    <button type="button" className="btn" onClick={() => setEditingFlavorId(f.id)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleRemoveFlavor(f.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <div className="admin-error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save brand'}
        </button>
      </form>
    </div>
  )
}
