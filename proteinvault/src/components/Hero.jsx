export default function Hero({ brandCount, shopCount, skuCount, bestRatio }) {
  return (
    <div className="hero">
      <h1>Every protein bar in Bangkok, and exactly where to buy it.</h1>
      <p>
        Quest, Musashi, Nutrend, Go On, FURI and more — one directory, sorted by real value
        instead of marketing copy. We don't sell anything; we just point you to the shop.
      </p>
      <div className="stat-row">
        <div className="stat-pill">
          <div className="num">{brandCount}</div>
          <div className="lbl">brands</div>
        </div>
        <div className="stat-pill">
          <div className="num">{shopCount}</div>
          <div className="lbl">shops listed</div>
        </div>
        <div className="stat-pill">
          <div className="num">{skuCount}</div>
          <div className="lbl">bars tracked</div>
        </div>
        <div className="stat-pill">
          <div className="num">฿{bestRatio}</div>
          <div className="lbl">cheapest ฿/g protein</div>
        </div>
      </div>
    </div>
  )
}
