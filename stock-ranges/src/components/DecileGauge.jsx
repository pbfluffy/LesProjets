import { BAND_COUNT } from '../deciles.js'
import styles from './DecileGauge.module.css'

const CHART_WIDTH = 300
const CHART_HEIGHT = 120

function zoneOf(band) {
  return band <= 3 ? 'buy' : band <= 7 ? 'hold' : 'sell'
}

// A real price line over 10 colored band layers, top-down: y=0 is the
// period high, y=CHART_HEIGHT is the period low, so band 10 renders at the
// top and band 1 at the bottom. Geometry always uses native-currency prices
// (low/high/current) — a display-currency conversion would scale every
// value by the same factor, so it can't change where the line falls
// relative to the bands; only the corner labels need the converted price.
export default function DecileGauge({ prices, low, high, current, band, labelHigh, labelLow, s }) {
  const range = high - low || 1
  const toY = (price) => CHART_HEIGHT - ((price - low) / range) * CHART_HEIGHT

  const series = Array.isArray(prices) && typeof current === 'number' ? [...prices, current] : prices || []
  const points = series.map((price, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * CHART_WIDTH : CHART_WIDTH
    return [x, toY(price)]
  })
  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [markerX, markerY] = points[points.length - 1] || [CHART_WIDTH, CHART_HEIGHT / 2]

  const bandHeight = CHART_HEIGHT / BAND_COUNT
  const bands = Array.from({ length: BAND_COUNT }, (_, i) => ({
    // i=0 is the topmost strip on screen, which is the highest band (10).
    bandNum: BAND_COUNT - i,
    y: i * bandHeight,
  }))

  return (
    <div className={styles.wrap}>
      <div className={styles.axisLabel} data-pos="top">{s.high} {labelHigh}</div>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${s.band} ${band} / ${BAND_COUNT}`}
      >
        {bands.map((b) => (
          <rect key={b.bandNum} className={styles.bandRect} data-zone={zoneOf(b.bandNum)} x={0} y={b.y} width={CHART_WIDTH} height={bandHeight} />
        ))}
        {bands.slice(1).map((b) => (
          <line key={`grid-${b.bandNum}`} className={styles.gridLine} x1={0} y1={b.y} x2={CHART_WIDTH} y2={b.y} />
        ))}
        {points.length > 1 && <path className={styles.priceLine} d={pathD} />}
        <circle className={styles.marker} data-zone={zoneOf(band)} cx={markerX} cy={markerY} r={4} />
      </svg>
      <div className={styles.axisLabel} data-pos="bottom">{s.low} {labelLow}</div>
    </div>
  )
}
