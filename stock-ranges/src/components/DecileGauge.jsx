import { BAND_COUNT } from '../deciles.js'
import styles from './DecileGauge.module.css'

function zoneOf(band) {
  return band <= 3 ? 'buy' : band <= 7 ? 'hold' : 'sell'
}

export default function DecileGauge({ band, low, high, currency, s }) {
  const segments = Array.from({ length: BAND_COUNT }, (_, i) => i + 1)

  return (
    <div>
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
      <div className={styles.labels}>
        <span>{s.low} {formatPrice(low, currency)}</span>
        <span>{s.high} {formatPrice(high, currency)}</span>
      </div>
    </div>
  )
}

function formatPrice(value, currency) {
  if (typeof value !== 'number') return '—'
  return `${currency ? currency + ' ' : ''}${value.toFixed(2)}`
}
