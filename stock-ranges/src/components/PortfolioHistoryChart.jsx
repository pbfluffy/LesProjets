import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { convert } from '../fx.js'
import { fetchQuote } from '../stockApi.js'
import { flowAdjustedSeries, alignIndexSeries, benchmarkRangeFor, snapshotSeconds } from '../portfolioHistory.js'
import { formatPrice, maskPrice, formatAxisDate } from '../format.js'
import { useLang } from '../LangContext.jsx'
import styles from './PortfolioHistoryChart.module.css'

const CHART_WIDTH = 300
const CHART_HEIGHT = 90
const PAD_X = 4
const PAD_Y = 6
const RANGE_KEY = 'stockranges_history_range'
const BENCH_KEY = 'stockranges_history_benchmarks'
const BENCHMARKS = [
  { symbol: '^GSPC', id: 'gspc', label: 'S&P 500' },
  { symbol: '^NDX', id: 'ndx', label: 'Nasdaq-100' },
]

function loadBenchmarks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BENCH_KEY))
    return Array.isArray(parsed) ? parsed.filter((sym) => BENCHMARKS.some((b) => b.symbol === sym)) : []
  } catch {
    return []
  }
}

// Polyline through the non-null values, lifting the pen over gaps.
function linePath(values, toX, toY) {
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${toX(i).toFixed(1)},${toY(v).toFixed(1)} `
    pen = true
  })
  return d.trim()
}

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, all: Infinity }
const RANGE_OPTIONS = [
  ['7d', 'historyRange7d'],
  ['30d', 'historyRange30d'],
  ['90d', 'historyRange90d'],
  ['all', 'historyRangeAll'],
]

function toUnixSeconds(dateKey) {
  return new Date(dateKey).getTime() / 1000
}

// Local (not unix-shifted) date key N days before today, for simple
// string-comparison filtering against the 'YYYY-MM-DD' keys history is
// stored under.
function cutoffDateKey(days) {
  if (!Number.isFinite(days)) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Daily market-value snapshots (recorded client-side, see
// portfolioHistory.js) as a filled line chart — the trend line itself is
// the point, so it stays visible even when amounts are masked; only the
// $ labels and header figure get replaced with the mask placeholder.
export default function PortfolioHistoryChart({ history, currency, rates, masked }) {
  const { s, lang } = useLang()
  const gradientId = useId()
  const [range, setRange] = useState(() => localStorage.getItem(RANGE_KEY) || 'all')
  const [benchmarks, setBenchmarks] = useState(loadBenchmarks)
  // symbol -> { timestamps, prices } | 'error'; missing key = still loading.
  const [benchData, setBenchData] = useState({})
  const requestedRef = useRef(new Set()) // `${symbol}:${range}` already fetched or in flight

  useEffect(() => {
    localStorage.setItem(RANGE_KEY, range)
  }, [range])

  useEffect(() => {
    try { localStorage.setItem(BENCH_KEY, JSON.stringify(benchmarks)) } catch { /* storage unavailable */ }
  }, [benchmarks])

  // One fetch per selected benchmark, sized to cover the whole history so
  // switching the 7D/30D/90D window never needs a refetch.
  const firstDate = history[0]?.date
  useEffect(() => {
    if (!firstDate) return undefined
    const benchRange = benchmarkRangeFor(firstDate)
    // Only symbols not already requested: toggling one chip must not refetch
    // the other, and a failed request is forgotten so toggling again retries.
    // (No cancel flag: the ref would otherwise mark a request done whose result
    // a stale effect run then discards.)
    benchmarks.forEach((symbol) => {
      const key = `${symbol}:${benchRange}`
      if (requestedRef.current.has(key)) return
      requestedRef.current.add(key)
      setBenchData((prev) => {
        if (!(symbol in prev)) return prev
        const rest = { ...prev }
        delete rest[symbol]
        return rest
      })
      const fail = () => {
        requestedRef.current.delete(key)
        setBenchData((prev) => ({ ...prev, [symbol]: 'error' }))
      }
      fetchQuote(symbol, benchRange)
        .then((q) => {
          if (!(Array.isArray(q?.prices) && Array.isArray(q?.timestamps))) { fail(); return }
          setBenchData((prev) => ({ ...prev, [symbol]: { timestamps: q.timestamps, prices: q.prices } }))
        })
        .catch(fail)
    })
  }, [benchmarks, firstDate])

  function toggleBenchmark(symbol) {
    setBenchmarks((prev) => (prev.includes(symbol) ? prev.filter((x) => x !== symbol) : [...prev, symbol]))
  }

  // Derived data is memoized so mask toggles and parent re-renders don't redo
  // the currency conversion, the flow adjustment or the per-benchmark sorted
  // alignment (hooks stay above the early returns below).
  const points = useMemo(() => {
    const cutoff = cutoffDateKey(RANGE_DAYS[range])
    const visibleHistory = cutoff ? history.filter((e) => e.date >= cutoff) : history
    return visibleHistory
      .map((entry) => {
        const cost = typeof entry.costBasis === 'number' ? convert(entry.costBasis, entry.currency, currency, rates) : null
        return { date: entry.date, at: snapshotSeconds(entry), value: convert(entry.marketValue, entry.currency, currency, rates), costBasis: cost === null ? undefined : cost }
      })
      .filter((p) => p.value !== null)
  }, [history, range, currency, rates])

  const comparison = useMemo(() => {
    if (benchmarks.length === 0 || points.length < 2) return null
    const cutoffs = points.map((p) => p.at)
    const lines = [{
      id: 'pf',
      values: flowAdjustedSeries(points.map((p) => ({ date: p.date, marketValue: p.value, costBasis: p.costBasis }))).map((x) => x.index),
    }]
    let failed = false
    let loading = false
    benchmarks.forEach((symbol) => {
      const b = BENCHMARKS.find((x) => x.symbol === symbol)
      const data = benchData[symbol]
      if (data === 'error') failed = true
      else if (!data) loading = true
      else lines.push({ id: b.id, label: b.label, values: alignIndexSeries(data.timestamps, data.prices, cutoffs) })
    })
    return { lines, failed, loading }
  }, [points, benchmarks, benchData])

  const rangeRow = (
    <div className={styles.rangeRow}>
      {RANGE_OPTIONS.map(([key, labelKey]) => (
        <button
          key={key}
          type="button"
          className={styles.rangeBtn}
          data-active={range === key}
          onClick={() => setRange(key)}
        >
          {s[labelKey]}
        </button>
      ))}
    </div>
  )

  const chipRow = (
    <div className={styles.rangeRow}>
      <span className={styles.compareLabel}>{s.historyCompareLabel}</span>
      {BENCHMARKS.map((b) => (
        <button
          key={b.symbol}
          type="button"
          className={styles.rangeBtn}
          data-active={benchmarks.includes(b.symbol)}
          aria-pressed={benchmarks.includes(b.symbol)}
          onClick={() => toggleBenchmark(b.symbol)}
        >
          {b.label}
        </button>
      ))}
    </div>
  )

  if (points.length < 2) {
    return (
      <div className={styles.wrap}>
        <div className={styles.title}>{s.historyTitle}</div>
        {history.length > 1 && rangeRow}
        <div className={styles.emptyNote}>{s.historyBuilding}</div>
      </div>
    )
  }

  if (comparison) {
    const { lines, failed, loading } = comparison
    // 100 is always in range so the break-even baseline never leaves the chart.
    const all = [100, ...lines.flatMap((l) => l.values).filter((v) => v !== null && Number.isFinite(v))]
    const lo = Math.min(...all)
    const hi = Math.max(...all)
    const span = hi - lo || 1
    const w = CHART_WIDTH - 2 * PAD_X
    const h = CHART_HEIGHT - 2 * PAD_Y
    const cx = (i) => PAD_X + (i / (points.length - 1)) * w
    const cy = (v) => CHART_HEIGHT - PAD_Y - ((v - lo) / span) * h
    const endPct = (l) => {
      const last = [...l.values].reverse().find((v) => v !== null && Number.isFinite(v))
      return last === undefined ? null : last - 100
    }
    const st = toUnixSeconds(points[0].date)
    const en = toUnixSeconds(points[points.length - 1].date)
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.title}>{s.historyTitle}</div>
        </div>
        {rangeRow}
        {chipRow}
        <ul className={styles.legend}>
          {lines.map((l) => {
            const pct = endPct(l)
            return (
              <li key={l.id}>
                <span className={styles.legendDot} data-series={l.id} aria-hidden="true" />
                <span>{l.id === 'pf' ? s.historyPortfolioLabel : l.label}</span>
                <strong data-direction={pct !== null && pct < 0 ? 'down' : 'up'}>
                  {pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
                </strong>
              </li>
            )
          })}
        </ul>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={s.historyTitle}
        >
          <line className={styles.baseLine} x1={PAD_X} x2={CHART_WIDTH - PAD_X} y1={cy(100)} y2={cy(100)} />
          {lines.map((l) => (
            <path key={l.id} className={styles.cmpLine} data-series={l.id} d={linePath(l.values, cx, cy)} />
          ))}
        </svg>
        <div className={styles.dateRow}>
          <span>{formatAxisDate(st, en - st, lang)}</span>
          <span>{formatAxisDate(en, en - st, lang)}</span>
        </div>
        <div className={styles.emptyNote}>{loading && !failed ? s.loading : failed ? s.historyBenchError : s.historyCompareNote}</div>
      </div>
    )
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const valueRange = max - min || 1
  const drawWidth = CHART_WIDTH - 2 * PAD_X
  const drawHeight = CHART_HEIGHT - 2 * PAD_Y
  const toX = (i) => (points.length > 1 ? PAD_X + (i / (points.length - 1)) * drawWidth : CHART_WIDTH / 2)
  const toY = (v) => CHART_HEIGHT - PAD_Y - ((v - min) / valueRange) * drawHeight

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
      {rangeRow}
      {chipRow}
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
