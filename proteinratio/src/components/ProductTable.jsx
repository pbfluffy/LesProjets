import { ratio, flagEmoji } from '../data/products.js'

function applyFilter(items, filter) {
  switch (filter) {
    case 'under-100':
      return items.filter((p) => p.priceThb < 100)
    case 'high-protein':
      return items.filter((p) => p.proteinG >= 20)
    case 'thai-made':
      return items.filter((p) => p.tags?.includes('thai-made'))
    case 'plant-based':
      return items.filter((p) => p.tags?.includes('plant-based'))
    case 'best-ratio':
      return [...items].sort((a, b) => ratio(a) - ratio(b))
    default:
      return items
  }
}

export default function ProductTable({ items, filter, onAdd }) {
  const filtered = applyFilter(items, filter)
  const bestId = [...items].sort((a, b) => ratio(a) - ratio(b))[0]?.id

  if (filtered.length === 0) {
    return <div className="empty-state">No bars match that filter yet.</div>
  }

  return (
    <div className="table-wrap">
      <table className="ptable">
        <thead>
          <tr>
            <th>Origin</th>
            <th>Brand</th>
            <th>Product</th>
            <th className="num">Price</th>
            <th className="num">Protein</th>
            <th className="num">฿/g</th>
            <th aria-label="Add" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id} className={p.id === bestId ? 'best' : ''}>
              <td className="flag-cell" title={p.country}>
                <span className="flag">{flagEmoji(p.countryCode)}</span>
                <span className="country-name">{p.country}</span>
              </td>
              <td className="brand-cell">{p.brand}</td>
              <td>
                {p.name}
                {p.id === bestId && <span className="pill accent inline-pill">Best ratio</span>}
                {p.id !== bestId && p.tags?.includes('thai-made') && (
                  <span className="pill inline-pill">Thai made</span>
                )}
              </td>
              <td className="num mono">฿{p.priceThb}</td>
              <td className="num mono">{p.proteinG}g</td>
              <td className="num mono ratio-cell">฿{ratio(p)}</td>
              <td>
                <button className="add-btn-sm" onClick={() => onAdd(p)} aria-label="Add to cart">
                  +
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
