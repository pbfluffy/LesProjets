import { tagHue } from '../tagColor.js'
import { formatPrice, maskPrice } from '../format.js'
import { useLang } from '../LangContext.jsx'
import styles from './AllocationChart.module.css'

const CX = 100
const CY = 100
const R = 96

function polarToCartesian(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

function describeSlice(startAngle, endAngle) {
  const start = polarToCartesian(endAngle)
  const end = polarToCartesian(startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

// Per-holding allocation, by market value — each slice/legend dot reuses
// the same symbol-hash hue as everywhere else in the wallet, so a ticker's
// color stays consistent between its card, the pie, and the legend.
export default function AllocationChart({ items, total, currency, masked }) {
  const { s } = useLang()
  if (!items.length || total <= 0) return null

  let cursor = 0
  const slices = items.map((item) => {
    const pct = (item.value / total) * 100
    const startAngle = cursor
    const endAngle = cursor + (item.value / total) * 360
    cursor = endAngle
    return { ...item, pct, startAngle, endAngle }
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{s.allocationTitle}</div>
      <div className={styles.body}>
        <svg viewBox="0 0 200 200" className={styles.chart} role="img" aria-label={s.allocationTitle}>
          {slices.length === 1 ? (
            <circle cx={CX} cy={CY} r={R} fill={`hsl(${tagHue(slices[0].symbol)} 60% 60%)`} />
          ) : (
            slices.map((slice) => (
              <path
                key={slice.symbol}
                d={describeSlice(slice.startAngle, slice.endAngle)}
                fill={`hsl(${tagHue(slice.symbol)} 60% 60%)`}
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            ))
          )}
        </svg>
        <ul className={styles.legend}>
          {slices.map((slice) => (
            <li key={slice.symbol}>
              <span className={styles.dot} style={{ background: `hsl(${tagHue(slice.symbol)} 60% 60%)` }} aria-hidden="true" />
              <span className={styles.legendSymbol}>{slice.symbol}</span>
              <span className={styles.legendPct}>{slice.pct.toFixed(1)}%</span>
              <span className={styles.legendValue}>{masked ? maskPrice(currency) : formatPrice(slice.value, currency)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
