import { useEffect, useRef, useState } from 'react'
import { fetchQuote, QUOTE_ERROR_LABEL_KEY } from '../stockApi.js'
import { computeDeciles, largestStep, ABNORMAL_MOVE } from '../deciles.js'
import { convert } from '../fx.js'
import { formatPrice, formatQty, dayChange } from '../format.js'
import BandInfo from './BandInfo.jsx'
import DecileGauge from './DecileGauge.jsx'
import KnownFor from './KnownFor.jsx'
import PriceAlertToggle from './PriceAlertToggle.jsx'
import TagChips from './TagChips.jsx'
import TickerLogo from './TickerLogo.jsx'
import { tagHue } from '../tagColor.js'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './TickerCard.module.css'

const SIGNAL_LABEL_KEY = { buy: 'signalBuy', hold: 'signalHold', sell: 'signalSell' }
const CHANGE_ARROW = { up: '▲', down: '▼', flat: '·' }
const RANGE_LABEL_KEY = { '1d': 'range1d', '7d': 'range7d', '3mo': 'range3mo', '6mo': 'range6mo', ytd: 'rangeYtd', '1y': 'range1y', '2y': 'range2y', '5y': 'range5y' }
// Second lookback used to confirm the main one: 3 months, or 1 year when
// the main range is already 3 months.
const confirmRangeFor = (range) => (range === '3mo' ? '1y' : '3mo')

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

export default function TickerCard({
  symbol, range, currency, rates, chartType, tags = [], onAddTag, onRemoveTag, customBrands = [], onAddBrand, onRemoveBrand,
  onRemove, onStatus, refreshKey, ownedQty, onOwnedClick, highlighted, marketOpen, alertConfig, onToggleAlert,
}) {
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

  // Confirmation from a second range (shown under the band): does the
  // shorter (or longer) view put the price in the same zone?
  const [confirm, setConfirm] = useState(null) // { range, deciles } | null
  useEffect(() => {
    let cancelled = false
    setConfirm(null)
    const r2 = confirmRangeFor(range)
    fetchQuote(symbol, r2)
      .then((data) => { if (!cancelled) setConfirm({ range: r2, deciles: computeDeciles({ prices: data.prices, current: data.current }) }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [symbol, range, refreshKey])

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
            // Price in the stock's own currency (KBANK in baht, AAPL in
            // dollars); the chosen display currency appears underneath as an
            // approximate conversion when it differs.
            const converted = state.data.currency !== currency ? convert(state.data.current, state.data.currency, currency, rates) : null
            return (
              <div className={styles.priceBlock}>
                {marketOpen === false && state.data?.instrumentType !== 'CRYPTOCURRENCY' && <div className={styles.lastCloseLabel}>{s.lastCloseLabel}</div>}
                <div className={styles.price}>{formatPrice(state.data.current, state.data.currency)}</div>
                {converted !== null && <div className={styles.converted}>≈ {formatPrice(converted, currency)}</div>}
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
        return (
          <div className={styles.body}>
            <div className={styles.badgeRow}>
              <span className={styles.badge} data-zone={zone}>
                {s.band} {deciles.band}/10 · {label}
              </span>
              <BandInfo />
              {onToggleAlert && (
                <PriceAlertToggle
                  config={alertConfig}
                  onToggle={(direction, next) => onToggleAlert(symbol, range, direction, next)}
                />
              )}
            </div>
            {confirm?.deciles?.signal && deciles.signal && (() => {
              const agree = confirm.deciles.signal === deciles.signal
              return (
                <div className={styles.confirmLine} data-agree={agree} data-zone={confirm.deciles.signal}>
                  {s[RANGE_LABEL_KEY[confirm.range]]}: {s.band} {confirm.deciles.band}/10 · {s[SIGNAL_LABEL_KEY[confirm.deciles.signal]]}
                  {' — '}{agree ? s.signalConfirms : s.signalDiffers}
                </div>
              )
            })()}
            {(() => {
              const step = largestStep(state.data.prices)
              if (step.move <= ABNORMAL_MOVE) return null
              // Band measured only since the big move, when there's enough
              // history after it to mean something.
              const after = state.data.prices.slice(step.index)
              const since = after.length >= 10 ? computeDeciles({ prices: after, current: state.data.current }) : null
              const ts = state.data.timestamps?.[step.index]
              const dropped = state.data.prices[step.index] < state.data.prices[step.index - 1]
              return (
                <div className={styles.abnormalNote} role="note">
                  <Icon name="alertTriangle" size={12} />
                  <span>
                    {s.abnormalMove}
                    {since?.signal && typeof ts === 'number' && (
                      <strong className={styles.sinceMove}>
                        {interp(s.sinceMove, {
                          kind: dropped ? s.moveDrop : s.moveJump,
                          date: new Date(ts * 1000).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short' }),
                          band: since.band,
                          zone: s[SIGNAL_LABEL_KEY[since.signal]],
                        })}
                      </strong>
                    )}
                  </span>
                </div>
              )
            })()}
            <DecileGauge
              prices={state.data.prices}
              ohlc={state.data.ohlc}
              timestamps={state.data.timestamps}
              current={state.data.current}
              low={deciles.low}
              high={deciles.high}
              band={deciles.band}
              chartType={chartType}
              labelHigh={formatPrice(deciles.high, state.data.currency)}
              labelLow={formatPrice(deciles.low, state.data.currency)}
              s={s}
              lang={lang}
            />
          </div>
        )
      })()}

      {/* Tags and brands come after the band and chart — the band is what
          the card is for. Crypto has no consumer brands. */}
      <TagChips tags={tags} onAdd={onAddTag} onRemove={onRemoveTag} />
      {state.data?.instrumentType !== 'CRYPTOCURRENCY' && (
        <KnownFor
          symbol={symbol}
          instrumentType={state.data?.instrumentType}
          customBrands={customBrands}
          onAddBrand={onAddBrand}
          onRemoveBrand={onRemoveBrand}
        />
      )}
    </div>
  )
}
