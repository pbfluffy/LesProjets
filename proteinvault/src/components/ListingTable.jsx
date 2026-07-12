import { useState, Fragment } from 'react'
import { ratio, flagUrl } from '../data/listings.js'
import { getShop, mapsDirectionsUrl, shopIconUrl, shopLinkUrl } from '../data/shops.js'

function flavorPassesFilter(flavor, product, filter) {
  switch (filter) {
    case 'under-100':
      return flavor.priceThb < 100
    case 'high-protein':
      return flavor.proteinG >= 20
    case 'thai-made':
      return product.tags?.includes('thai-made')
    case 'plant-based':
      return product.tags?.includes('plant-based')
    default:
      return true // 'all' and 'best-ratio' keep every flavor
  }
}

function ShopLink({ shop }) {
  if (!shop) return null
  const icon = shopIconUrl(shop)
  const isAffiliate = Boolean(shop.affiliateUrl)

  // Physical-only shop, no online link at all — directions instead.
  if (!shop.url && shop.address) {
    return (
      <a className="shop-link" href={mapsDirectionsUrl(shop.address)} target="_blank" rel="noreferrer">
        {icon && <img className="shop-icon" src={icon} alt="" width="16" height="16" />}
        Directions ↗
      </a>
    )
  }

  if (!shop.url) return null

  return (
    <a
      className={`shop-link ${isAffiliate ? 'affiliate' : ''}`}
      href={shopLinkUrl(shop)}
      target="_blank"
      rel="noreferrer"
    >
      {icon && <img className="shop-icon" src={icon} alt="" width="16" height="16" />}
      {isAffiliate ? 'Buy on Shopee ↗' : 'Visit shop ↗'}
    </a>
  )
}

export default function ListingTable({ products, filter }) {
  const [expanded, setExpanded] = useState(() => new Set())

  // Best ratio across every flavor of every product, for the "Best ratio" badge.
  let globalBestFlavorId = null
  let globalBestRatio = Infinity
  products.forEach((product) => {
    product.flavors.forEach((flavor) => {
      const r = Number(ratio(flavor.priceThb, flavor.proteinG))
      if (r < globalBestRatio) {
        globalBestRatio = r
        globalBestFlavorId = flavor.id
      }
    })
  })

  const visible = products
    .map((product) => ({
      product,
      matchingFlavors: product.flavors.filter((f) => flavorPassesFilter(f, product, filter)),
    }))
    .filter(({ matchingFlavors }) => matchingFlavors.length > 0)

  if (filter === 'best-ratio') {
    visible.sort((a, b) => {
      const bestA = Math.min(
        ...a.matchingFlavors.map((f) => Number(ratio(f.priceThb, f.proteinG))),
      )
      const bestB = Math.min(
        ...b.matchingFlavors.map((f) => Number(ratio(f.priceThb, f.proteinG))),
      )
      return bestA - bestB
    })
  }

  if (visible.length === 0) {
    return <div className="empty-state">No bars match that filter yet.</div>
  }

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="table-wrap">
      <table className="ptable">
        <thead>
          <tr>
            <th>Origin</th>
            <th>Brand</th>
            <th>Flavors</th>
            <th className="num">From</th>
            <th className="num">Best ฿/g</th>
            <th>Shops</th>
            <th aria-label="Expand" />
          </tr>
        </thead>
        <tbody>
          {visible.map(({ product, matchingFlavors }) => {
            const isOpen = expanded.has(product.id)
            const cheapestFlavor = [...matchingFlavors].sort((a, b) => a.priceThb - b.priceThb)[0]
            const bestRatioForProduct = Math.min(
              ...matchingFlavors.map((f) => Number(ratio(f.priceThb, f.proteinG))),
            ).toFixed(2)
            const shopIdsForProduct = [...new Set(matchingFlavors.flatMap((f) => f.shopIds))]

            return (
              <Fragment key={product.id}>
                <tr className={`product-row ${isOpen ? 'open' : ''}`} onClick={() => toggle(product.id)}>
                  <td className="flag-cell" title={product.country}>
                    <img
                      className="flag"
                      src={flagUrl(product.countryCode)}
                      alt={product.country}
                      width="24"
                      height="18"
                      loading="lazy"
                    />
                    <span className="country-name">{product.country}</span>
                  </td>
                  <td className="brand-cell">{product.brand}</td>
                  <td>
                    {matchingFlavors.length} flavor{matchingFlavors.length > 1 ? 's' : ''}
                    {product.tags?.includes('thai-made') && (
                      <span className="pill inline-pill">Thai made</span>
                    )}
                  </td>
                  <td className="num mono">฿{cheapestFlavor.priceThb}</td>
                  <td className="num mono ratio-cell">฿{bestRatioForProduct}</td>
                  <td className="shop-icons-cell">
                    {shopIdsForProduct
                      .map((id) => getShop(id))
                      .filter(Boolean)
                      .sort((a, b) => Boolean(b.affiliateUrl) - Boolean(a.affiliateUrl))
                      .map((shop) => {
                        const icon = shopIconUrl(shop)
                        return icon ? (
                          <img
                            key={shop.id}
                            className={`shop-icon-stack ${shop.affiliateUrl ? 'affiliate' : ''}`}
                            src={icon}
                            alt={shop.name}
                            title={shop.name}
                            width="18"
                            height="18"
                          />
                        ) : null
                      })}
                  </td>
                  <td className="expand-cell">{isOpen ? '−' : '+'}</td>
                </tr>
                {isOpen &&
                  matchingFlavors.map((flavor) => (
                    <tr key={flavor.id} className="flavor-row">
                      <td />
                      <td className="flavor-name" colSpan={2}>
                        {flavor.name}
                        {flavor.id === globalBestFlavorId && (
                          <span className="pill accent inline-pill">Best ratio</span>
                        )}
                      </td>
                      <td className="num mono">฿{flavor.priceThb}</td>
                      <td className="num mono ratio-cell">
                        ฿{ratio(flavor.priceThb, flavor.proteinG)}
                      </td>
                      <td colSpan={2}>
                        <div className="shop-list">
                          {[...flavor.shopIds]
                            .map((shopId) => getShop(shopId))
                            .filter(Boolean)
                            .sort((a, b) => Boolean(b.affiliateUrl) - Boolean(a.affiliateUrl))
                            .map((shop) => (
                              <div className="shop-cell" key={shop.id}>
                                <span className="shop-name">{shop.name}</span>
                                <ShopLink shop={shop} />
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
