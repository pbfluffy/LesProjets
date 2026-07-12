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

// Resolves each flavor.shops[] entry ({shopId, url?}) to its full shop
// object plus the actual link to use, and drops any shopId that doesn't
// resolve.
function resolveShops(shopEntries) {
  return shopEntries
    .map(({ shopId, url }) => {
      const shop = getShop(shopId)
      return shop ? { shop, href: shopLinkUrl(shop, url) } : null
    })
    .filter(Boolean)
    .sort((a, b) => Boolean(b.shop.isAffiliateChannel) - Boolean(a.shop.isAffiliateChannel))
}

function ShopLink({ shop, href, compact = false }) {
  if (!shop) return null
  const icon = shopIconUrl(shop)
  const isAffiliate = Boolean(shop.isAffiliateChannel) && !compact

  if (!href && shop.address) {
    return (
      <a
        className={`shop-btn ${compact ? 'compact' : ''}`}
        href={mapsDirectionsUrl(shop.address)}
        target="_blank"
        rel="noreferrer"
        title={shop.name}
        aria-label={`Get directions to ${shop.name}`}
      >
        {icon && (
          <img
            className="shop-btn-icon"
            src={icon}
            alt=""
            width="16"
            height="16"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        )}
        {!compact && 'Directions ↗'}
      </a>
    )
  }

  if (!href) return null

  return (
    <a
      className={`shop-btn ${isAffiliate ? 'affiliate' : ''} ${compact ? 'compact' : ''}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      title={shop.name}
      aria-label={isAffiliate ? `Buy on Shopee` : `Visit ${shop.name}`}
    >
      {icon && (
        <img
          className="shop-btn-icon"
          src={icon}
          alt=""
          width="16"
          height="16"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      )}
      {!compact && (isAffiliate ? 'Buy on Shopee ↗' : `Visit ${shop.name} ↗`)}
    </a>
  )
}

function FlavorRows({ matchingFlavors, globalBestFlavorId }) {
  return matchingFlavors.map((flavor) => (
    <div className="flavor-item" key={flavor.id}>
      <div className="flavor-item-top">
        <span className="flavor-item-name">
          {flavor.name}
          {flavor.id === globalBestFlavorId && (
            <span className="pill accent inline-pill">Best ratio</span>
          )}
        </span>
        <span className="flavor-item-price mono">
          ฿{flavor.priceThb} <span className="ratio-cell">฿{ratio(flavor.priceThb, flavor.proteinG)}/g</span>
        </span>
      </div>
      <div className="shop-list">
        {resolveShops(flavor.shops).map(({ shop, href }) => (
          <div className="shop-cell" key={shop.id}>
            <span className="shop-name">{shop.name}</span>
            <ShopLink shop={shop} href={href} />
          </div>
        ))}
      </div>
    </div>
  ))
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

  // Shared per-product computed values, used by both the card and table renders.
  const rows = visible.map(({ product, matchingFlavors }) => {
    const isOpen = expanded.has(product.id)
    const cheapestFlavor = [...matchingFlavors].sort((a, b) => a.priceThb - b.priceThb)[0]
    const bestRatioForProduct = Math.min(
      ...matchingFlavors.map((f) => Number(ratio(f.priceThb, f.proteinG))),
    ).toFixed(2)

    const seenShopIds = new Set()
    const productShopLinks = []
    matchingFlavors.forEach((f) => {
      resolveShops(f.shops).forEach(({ shop, href }) => {
        if (!seenShopIds.has(shop.id)) {
          seenShopIds.add(shop.id)
          productShopLinks.push({ shop, href })
        }
      })
    })
    productShopLinks.sort(
      (a, b) => Boolean(b.shop.isAffiliateChannel) - Boolean(a.shop.isAffiliateChannel),
    )

    return { product, matchingFlavors, isOpen, cheapestFlavor, bestRatioForProduct, productShopLinks }
  })

  return (
    <>
      {/* Mobile: card list. Hidden on wider screens via CSS. */}
      <div className="card-list">
        {rows.map(({ product, matchingFlavors, isOpen, cheapestFlavor, bestRatioForProduct, productShopLinks }) => (
          <div className="p-card" key={product.id}>
            <div
              className={`p-card-head ${isOpen ? 'open' : ''}`}
              onClick={() => toggle(product.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(product.id)
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
            >
              <img
                className="flag"
                src={flagUrl(product.countryCode)}
                alt={product.country}
                width="22"
                height="16"
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              <div className="p-card-info">
                <div className="p-card-brand">
                  {product.brand}
                  {product.tags?.includes('thai-made') && (
                    <span className="pill inline-pill">Thai made</span>
                  )}
                </div>
                <div className="p-card-meta mono">
                  {matchingFlavors.length} flavor{matchingFlavors.length > 1 ? 's' : ''} · from ฿
                  {cheapestFlavor.priceThb} · <span className="ratio-cell">฿{bestRatioForProduct}/g</span>
                </div>
              </div>
              <div className="expand-cell">{isOpen ? '−' : '+'}</div>
            </div>

            {!isOpen && (
              <div className="p-card-shops" onClick={(e) => e.stopPropagation()}>
                {productShopLinks.map(({ shop, href }) => (
                  <ShopLink key={shop.id} shop={shop} href={href} compact />
                ))}
              </div>
            )}

            {isOpen && (
              <div className="p-card-flavors">
                <FlavorRows matchingFlavors={matchingFlavors} globalBestFlavorId={globalBestFlavorId} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table. Hidden on narrow screens via CSS. */}
      <div className="table-wrap">
        <table className="ptable">
          <thead>
            <tr>
              <th>Brand</th>
              <th className="num">From</th>
              <th className="num">Best ฿/g</th>
              <th>Shops</th>
              <th aria-label="Expand" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, matchingFlavors, isOpen, cheapestFlavor, bestRatioForProduct, productShopLinks }) => (
              <Fragment key={product.id}>
                <tr
                  className={`product-row ${isOpen ? 'open' : ''}`}
                  onClick={() => toggle(product.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(product.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-label={`${product.brand}, ${matchingFlavors.length} flavor${matchingFlavors.length > 1 ? 's' : ''}, ${isOpen ? 'expanded' : 'collapsed'}`}
                >
                  <td>
                    <div className="brand-cell-main">
                      <img
                        className="flag"
                        src={flagUrl(product.countryCode)}
                        alt={product.country}
                        width="20"
                        height="15"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      <div>
                        <div className="brand-name">
                          {product.brand}
                          {product.tags?.includes('thai-made') && (
                            <span className="pill inline-pill">Thai made</span>
                          )}
                        </div>
                        <div className="brand-sub mono">
                          {matchingFlavors.length} flavor{matchingFlavors.length > 1 ? 's' : ''} · {product.country}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="num mono">฿{cheapestFlavor.priceThb}</td>
                  <td className="num mono ratio-cell">฿{bestRatioForProduct}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="shop-btns-cell">
                      {productShopLinks.map(({ shop, href }) => (
                        <ShopLink key={shop.id} shop={shop} href={href} compact />
                      ))}
                    </div>
                  </td>
                  <td className="expand-cell">{isOpen ? '−' : '+'}</td>
                </tr>
                {isOpen && (
                  <tr className="flavor-row">
                    <td colSpan={5}>
                      <div className="flavor-panel">
                        <FlavorRows matchingFlavors={matchingFlavors} globalBestFlavorId={globalBestFlavorId} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
