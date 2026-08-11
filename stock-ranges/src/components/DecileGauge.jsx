import { useEffect, useRef, useState } from 'react'
import { BAND_COUNT } from '../deciles.js'
import { formatAxisDate } from '../format.js'
import styles from './DecileGauge.module.css'

const CHART_WIDTH = 300
const CHART_HEIGHT = 120
// Keeps the line/candles from touching the chart's edges — without this the
// most recent point (today's price) sits flush against the right border,
// which reads as clipped rather than intentional.
const PAD_X = 8
const FALLBACK_AXIS_LABEL_COUNT = 4
// ~56px covers the widest realistic label ("10 ธ.ค. 2569"-style short
// dates, "Aug 2021"-style month/year) at 10px IBM Plex Mono, with a little
// breathing room so adjacent labels don't touch.
const MIN_LABEL_WIDTH = 56

// Picks up to `count` evenly-spaced indices spanning [0, n-1], always
// including both endpoints — e.g. for a 100-point series and count=4:
// [0, 33, 66, 99]. Falls back to every index when there are fewer points
// than the requested label count.
function pickEvenIndices(n, count) {
  if (n <= count) return Array.from({ length: n }, (_, i) => i)
  const indices = Array.from({ length: count }, (_, i) => Math.round((i / (count - 1)) * (n - 1)))
  return [...new Set(indices)]
}

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
export default function DecileGauge({ prices, ohlc, timestamps, current, low, high, band, chartType, labelHigh, labelLow, s, lang }) {
  const wrapRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // "As many labels as fit" — measure the actual rendered width (the card
  // this sits in varies from ~340px on mobile to ~560px on desktop) rather
  // than hardcoding a count that's too sparse on wide screens or overlaps
  // on narrow ones.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setContainerWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const range = high - low || 1
  const toY = (price) => CHART_HEIGHT - ((price - low) / range) * CHART_HEIGHT

  const bandHeight = CHART_HEIGHT / BAND_COUNT
  const bands = Array.from({ length: BAND_COUNT }, (_, i) => ({
    // i=0 is the topmost strip on screen, which is the highest band (10).
    bandNum: BAND_COUNT - i,
    y: i * bandHeight,
  }))

  const useCandles = chartType === 'candle' && Array.isArray(ohlc) && ohlc.length > 0

  const validTimestamps = Array.isArray(timestamps) ? timestamps.filter((t) => typeof t === 'number') : []
  const startTs = validTimestamps[0]
  const endTs = validTimestamps[validTimestamps.length - 1]
  const span = typeof startTs === 'number' && typeof endTs === 'number' ? endTs - startTs : 0
  const labelCount = containerWidth > 0
    ? Math.max(2, Math.min(validTimestamps.length, Math.floor(containerWidth / MIN_LABEL_WIDTH)))
    : FALLBACK_AXIS_LABEL_COUNT
  const axisTimestamps = pickEvenIndices(validTimestamps.length, labelCount).map((i) => validTimestamps[i])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.chartBox}>
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
      {validTimestamps.length > 1 && (
        <div className={styles.dateRow}>
          {axisTimestamps.map((ts, i) => (
            <span key={i}>{formatAxisDate(ts, span, lang)}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function LineChart({ prices, current, toY, band }) {
  const series = Array.isArray(prices) && typeof current === 'number' ? [...prices, current] : prices || []
  const drawWidth = CHART_WIDTH - 2 * PAD_X
  const points = series.map((price, i) => {
    const x = series.length > 1 ? PAD_X + (i / (series.length - 1)) * drawWidth : CHART_WIDTH / 2
    return [x, toY(price)]
  })
  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [markerX, markerY] = points[points.length - 1] || [CHART_WIDTH - PAD_X, CHART_HEIGHT / 2]

  return (
    <>
      {points.length > 1 && <path className={styles.priceLine} d={pathD} />}
      <circle className={styles.marker} data-zone={zoneOf(band)} cx={markerX} cy={markerY} r={4} />
    </>
  )
}

function Candlesticks({ ohlc, toY }) {
  const n = ohlc.length
  const drawWidth = CHART_WIDTH - 2 * PAD_X
  const slot = drawWidth / n
  const bodyWidth = Math.max(slot * 0.6, 1)

  return (
    <>
      {ohlc.map((candle, i) => {
        const cx = PAD_X + (i + 0.5) * slot
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
