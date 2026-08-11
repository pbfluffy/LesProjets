import { useEffect, useState } from 'react'
import { fetchQuote } from '../stockApi.js'
import { computeDeciles } from '../deciles.js'
import { convert } from '../fx.js'
import { formatPrice, dayChange } from '../format.js'
import DecileGauge from './DecileGauge.jsx'
import { useLang } from '../LangContext.jsx'
import styles from './TickerCard.module.css'

const SIGNAL_LABEL_KEY = { buy: 'signalBuy', hold: 'signalHold', sell: 'signalSell' }
const CHANGE_ARROW = { up: '▲', down: '▼', flat: '·' }

export default function TickerCard({ symbol, range, currency, rates, chartType, onRemove, onStatus }) {
  const { s, lang } = useLang()
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: null, error: null })
    fetchQuote(symbol, range)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data, error: null }) })
      .catch((err) => { if (!cancelled) setState({ status: 'error', data: null, error: err.message }) })
    return () => { cancelled = true }
  }, [symbol, range])

  const deciles = state.status === 'ready'
    ? computeDeciles({ prices: state.data.prices, current: state.data.current })
    : null

  // Reports this card's computed band/signal up to the Dashboard so the
  // whole watchlist can be sorted by opportunity (buy-zone first) and
  // summarized (N buy / N hold / N sell), and marks when the fetch settled
  // so a global "updated Xm ago" stays accurate.
  useEffect(() => {
    if (!onStatus) return
    if (state.status === 'ready') onStatus(symbol, { band: deciles?.band ?? null, signal: deciles?.signal ?? null, ts: Date.now() })
    else if (state.status === 'error') onStatus(symbol, { band: null, signal: null, ts: null })
  }, [state.status, deciles?.band, deciles?.signal]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <div className={styles.symbol}>{symbol}</div>
          {state.data && <div className={styles.name}>{state.data.name}</div>}
        </div>
        <div className={styles.headRight}>
          {state.data && (() => {
            const shown = convert(state.data.current, state.data.currency, currency, rates)
            const code = shown === null ? state.data.currency : currency
            const change = dayChange(state.data.current, state.data.previousClose)
            return (
              <div className={styles.priceBlock}>
                <div className={styles.price}>{formatPrice(shown === null ? state.data.current : shown, code)}</div>
                {change && (
                  <div className={styles.change} data-direction={change.direction}>
                    {CHANGE_ARROW[change.direction]} {Math.abs(change.percent).toFixed(2)}%
                  </div>
                )}
              </div>
            )
          })()}
          <button className={styles.removeBtn} onClick={() => onRemove(symbol)} aria-label={s.removeLabel} title={s.removeLabel}>
            ✕
          </button>
        </div>
      </div>

      {state.status === 'loading' && (
        <div className={styles.body}>
          <div className={styles.skeletonBadge} aria-hidden="true" />
          <div className={styles.skeletonChart} aria-hidden="true" />
          <span className="sr-only">{s.loading}</span>
        </div>
      )}
      {state.status === 'error' && <div className={styles.state} data-error="true">{s.errorPrefix}{state.error}</div>}

      {state.status === 'ready' && (() => {
        if (!deciles) return <div className={styles.state} data-error="true">{s.errorPrefix}—</div>
        const zone = deciles.signal || 'flat'
        const label = deciles.signal ? s[SIGNAL_LABEL_KEY[deciles.signal]] : s.signalFlat
        const convertedLow = convert(deciles.low, state.data.currency, currency, rates)
        const convertedHigh = convert(deciles.high, state.data.currency, currency, rates)
        const fxOk = convertedLow !== null && convertedHigh !== null
        return (
          <div className={styles.body}>
            <span className={styles.badge} data-zone={zone}>
              {s.band} {deciles.band}/10 · {label}
            </span>
            <DecileGauge
              prices={state.data.prices}
              ohlc={state.data.ohlc}
              timestamps={state.data.timestamps}
              current={state.data.current}
              low={deciles.low}
              high={deciles.high}
              band={deciles.band}
              chartType={chartType}
              labelHigh={formatPrice(fxOk ? convertedHigh : deciles.high, fxOk ? currency : state.data.currency)}
              labelLow={formatPrice(fxOk ? convertedLow : deciles.low, fxOk ? currency : state.data.currency)}
              s={s}
              lang={lang}
            />
            {!fxOk && currency !== state.data.currency && (
              <div className={styles.fxNote}>{s.fxUnavailable}</div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
