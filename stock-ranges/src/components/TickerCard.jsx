import { useEffect, useState } from 'react'
import { fetchQuote } from '../stockApi.js'
import { computeDeciles } from '../deciles.js'
import { convert } from '../fx.js'
import DecileGauge from './DecileGauge.jsx'
import { useLang } from '../LangContext.jsx'
import styles from './TickerCard.module.css'

const SIGNAL_LABEL_KEY = { buy: 'signalBuy', hold: 'signalHold', sell: 'signalSell' }

export default function TickerCard({ symbol, range, currency, rates, onRemove }) {
  const { s } = useLang()
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: null, error: null })
    fetchQuote(symbol, range)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data, error: null }) })
      .catch((err) => { if (!cancelled) setState({ status: 'error', data: null, error: err.message }) })
    return () => { cancelled = true }
  }, [symbol, range])

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
            return (
              <div className={styles.price}>
                {code} {(shown === null ? state.data.current : shown).toFixed(2)}
              </div>
            )
          })()}
          <button className={styles.removeBtn} onClick={() => onRemove(symbol)} aria-label={s.removeLabel} title={s.removeLabel}>
            ✕
          </button>
        </div>
      </div>

      {state.status === 'loading' && <div className={styles.state}>{s.loading}</div>}
      {state.status === 'error' && <div className={styles.state} data-error="true">{s.errorPrefix}{state.error}</div>}

      {state.status === 'ready' && (() => {
        const deciles = computeDeciles({ prices: state.data.prices, current: state.data.current })
        if (!deciles) return <div className={styles.state} data-error="true">{s.errorPrefix}—</div>
        const zone = deciles.signal || 'flat'
        const label = deciles.signal ? s[SIGNAL_LABEL_KEY[deciles.signal]] : s.signalFlat
        const convertedLow = convert(deciles.low, state.data.currency, currency, rates)
        const convertedHigh = convert(deciles.high, state.data.currency, currency, rates)
        const fxOk = convertedLow !== null && convertedHigh !== null
        return (
          <div className={styles.body}>
            <DecileGauge
              band={deciles.band}
              low={fxOk ? convertedLow : deciles.low}
              high={fxOk ? convertedHigh : deciles.high}
              currency={fxOk ? currency : state.data.currency}
              s={s}
            />
            <div className={styles.details}>
              <span className={styles.badge} data-zone={zone}>
                {s.band} {deciles.band}/10 · {label}
              </span>
              {!fxOk && currency !== state.data.currency && (
                <div className={styles.fxNote}>{s.fxUnavailable}</div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
