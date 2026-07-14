export default function BrandList({ products, onSelect, onAddBrand }) {
  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2>Brands</h2>
        <button type="button" className="btn btn-primary" onClick={onAddBrand}>
          + Add brand
        </button>
      </div>
      {products.length === 0 ? (
        <div className="empty-state">No products in Firestore yet.</div>
      ) : (
        <ul className="admin-brand-list">
          {products.map((p) => (
            <li key={p.id}>
              <button type="button" className="admin-brand-row" onClick={() => onSelect(p.id)}>
                <span className="admin-brand-row-name">{p.brand}</span>
                <span className="admin-brand-row-meta mono">
                  {p.country} · {p.flavors.length} flavor{p.flavors.length === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
