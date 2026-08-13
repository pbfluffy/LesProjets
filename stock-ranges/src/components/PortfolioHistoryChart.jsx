import { useId } from 'react'
import { convert } from '../fx.js'
import { formatPrice, maskPrice, formatAxisDate } from '../format.js'
import { useLang } from '../LangContext.jsx'
import styles from './PortfolioHistoryChart.module.css'

const CHART_WIDTH = 300
const CHART_HEIGHT = 90
const PAD_X = 4
const PAD_Y = 6

function toUnixSeconds(dateKey) {
  return new Date(dateKey).getTime() / 1000
}

// Daily market-value snapshots (recorded client-side, see
// portfolioHistory.js) as a filled line chart — the trend line itself is
// the point, so it stays visible even when amounts are masked; only the
// $ labels and header figure get replaced with the mask placeholder.
export default function PortfolioHistoryChart({ history, currency, rates, masked }) {
  const { s, lang } = useLang()
  const gradientId = useId()

  const points = history
    .map((entry) => ({ date: entry.date, value: convert(entry.marketValue, entry.currency, currency, rates) }))
    .filter((p) => p.value !== null)

  if (points.length < 2) {
    return (
      <div className={styles.wrap}>
        <div className={styles.title}>{s.historyTitle}</div>
        <div className={styles.emptyNote}>{s.historyBuilding}</div>
      </div>
    )
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const drawWidth = CHART_WIDTH - 2 * PAD_X
  const drawHeight = CHART_HEIGHT - 2 * PAD_Y
  const toX = (i) => (points.length > 1 ? PAD_X + (i / (points.length - 1)) * drawWidth : CHART_WIDTH / 2)
  const toY = (v) => CHART_HEIGHT - PAD_Y - ((v - min) / range) * drawHeight

  const first = values[0]
  const last = values[values.length - 1]
  const deltaAbs = last - first
  const deltaPct = first !== 0 ? (deltaAbs / first) * 100 : null
  const up = deltaAbs >= 0

  const linePoints = points.map((p, i) => [toX(i), toY(p.value)])
  const lineD = linePoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaD = `${lineD} L${linePoints[linePoints.length - 1][0].toFixed(1)},${CHART_HEIGHT} L${linePoints[0][0].toFixed(1)},${CHART_HEIGHT} Z`

  const startTs = toUnixSeconds(points[0].date)
  const endTs = toUnixSeconds(points[points.length - 1].date)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>{s.historyTitle}</div>
        <div className={styles.trend} data-direction={up ? 'up' : 'down'}>
          {masked ? maskPrice(currency) : `${up ? '+' : ''}${formatPrice(deltaAbs, currency)}`}
          {deltaPct !== null && !masked && (
            <span className={styles.trendPct}> ({up ? '+' : ''}{deltaPct.toFixed(1)}%)</span>
          )}
        </div>
      </div>
      <div className={styles.priceLabel}>{masked ? maskPrice(currency) : formatPrice(max, currency)}</div>
      <svg
        className={styles.chart}
        data-direction={up ? 'up' : 'down'}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={s.historyTitle}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className={styles.gradientStart} />
            <stop offset="100%" className={styles.gradientEnd} />
          </linearGradient>
        </defs>
        <path className={styles.area} d={areaD} fill={`url(#${gradientId})`} />
        <path className={styles.line} d={lineD} />
      </svg>
      <div className={styles.priceLabel}>{masked ? maskPrice(currency) : formatPrice(min, currency)}</div>
      <div className={styles.dateRow}>
        <span>{formatAxisDate(startTs, endTs - startTs, lang)}</span>
        <span>{formatAxisDate(endTs, endTs - startTs, lang)}</span>
      </div>
    </div>
  )
}
