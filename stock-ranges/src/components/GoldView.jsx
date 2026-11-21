import { useEffect, useRef, useState } from 'react'
import { fetchQuote, QUOTE_ERROR_LABEL_KEY } from '../stockApi.js'
import { computeDeciles } from '../deciles.js'
import { formatPrice, dayChange } from '../format.js'
import { GOLD_SYMBOL, USDTHB_SYMBOL, toBahtGoldSeries, thaiGoldUnitPrices } from '../gold.js'
import { useLang } from '../LangContext.jsx'
import DecileGauge from './DecileGauge.jsx'
import styles from './GoldView.module.css'

const SIGNAL_LABEL_KEY = { buy: 'signalBuy', hold: 'signalHold', sell: 'signalSell' }
const CHANGE_ARROW = { up: '▲', down: '▼', flat: '·' }
const UNIT_LABEL_KEY = { baht: 'goldUnitBaht', twoSalueng: 'goldUnitTwoSalueng', salueng: 'goldUnitSalueng', gram: 'goldUnitGram' }

// The GOLD tab: world gold (GC=F, USD/oz) and an estimated Thai price per
// baht-weight of 96.5% gold, each with the same 10-band position-in-range
// gauge as a watchlist card, over the app's shared lookback. Uses only the
// existing quotes Worker (see gold.js for why the Thai price is an estimate).
export default function GoldView({ range, ranges, rangeLabelKey, onRangeChange, chartType, rates, refreshKey, inWatchlist, onAddToWatchlist }) {
  const { s, lang } = useLang()
  const [state, setState] = useState({ status: 'loading', gold: null, fx: null, error: null })
  const [retryNonce, setRetryNonce] = useState(0)
  const prevRefreshKey = useRef(refreshKey)
  const prevRetryNonce = useRef(retryNonce)

  useEffect(() => {
    let cancelled = false
    const bypassCache = prevRefreshKey.current !== refreshKey || prevRetryNonce.current !== retryNonce
    prevRefreshKey.current = refreshKey
    prevRetryNonce.current = retryNonce
    setState({ status: 'loading', gold: null, fx: null, error: null })
    // USD/THB is optional: without it the Thai price falls back to today's
    // rate from fx.js, so a failed FX fetch must not fail the whole tab.
    Promise.all([
      fetchQuote(GOLD_SYMBOL, range, { bypassCache }),
      fetchQuote(USDTHB_SYMBOL, range, { bypassCache }).catch(() => null),
    ])
      .then(([gold, fx]) => { if (!cancelled) setState({ status: 'ready', gold, fx, error: null }) })
      .catch((err) => { if (!cancelled) setState({ status: 'error', gold: null, fx: null, error: s[QUOTE_ERROR_LABEL_KEY[err.code]] || err.message }) })
    return () => { cancelled = true }
  }, [range, refreshKey, retryNonce])

  const { gold, fx } = state
  const thai = gold ? toBahtGoldSeries(gold, fx, rates?.USD ?? null) : null
  const thbPerUsd = Number.isFinite(fx?.current) ? fx.current : (rates?.USD ?? null)

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <span className={styles.controlPair}>
          <label htmlFor="gold-lookback">{s.lookbackLabel}</label>
          <select id="gold-lookback" value={range} onChange={(e) => onRangeChange(e.target.value)}>
            {ranges.map((r) => <option key={r} value={r}>{s[rangeLabelKey[r]]}</option>)}
          </select>
        </span>
        {!inWatchlist && (
          <button type="button" className={styles.addBtn} onClick={() => onAddToWatchlist(GOLD_SYMBOL)}>
            + {s.goldAddToWatchlist}
          </button>
        )}
      </div>

      {state.status === 'loading' && <div className={styles.card}><div className={styles.muted}>{s.goldLoading}</div></div>}

      {state.status === 'error' && (
        <div className={styles.card}>
          <div className={styles.error}>{state.error}</div>
          <button type="button" className={styles.retryBtn} onClick={() => setRetryNonce((n) => n + 1)}>{s.retry}</button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          {thai && (
            <GoldCard
              title={s.goldThaiTitle}
              unit={s.goldThaiUnit}
              currency="THB"
              priceUnit={s.goldPerBaht}
              series={thai}
              extra={<ThaiUnits pricePerBaht={thai.current} s={s} />}
              sub={Number.isFinite(thbPerUsd) ? `${s.goldFxLabel} ${thbPerUsd.toFixed(2)}` : null}
              chartType={chartType}
              s={s}
              lang={lang}
            />
          )}
          <GoldCard
            title={s.goldWorldTitle}
            unit={s.goldWorldUnit}
            currency={gold.currency || 'USD'}
            priceUnit={s.goldPerOz}
            series={gold}
            sub={GOLD_SYMBOL}
            chartType={chartType}
            s={s}
            lang={lang}
          />
          <p className={styles.note}>{s.goldEstimateNote}</p>
        </>
      )}
    </div>
  )
}

// The Thai price in the units Thai gold shops use: per baht-weight, per
// 2 salueng (½ baht) and 1 salueng (¼ baht), plus per gram. Whole baht —
// shop prices are never quoted in satang.
function ThaiUnits({ pricePerBaht, s }) {
  const rows = thaiGoldUnitPrices(pricePerBaht)
  if (!rows.length) return null
  return (
    <dl className={styles.units} aria-label={s.goldUnitsTitle}>
      {rows.map(({ key, price }) => (
        <div key={key} className={styles.unitRow}>
          <dt>{s[UNIT_LABEL_KEY[key]]}</dt>
          <dd>THB {Math.round(price).toLocaleString('en-US')}</dd>
        </div>
      ))}
    </dl>
  )
}

function GoldCard({ title, unit, currency, priceUnit, series, sub, extra, chartType, s, lang }) {
  const deciles = computeDeciles({ prices: series.prices, current: series.current })
  const change = dayChange(series.current, series.previousClose)
  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.unit}>{unit}{sub && <> · <span className={styles.mono}>{sub}</span></>}</div>
        </div>
        {deciles && (
          <span className={styles.badge} data-zone={deciles.signal || 'flat'}>
            {s.band} {deciles.band}/10{deciles.signal && <> · {s[SIGNAL_LABEL_KEY[deciles.signal]]}</>}
          </span>
        )}
      </div>
      <div className={styles.priceLine}>
        <span className={styles.price}>{formatPrice(series.current, currency)}</span>
        {priceUnit && <span className={styles.priceUnit}>{priceUnit}</span>}
        {change && (
          <span className={styles.change} data-direction={change.direction}>
            {CHANGE_ARROW[change.direction]} {Math.abs(change.percent).toFixed(2)}%
          </span>
        )}
      </div>
      {extra}
      {deciles && (
        <DecileGauge
          prices={series.prices}
          ohlc={series.ohlc}
          timestamps={series.timestamps}
          current={series.current}
          low={deciles.low}
          high={deciles.high}
          band={deciles.band}
          chartType={chartType}
          labelHigh={formatPrice(deciles.high, currency)}
          labelLow={formatPrice(deciles.low, currency)}
          s={s}
          lang={lang}
        />
      )}
    </section>
  )
}
