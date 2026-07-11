import { ratio } from '../data/products.js'
import ProductCard from './ProductCard.jsx'

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

export default function ProductGrid({ items, filter, onAdd }) {
  const filtered = applyFilter(items, filter)
  const bestId = [...items].sort((a, b) => ratio(a) - ratio(b))[0]?.id

  if (filtered.length === 0) {
    return <div className="empty-state">No bars match that filter yet.</div>
  }

  return (
    <div className="grid">
      {filtered.map((p) => (
        <ProductCard key={p.id} product={p} isBestRatio={p.id === bestId} onAdd={onAdd} />
      ))}
    </div>
  )
}
