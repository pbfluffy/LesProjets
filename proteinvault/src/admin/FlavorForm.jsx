import { useState } from 'react'
import { makeFlavorId } from './adminProducts.js'
import { shops } from '../data/shops.js'
import ShopeeImportPanel from './ShopeeImportPanel.jsx'

const NUMERIC_OPTIONAL = ['calories', 'carbsG', 'fatG', 'sugarG']

function emptyFlavor() {
  return {
    id: '',
    name: '',
    priceThb: '',
    proteinG: '',
    calories: '',
    carbsG: '',
    fatG: '',
    sugarG: '',
    imageUrl: '',
    shops: [],
  }
}

// Editing here is local to the parent's in-memory draft — nothing hits
// Firestore until the brand-level "Save brand" in BrandForm.jsx, since
// flavors live as an array embedded on the product doc. `lastVerifiedAt`
// is still stamped at this save step (not the later Firestore write) so
// it reflects when the flavor was actually looked at and confirmed.
export default function FlavorForm({ flavor, existingFlavors, onSave, onClose }) {
  const isNew = !flavor
  const [draft, setDraft] = useState(() => (flavor ? { ...flavor } : emptyFlavor()))
  const [selectedShops, setSelectedShops] = useState(
    () => new Set((flavor?.shops || []).map((s) => s.shopId)),
  )
  const [shopUrls, setShopUrls] = useState(() => {
    const map = {}
    ;(flavor?.shops || []).forEach((s) => {
      if (s.url) map[s.shopId] = s.url
    })
    return map
  })
  const [error, setError] = useState('')
  const [importNote, setImportNote] = useState('')

  function updateField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function toggleShop(shopId) {
    setSelectedShops((s) => {
      const next = new Set(s)
      if (next.has(shopId)) next.delete(shopId)
      else next.add(shopId)
      return next
    })
  }

  function handleImport(result) {
    setDraft((d) => ({
      ...d,
      name: d.name || result.name || d.name,
      priceThb: d.priceThb || (result.priceThb ?? d.priceThb),
      imageUrl: d.imageUrl || result.images?.[0] || d.imageUrl,
    }))
    setImportNote(result.attributesText || '')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const name = draft.name.trim()
    if (!name) return setError('Name is required.')
    const priceThb = Number(draft.priceThb)
    const proteinG = Number(draft.proteinG)
    if (!priceThb || priceThb <= 0) return setError('Price must be greater than 0.')
    if (!proteinG || proteinG <= 0) return setError('Protein grams must be greater than 0.')
    if (selectedShops.size === 0) return setError('Pick at least one shop.')

    const id = isNew ? makeFlavorId(name, existingFlavors) : draft.id
    const flavorOut = {
      id,
      name,
      priceThb,
      proteinG,
      shops: [...selectedShops].map((shopId) => {
        const url = shopUrls[shopId]?.trim()
        return url ? { shopId, url } : { shopId }
      }),
      lastVerifiedAt: Date.now(),
    }
    NUMERIC_OPTIONAL.forEach((key) => {
      const raw = draft[key]
      if (raw !== '' && raw != null) flavorOut[key] = Number(raw)
    })
    if (draft.imageUrl?.trim()) flavorOut.imageUrl = draft.imageUrl.trim()

    onSave(flavorOut)
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2>{isNew ? 'New flavor' : `Edit: ${flavor.name}`}</h2>
        <button type="button" className="btn" onClick={onClose}>
          Back
        </button>
      </div>

      <ShopeeImportPanel onImport={handleImport} />
      {importNote && (
        <div className="admin-import-note mono">
          <div className="admin-import-note-title">
            Shopee listing details (reference only — fill in the fields below):
          </div>
          <pre className="admin-import-note-body">{importNote}</pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <label className="field">
          <span className="label">Name</span>
          <input
            className="input"
            value={draft.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
        </label>
        <div className="admin-field-row">
          <label className="field">
            <span className="label">Price (฿)</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={draft.priceThb}
              onChange={(e) => updateField('priceThb', e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="label">Protein (g)</span>
            <input
              className="input"
              type="number"
              step="0.1"
              value={draft.proteinG}
              onChange={(e) => updateField('proteinG', e.target.value)}
              required
            />
          </label>
        </div>
        <div className="admin-field-row">
          <label className="field">
            <span className="label">Calories (kcal)</span>
            <input
              className="input"
              type="number"
              step="1"
              value={draft.calories}
              onChange={(e) => updateField('calories', e.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="field">
            <span className="label">Carbs (g)</span>
            <input
              className="input"
              type="number"
              step="0.1"
              value={draft.carbsG}
              onChange={(e) => updateField('carbsG', e.target.value)}
              placeholder="optional"
            />
          </label>
        </div>
        <div className="admin-field-row">
          <label className="field">
            <span className="label">Fat (g)</span>
            <input
              className="input"
              type="number"
              step="0.1"
              value={draft.fatG}
              onChange={(e) => updateField('fatG', e.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="field">
            <span className="label">Sugar (g)</span>
            <input
              className="input"
              type="number"
              step="0.1"
              value={draft.sugarG}
              onChange={(e) => updateField('sugarG', e.target.value)}
              placeholder="optional"
            />
          </label>
        </div>
        <label className="field">
          <span className="label">Image URL</span>
          <input
            className="input"
            value={draft.imageUrl}
            onChange={(e) => updateField('imageUrl', e.target.value)}
            placeholder="optional — self-hosted under public/products/"
          />
        </label>

        <div className="field">
          <span className="label">Shops</span>
          <div className="admin-shop-picker">
            {shops.map((shop) => (
              <div key={shop.id} className="admin-shop-picker-row">
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedShops.has(shop.id)}
                    onChange={() => toggleShop(shop.id)}
                  />
                  {shop.name}
                </label>
                {selectedShops.has(shop.id) && (
                  <input
                    className="input"
                    placeholder="specific listing URL (optional)"
                    value={shopUrls[shop.id] || ''}
                    onChange={(e) => setShopUrls((m) => ({ ...m, [shop.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="admin-error">{error}</div>}
        <button type="submit" className="btn btn-primary">
          Save flavor
        </button>
      </form>
    </div>
  )
}
