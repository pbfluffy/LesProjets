import { useState } from 'react'
import { tagHue } from '../tagColor.js'
import { formatPrice, maskPrice } from '../format.js'
import { useLang } from '../LangContext.jsx'
import styles from './AllocationChart.module.css'

const CX = 100
const CY = 100
const R = 96
const COLLAPSED_COUNT = 6

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

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
// color stays consistent between its card, the pie, and the legend. A
// second grouping (by business line/sector, from wallet.js's
// groupAllocationBySector) is precomputed by the caller and just switched
// to here — sector slices hash color by the sector key instead of a
// symbol, so they get their own stable, distinct palette rather than
// coincidentally reusing one constituent ticker's color.
export default function AllocationChart({ items, sectorItems, total, currency, masked }) {
  const { s } = useLang()
  const [expanded, setExpanded] = useState(false)
  const [groupBy, setGroupBy] = useState('symbol')
  if (!items.length || total <= 0) return null

  const bySymbol = groupBy === 'symbol'
  const rawItems = bySymbol
    ? items.map((item) => ({ key: item.symbol, label: item.symbol, value: item.value }))
    : sectorItems.map((item) => ({ key: item.key, label: s[`sector${item.key}`] || item.key, value: item.value }))

  let cursor = 0
  const slices = rawItems.map((item) => {
    const pct = (item.value / total) * 100
    const startAngle = cursor
    const endAngle = cursor + (item.value / total) * 360
    cursor = endAngle
    return { ...item, pct, startAngle, endAngle }
  })
  const visibleSlices = expanded ? slices : slices.slice(0, COLLAPSED_COUNT)
  const hiddenCount = slices.length - visibleSlices.length

  return (
    <div className={styles.wrap}>
      <div className={styles.titleRow}>
        <div className={styles.title}>{s.allocationTitle}</div>
        <div className={styles.groupToggle} role="group" aria-label={s.allocationGroupBy}>
          <button
            type="button"
            className={styles.groupToggleBtn}
            data-active={bySymbol}
            onClick={() => { setGroupBy('symbol'); setExpanded(false) }}
          >
            {s.allocationByTicker}
          </button>
          <button
            type="button"
            className={styles.groupToggleBtn}
            data-active={!bySymbol}
            onClick={() => { setGroupBy('sector'); setExpanded(false) }}
          >
            {s.allocationBySector}
          </button>
        </div>
      </div>
      <div className={styles.body}>
        <svg viewBox="0 0 200 200" className={styles.chart} role="img" aria-label={s.allocationTitle}>
          {slices.length === 1 ? (
            <circle cx={CX} cy={CY} r={R} fill={`hsl(${tagHue(slices[0].key)} 60% 60%)`} />
          ) : (
            slices.map((slice) => (
              <path
                key={slice.key}
                d={describeSlice(slice.startAngle, slice.endAngle)}
                fill={`hsl(${tagHue(slice.key)} 60% 60%)`}
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            ))
          )}
        </svg>
        <div className={styles.legendCol}>
          <ul className={styles.legend}>
            {visibleSlices.map((slice) => (
              <li key={slice.key}>
                <span className={styles.dot} style={{ background: `hsl(${tagHue(slice.key)} 60% 60%)` }} aria-hidden="true" />
                <span className={styles.legendSymbol}>{slice.label}</span>
                <span className={styles.legendPct}>{slice.pct.toFixed(1)}%</span>
                <span className={styles.legendValue}>{masked ? maskPrice(currency) : formatPrice(slice.value, currency)}</span>
              </li>
            ))}
          </ul>
          {slices.length > COLLAPSED_COUNT && (
            <button type="button" className={styles.legendToggle} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? s.allocationShowLess : interp(s.allocationShowMore, { n: hiddenCount })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
