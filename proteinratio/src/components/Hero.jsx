export default function Hero({ brandCount, skuCount, bestRatio }) {
  return (
    <div className="hero">
      <h1>Every protein bar in Bangkok, ranked by what actually matters.</h1>
      <p>
        Quest, Musashi, Nutrend, Go On, FURI and more — one catalog, one checkout, sorted by
        real value instead of marketing copy.
      </p>
      <div className="stat-row">
        <div className="stat-pill">
          <div className="num">{brandCount}</div>
          <div className="lbl">brands</div>
        </div>
        <div className="stat-pill">
          <div className="num">{skuCount}</div>
          <div className="lbl">SKUs in stock</div>
        </div>
        <div className="stat-pill">
          <div className="num">฿{bestRatio}</div>
          <div className="lbl">cheapest ฿/g protein</div>
        </div>
        <div className="stat-pill">
          <div className="num">Next day</div>
          <div className="lbl">Bangkok delivery</div>
        </div>
      </div>
    </div>
  )
}
