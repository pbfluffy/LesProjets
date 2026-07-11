import { ratio } from '../data/products.js'

export default function ProductCard({ product, isBestRatio, onAdd }) {
  return (
    <div className="card">
      <div className="card-main">
        <div className="card-top">
          <span className="brand">{product.brand}</span>
          {isBestRatio && <span className="pill accent">Best ratio</span>}
          {!isBestRatio && product.tags?.includes('thai-made') && (
            <span className="pill">Thai made</span>
          )}
        </div>
        <div className="pname">{product.name}</div>
        <div className="price-row">
          <span className="price">฿{product.priceThb}</span>
          <span className="ratio-inline">
            <b>฿{ratio(product)}</b>/g protein
          </span>
        </div>
      </div>
      <button className="add-btn" onClick={() => onAdd(product)} aria-label="Add to cart">
        +
      </button>
    </div>
  )
}
