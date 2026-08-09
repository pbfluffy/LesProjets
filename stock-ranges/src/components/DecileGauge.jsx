import { BAND_COUNT } from '../deciles.js'
import styles from './DecileGauge.module.css'

function zoneOf(band) {
  return band <= 3 ? 'buy' : band <= 7 ? 'hold' : 'sell'
}

// Vertical, top-down: band 10 (near the period high) renders at the top,
// band 1 (near the period low) at the bottom — column-reverse places the
// first DOM child (band 1) at the main-start (bottom) and the last (band
// 10) at the main-end (top), so the array stays in natural 1..10 order.
export default function DecileGauge({ band, low, high, currency, s }) {
  const segments = Array.from({ length: BAND_COUNT }, (_, i) => i + 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>{s.high}<br />{formatPrice(high, currency)}</div>
      <div className={styles.gauge} role="img" aria-label={`${s.band} ${band} / ${BAND_COUNT}`}>
        {segments.map((n) => (
          <div
            key={n}
            className={styles.segment}
            data-zone={zoneOf(n)}
            data-active={n === band}
          />
        ))}
      </div>
      <div className={styles.label}>{s.low}<br />{formatPrice(low, currency)}</div>
    </div>
  )
}

function formatPrice(value, currency) {
  if (typeof value !== 'number') return '—'
  return `${currency ? currency + ' ' : ''}${value.toFixed(2)}`
}
