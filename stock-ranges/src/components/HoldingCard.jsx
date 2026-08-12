import { useLang } from '../LangContext.jsx'
import { convert } from '../fx.js'
import { formatPrice, formatQty } from '../format.js'
import { computeHoldingPL, projectedDividendIncome, groupDividendsByPeriod, inferDividendCadence } from '../wallet.js'
import TickerLogo from './TickerLogo.jsx'
import { tagHue } from '../tagColor.js'
import styles from './HoldingCard.module.css'

export default function HoldingCard({
  symbol, holding, currentPrice, currentCurrency, dividendEvents, loading, displayCurrency, rates,
  onEdit, onRemove,
}) {
  const { s } = useLang()

  const convertedAvgCost = convert(holding.avgCost, holding.costCurrency, displayCurrency, rates)
  const convertedCurrent = typeof currentPrice === 'number' ? convert(currentPrice, currentCurrency, displayCurrency, rates) : null
  const fxOk = convertedAvgCost !== null && convertedCurrent !== null
  const pl = fxOk ? computeHoldingPL({ qty: holding.qty, avgCost: convertedAvgCost, currentPrice: convertedCurrent }) : null

  const projected = projectedDividendIncome(dividendEvents, holding.qty)
  const projectedOk = fxOk && projected && projected.eventCount > 0
  const cadence = projectedOk ? inferDividendCadence(dividendEvents) : 'quarter'
  const periods = projectedOk ? groupDividendsByPeriod(dividendEvents, holding.qty, cadence) : []
  const cv = (amount) => convert(amount, currentCurrency, displayCurrency, rates)

  return (
    <div className={styles.card} style={{ '--tag-hue': tagHue(symbol) }}>
      <div className={styles.head}>
        <TickerLogo symbol={symbol} size={32} />
        <div className={styles.titleBlock}>
          <div className={styles.symbol}>{symbol}</div>
          <div className={styles.qtyLine}>{formatQty(holding.qty)} @ {formatPrice(holding.avgCost, holding.costCurrency)}</div>
        </div>
        <div className={styles.headRight}>
          {pl && (
            <div className={styles.plBlock} data-direction={pl.pl >= 0 ? 'up' : 'down'}>
              <div className={styles.plValue}>{pl.pl >= 0 ? '+' : ''}{formatPrice(pl.pl, displayCurrency)}</div>
              {pl.plPercent !== null && (
                <div className={styles.plPercent}>{pl.pl >= 0 ? '+' : ''}{pl.plPercent.toFixed(2)}%</div>
              )}
            </div>
          )}
          <button className={styles.iconBtn} onClick={() => onEdit(symbol)} aria-label={s.saveHoldingBtn} title={s.saveHoldingBtn}>✎</button>
          <button className={styles.iconBtn} onClick={() => onRemove(symbol)} aria-label={s.removeHoldingLabel} title={s.removeHoldingLabel}>✕</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.statsRow}>
          <div className={styles.skeletonStat} aria-hidden="true" />
          <div className={styles.skeletonStat} aria-hidden="true" />
          <div className={styles.skeletonStat} aria-hidden="true" />
          <span className="sr-only">{s.loading}</span>
        </div>
      ) : fxOk ? (
        <div className={styles.statsRow}>
          <div className={styles.stat}><span>{s.currentPriceLabel}</span><strong>{formatPrice(convertedCurrent, displayCurrency)}</strong></div>
          <div className={styles.stat}><span>{s.summaryCostBasis}</span><strong>{formatPrice(pl.costBasis, displayCurrency)}</strong></div>
          <div className={styles.stat}><span>{s.summaryMarketValue}</span><strong>{formatPrice(pl.marketValue, displayCurrency)}</strong></div>
        </div>
      ) : (
        <div className={styles.fxNote}>{s.fxUnavailable}</div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span>{s.dividendSectionTitle}</span>
        </div>
        {loading ? (
          <div className={styles.statsRow}>
            <div className={styles.skeletonStat} aria-hidden="true" />
            <div className={styles.skeletonStat} aria-hidden="true" />
            <div className={styles.skeletonStat} aria-hidden="true" />
          </div>
        ) : projectedOk ? (
          <>
            <div className={styles.statsRow} data-direction="up">
              <div className={styles.stat}><span>{s.estPerMonth}</span><strong>{formatPrice(cv(projected.perMonth), displayCurrency)}</strong></div>
              <div className={styles.stat}><span>{s.estPerQuarter}</span><strong>{formatPrice(cv(projected.perQuarter), displayCurrency)}</strong></div>
              <div className={styles.stat}><span>{s.trailingTwelveMonth}</span><strong>{formatPrice(cv(projected.trailingTwelveMonth), displayCurrency)}</strong></div>
            </div>
            <ul className={styles.scheduleList}>
              {periods.map((p) => (
                <li key={p.period}>
                  <span>{p.period}</span>
                  <span>{formatPrice(cv(p.amount), displayCurrency)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className={styles.emptyNote}>{s.noDividendHistory}</div>
        )}
      </div>
    </div>
  )
}
