import { useEffect, useRef, useState } from 'react'
import { fetchQuote, QUOTE_ERROR_LABEL_KEY } from '../stockApi.js'
import { computeDeciles } from '../deciles.js'
import { convert } from '../fx.js'
import { formatPrice, formatQty, dayChange } from '../format.js'
import DecileGauge from './DecileGauge.jsx'
import KnownFor from './KnownFor.jsx'
import TagChips from './TagChips.jsx'
import TickerLogo from './TickerLogo.jsx'
import { tagHue } from '../tagColor.js'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './TickerCard.module.css'

const SIGNAL_LABEL_KEY = { buy: 'signalBuy', hold: 'signalHold', sell: 'signalSell' }
const CHANGE_ARROW = { up: '▲', down: '▼', flat: '·' }

export default function TickerCard({ symbol, range, currency, rates, chartType, tags = [], onAddTag, onRemoveTag, customBrands = [], onAddBrand, onRemoveBrand, onRemove, onStatus, refreshKey, ownedQty, onOwnedClick, highlighted, marketOpen }) {
  const { s, lang } = useLang()
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [retryNonce, setRetryNonce] = useState(0)
  const prevRefreshKey = useRef(refreshKey)
  const prevRetryNonce = useRef(retryNonce)

  useEffect(() => {
    let cancelled = false
    const isRefresh = prevRefreshKey.current !== refreshKey
    const isRetry = prevRetryNonce.current !== retryNonce
    prevRefreshKey.current = refreshKey
    prevRetryNonce.current = retryNonce
    setState({ status: 'loading', data: null, error: null })
    fetchQuote(symbol, range, { bypassCache: isRefresh || isRetry })
      .then((data) => { if (!cancelled) setState({ status: 'ready', data, error: null }) })
      .catch((err) => { if (!cancelled) setState({ status: 'error', data: null, error: s[QUOTE_ERROR_LABEL_KEY[err.code]] || err.message }) })
    return () => { cancelled = true }
  }, [symbol, range, refreshKey, retryNonce])

  const deciles = state.status === 'ready'
    ? computeDeciles({ prices: state.data.prices, current: state.data.current })
    : null
  const change = state.data ? dayChange(state.data.current, state.data.previousClose) : null

  // Reports this card's computed band/signal/change up to the Dashboard so
  // the whole watchlist can be sorted (buy-zone first, or by day change)
  // and summarized (N buy / N hold / N sell), and marks when the fetch
  // settled so a global "updated Xm ago" stays accurate.
  useEffect(() => {
    if (!onStatus) return
    if (state.status === 'ready') {
      onStatus(symbol, {
        band: deciles?.band ?? null,
        signal: deciles?.signal ?? null,
        changePercent: change?.percent ?? null,
        ts: Date.now(),
        current: state.data.current ?? null,
        currency: state.data.currency ?? null,
        name: state.data.name ?? null,
      })
    } else if (state.status === 'error') {
      onStatus(symbol, { band: null, signal: null, changePercent: null, ts: null, current: null, currency: null, name: null })
    }
  }, [state.status, deciles?.band, deciles?.signal, change?.percent]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div id={`ticker-${symbol}`} className={styles.card} data-highlighted={highlighted} style={{ '--tag-hue': tagHue(symbol) }}>
      <div className={styles.head}>
        <div className={styles.identity}>
          <TickerLogo symbol={symbol} size={36} />
          <div className={styles.titleBlock}>
            <div className={styles.symbol}>
              {symbol}
              {ownedQty != null && (
                <button
                  type="button"
                  className={styles.ownedBadge}
                  title={`${s.ownedBadgeTitle}: ${formatQty(ownedQty)}`}
                  aria-label={`${s.ownedBadgeTitle}: ${formatQty(ownedQty)}`}
                  onClick={(e) => { e.stopPropagation(); onOwnedClick?.() }}
                >
                  <Icon name="briefcase" size={10} strokeWidth={2.25} />
                </button>
              )}
            </div>
            {state.data && <div className={styles.name}>{state.data.name}</div>}
          </div>
        </div>
        <div className={styles.headRight}>
          {state.data && (() => {
            const shown = convert(state.data.current, state.data.currency, currency, rates)
            const code = shown === null ? state.data.currency : currency
            return (
              <div className={styles.priceBlock}>
                {marketOpen === false && <div className={styles.lastCloseLabel}>{s.lastCloseLabel}</div>}
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
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>

      <TagChips tags={tags} onAdd={onAddTag} onRemove={onRemoveTag} />
      <KnownFor
        symbol={symbol}
        instrumentType={state.data?.instrumentType}
        customBrands={customBrands}
        onAddBrand={onAddBrand}
        onRemoveBrand={onRemoveBrand}
      />

      {state.status === 'loading' && (
        <div className={styles.body}>
          <div className={styles.skeletonBadge} aria-hidden="true" />
          <div className={styles.skeletonChart} aria-hidden="true" />
          <span className="sr-only">{s.loading}</span>
        </div>
      )}
      {state.status === 'error' && (
        <div className={styles.state} data-error="true">
          <span>{s.errorPrefix}{state.error}</span>
          <button type="button" className={styles.retryBtn} onClick={() => setRetryNonce((n) => n + 1)}>
            {s.retry}
          </button>
        </div>
      )}

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
