import { ratio, flagUrl } from '../data/listings.js'
import { getShop, mapsDirectionsUrl } from '../data/shops.js'

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

function ShopAction({ shop }) {
  if (!shop) return null
  // Online (or both): link straight to the storefront.
  if (shop.url) {
    return (
      <a className="shop-action" href={shop.url} target="_blank" rel="noreferrer">
        Visit shop ↗
      </a>
    )
  }
  // Physical only: link to directions instead.
  if (shop.address) {
    return (
      <a
        className="shop-action"
        href={mapsDirectionsUrl(shop.address)}
        target="_blank"
        rel="noreferrer"
      >
        Directions ↗
      </a>
    )
  }
  return null
}

export default function ListingTable({ items, filter }) {
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
            <th>Where</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const shop = getShop(p.shopId)
            return (
              <tr key={p.id} className={p.id === bestId ? 'best' : ''}>
                <td className="flag-cell" title={p.country}>
                  <img
                    className="flag"
                    src={flagUrl(p.countryCode)}
                    alt={p.country}
                    width="24"
                    height="18"
                    loading="lazy"
                  />
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
                  <div className="shop-cell">
                    <span className="shop-name">{shop?.name ?? 'Unknown shop'}</span>
                    <ShopAction shop={shop} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
