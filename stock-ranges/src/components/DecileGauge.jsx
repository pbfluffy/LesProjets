import { BAND_COUNT } from '../deciles.js'
import styles from './DecileGauge.module.css'

const CHART_WIDTH = 300
const CHART_HEIGHT = 120

function zoneOf(band) {
  return band <= 3 ? 'buy' : band <= 7 ? 'hold' : 'sell'
}

// A real price chart (line or candlestick) over 10 colored band layers,
// top-down: y=0 is the period high, y=CHART_HEIGHT is the period low, so
// band 10 renders at the top and band 1 at the bottom. Geometry always uses
// native-currency prices (low/high/current/ohlc) — a display-currency
// conversion would scale every value by the same factor, so it can't change
// where the chart falls relative to the bands; only the corner labels need
// the converted price.
export default function DecileGauge({ prices, ohlc, current, low, high, band, chartType, labelHigh, labelLow, s }) {
  const range = high - low || 1
  const toY = (price) => CHART_HEIGHT - ((price - low) / range) * CHART_HEIGHT

  const bandHeight = CHART_HEIGHT / BAND_COUNT
  const bands = Array.from({ length: BAND_COUNT }, (_, i) => ({
    // i=0 is the topmost strip on screen, which is the highest band (10).
    bandNum: BAND_COUNT - i,
    y: i * bandHeight,
  }))

  const useCandles = chartType === 'candle' && Array.isArray(ohlc) && ohlc.length > 0

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
        {useCandles
          ? <Candlesticks ohlc={ohlc} toY={toY} />
          : <LineChart prices={prices} current={current} toY={toY} band={band} />}
      </svg>
      <div className={styles.axisLabel} data-pos="bottom">{s.low} {labelLow}</div>
    </div>
  )
}

function LineChart({ prices, current, toY, band }) {
  const series = Array.isArray(prices) && typeof current === 'number' ? [...prices, current] : prices || []
  const points = series.map((price, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * CHART_WIDTH : CHART_WIDTH
    return [x, toY(price)]
  })
  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [markerX, markerY] = points[points.length - 1] || [CHART_WIDTH, CHART_HEIGHT / 2]

  return (
    <>
      {points.length > 1 && <path className={styles.priceLine} d={pathD} />}
      <circle className={styles.marker} data-zone={zoneOf(band)} cx={markerX} cy={markerY} r={4} />
    </>
  )
}

function Candlesticks({ ohlc, toY }) {
  const n = ohlc.length
  const slot = CHART_WIDTH / n
  const bodyWidth = Math.max(slot * 0.6, 1)

  return (
    <>
      {ohlc.map((candle, i) => {
        const cx = (i + 0.5) * slot
        const up = candle.c >= candle.o
        const bodyTop = toY(Math.max(candle.o, candle.c))
        const bodyBottom = toY(Math.min(candle.o, candle.c))
        return (
          <g key={i} className={styles.candle} data-direction={up ? 'up' : 'down'}>
            <line className={styles.candleWick} x1={cx} y1={toY(candle.h)} x2={cx} y2={toY(candle.l)} />
            <rect
              className={styles.candleBody}
              x={cx - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={Math.max(bodyBottom - bodyTop, 0.75)}
            />
          </g>
        )
      })}
    </>
  )
}
