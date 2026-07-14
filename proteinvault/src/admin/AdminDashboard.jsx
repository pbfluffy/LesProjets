import { useState } from 'react'
import { useAdminProducts } from './useAdminProducts.js'
import { staleFlavors } from './adminProducts.js'
import BrandList from './BrandList.jsx'
import BrandForm from './BrandForm.jsx'
import { signOutAdmin } from './useAuth.js'

export default function AdminDashboard({ userEmail }) {
  const { products, loading, error, saveProduct } = useAdminProducts()
  const [selectedId, setSelectedId] = useState(null) // null = list view, 'new' = new brand, else product id

  const stale = staleFlavors(products)
  const selectedProduct =
    selectedId && selectedId !== 'new' ? products.find((p) => p.id === selectedId) : null

  return (
    <div className="shell admin-shell">
      <header className="admin-topbar">
        <div>
          <div className="admin-topbar-title">ProteinVault admin</div>
          <div className="admin-topbar-user mono">{userEmail}</div>
        </div>
        <button type="button" className="btn" onClick={signOutAdmin}>
          Sign out
        </button>
      </header>

      {error && (
        <div className="admin-error admin-error-banner">Couldn't load products: {error}</div>
      )}

      {stale.length > 0 && !selectedId && (
        <div className="admin-stale-banner">
          <div className="admin-stale-title">
            {stale.length} flavor{stale.length === 1 ? '' : 's'} need re-verification
          </div>
          <ul className="admin-stale-list">
            {stale.slice(0, 8).map(({ product, flavor }) => (
              <li key={`${product.id}-${flavor.id}`}>
                <button
                  type="button"
                  className="admin-stale-link"
                  onClick={() => setSelectedId(product.id)}
                >
                  {product.brand} — {flavor.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : selectedId === 'new' || selectedProduct ? (
        <BrandForm
          product={selectedProduct}
          existingIds={products.map((p) => p.id)}
          onSave={saveProduct}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <BrandList
          products={products}
          onSelect={setSelectedId}
          onAddBrand={() => setSelectedId('new')}
        />
      )}
    </div>
  )
}
