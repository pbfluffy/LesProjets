import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { QUOTE_ERROR_LABEL_KEY } from '../stockApi.js'
import { convert } from '../fx.js'
import { formatPrice, formatQty, maskPrice } from '../format.js'
import { computeHoldingPL, projectedDividendIncome, groupDividendsByPeriod, inferDividendCadence } from '../wallet.js'
import TickerLogo from './TickerLogo.jsx'
import KnownFor from './KnownFor.jsx'
import TagChips from './TagChips.jsx'
import { tagHue } from '../tagColor.js'
import Icon from './Icon.jsx'
import styles from './HoldingCard.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

export default function HoldingCard({
  symbol, holding, name, currentPrice, currentCurrency, instrumentType, dividendEvents, loading, quoteError, displayCurrency, rates,
  onEdit, onRemove, masked, watched, onWatchedClick, highlighted, tags = [], onAddTag, onRemoveTag,
  customBrands = [], onAddBrand, onRemoveBrand, marketOpen,
}) {
  const { s } = useLang()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [dividendsOpen, setDividendsOpen] = useState(false)
  const isCrypto = instrumentType === 'CRYPTOCURRENCY'
  const mp = (value, currency) => (masked ? maskPrice(currency) : formatPrice(value, currency))

  const convertedAvgCost = convert(holding.avgCost, holding.costCurrency, displayCurrency, rates)
  const convertedCurrent = typeof currentPrice === 'number' ? convert(currentPrice, currentCurrency, displayCurrency, rates) : null
  const fxOk = convertedAvgCost !== null && convertedCurrent !== null
  const pl = fxOk ? computeHoldingPL({ qty: holding.qty, avgCost: convertedAvgCost, currentPrice: convertedCurrent }) : null

  const projected = projectedDividendIncome(dividendEvents, holding.qty)
  const projectedOk = fxOk && projected && projected.eventCount > 0
  const cadence = projectedOk ? inferDividendCadence(dividendEvents) : 'quarter'
  const periods = projectedOk ? groupDividendsByPeriod(dividendEvents, holding.qty, cadence) : []
  const cv = (amount) => convert(amount, currentCurrency, displayCurrency, rates)
  const convertedAnnualDividend = projectedOk ? cv(projected.trailingTwelveMonth) : null
  const yieldPercent = (projectedOk && pl && pl.marketValue > 0 && convertedAnnualDividend !== null)
    ? (convertedAnnualDividend / pl.marketValue) * 100
    : null

  return (
    <div id={`holding-${symbol}`} className={styles.card} data-highlighted={highlighted} data-crypto={isCrypto} style={{ '--tag-hue': tagHue(symbol) }}>
      <div className={styles.head}>
        <div className={styles.identity}>
          <TickerLogo symbol={symbol} size={36} />
          <div className={styles.titleBlock}>
            <div className={styles.symbol}>
              {symbol}
              {watched && (
                <button
                  type="button"
                  className={styles.watchedBadge}
                  title={s.watchedBadgeTitle}
                  aria-label={s.watchedBadgeTitle}
                  onClick={(e) => { e.stopPropagation(); onWatchedClick?.() }}
                >
                  <Icon name="eye" size={10} strokeWidth={2.25} />
                </button>
              )}
            </div>
            {name && <div className={styles.name}>{name}</div>}
          </div>
        </div>
        <div className={styles.headRight}>
          <button className={styles.iconBtn} onClick={() => onEdit(symbol)} aria-label={s.editHoldingLabel} title={s.editHoldingLabel}><Icon name="edit" size={13} /></button>
          <button className={styles.iconBtn} onClick={() => onRemove(symbol)} aria-label={s.removeHoldingLabel} title={s.removeHoldingLabel}><Icon name="x" size={14} /></button>
        </div>
      </div>
      {/* Second line, full card width: quantity @ cost on the left, P/L on
          the right — on a phone these used to share the first line with the
          symbol and wrap across three lines. */}
      <div className={styles.subLine}>
        <div className={styles.qtyLine}>{formatQty(holding.qty)} @ {mp(holding.avgCost, holding.costCurrency)}</div>
        {pl && (
          <div className={styles.plBlock} data-direction={pl.pl >= 0 ? 'up' : 'down'}>
            <span className={styles.plValue}>{masked ? maskPrice(displayCurrency) : `${pl.pl >= 0 ? '+' : ''}${formatPrice(pl.pl, displayCurrency)}`}</span>
            {pl.plPercent !== null && (
              <span className={styles.plPercent}>{pl.pl >= 0 ? '+' : ''}{pl.plPercent.toFixed(2)}%</span>
            )}
          </div>
        )}
      </div>

      <TagChips tags={tags} onAdd={onAddTag} onRemove={onRemoveTag} />
      {/* Crypto has no consumer brands (and the empty-state note says
          "this stock"), so it skips the "known for" box altogether. */}
      {!isCrypto && (
        <KnownFor
          symbol={symbol}
          instrumentType={instrumentType}
          customBrands={customBrands}
          onAddBrand={onAddBrand}
          onRemoveBrand={onRemoveBrand}
        />
      )}

      {loading ? (
        <div className={styles.statsRow}>
          <div className={styles.skeletonStat} aria-hidden="true" />
          <div className={styles.skeletonStat} aria-hidden="true" />
          <div className={styles.skeletonStat} aria-hidden="true" />
          <span className="sr-only">{s.loading}</span>
        </div>
      ) : quoteError ? (
        <div className={styles.fxNote}>{s[QUOTE_ERROR_LABEL_KEY[quoteError]] || quoteError}</div>
      ) : fxOk ? (
        <div className={styles.statsRow}>
          <div className={styles.stat}><span>{marketOpen === false && !isCrypto ? s.lastCloseLabel : s.currentPriceLabel}</span><strong>{formatPrice(convertedCurrent, displayCurrency)}</strong></div>
          <div className={styles.stat}><span>{s.summaryCostBasis}</span><strong>{mp(pl.costBasis, displayCurrency)}</strong></div>
          <div className={styles.stat}><span>{s.summaryMarketValue}</span><strong>{mp(pl.marketValue, displayCurrency)}</strong></div>
        </div>
      ) : (
        <div className={styles.fxNote}>{s.fxUnavailable}</div>
      )}

      {!isCrypto && (
      <div className={styles.section}>
        {/* Collapsed by default to one summary line (≈ per month · yield);
            tap to expand the full breakdown + history. Keeps each card to
            roughly half a phone screen instead of a whole one. */}
        {projectedOk && !loading ? (
          <button
            type="button"
            className={styles.dividendSummary}
            onClick={() => setDividendsOpen((v) => !v)}
            aria-expanded={dividendsOpen}
          >
            <span>
              {interp(s.dividendSummary, { amount: mp(cv(projected.perMonth), displayCurrency) })}
              {yieldPercent !== null && ` · ${yieldPercent.toFixed(2)}%`}
            </span>
            <span className={styles.historyChevron} data-open={dividendsOpen}><Icon name="chevronDown" size={12} strokeWidth={2.5} /></span>
          </button>
        ) : (
          <div className={styles.sectionHead}>
            <span>{s.dividendSectionTitle}</span>
          </div>
        )}
        {loading ? (
          <div className={styles.statsRow}>
            <div className={styles.skeletonStat} aria-hidden="true" />
            <div className={styles.skeletonStat} aria-hidden="true" />
            <div className={styles.skeletonStat} aria-hidden="true" />
          </div>
        ) : projectedOk ? (dividendsOpen && (
          <>
            <div className={styles.statsRow} data-direction="up">
              <div className={styles.stat}><span>{s.estPerMonth}</span><strong>{mp(cv(projected.perMonth), displayCurrency)}</strong></div>
              <div className={styles.stat}><span>{s.estPerQuarter}</span><strong>{mp(cv(projected.perQuarter), displayCurrency)}</strong></div>
              <div className={styles.stat}><span>{s.trailingTwelveMonth}</span><strong>{mp(cv(projected.trailingTwelveMonth), displayCurrency)}</strong></div>
              {yieldPercent !== null && (
                <div className={styles.stat}><span>{s.dividendYieldLabel}</span><strong>{yieldPercent.toFixed(2)}%</strong></div>
              )}
            </div>
            <button
              type="button"
              className={styles.historyToggle}
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
            >
              {historyOpen ? s.hideHistory : s.showHistory} ({periods.length})
              <span className={styles.historyChevron} data-open={historyOpen}><Icon name="chevronDown" size={12} strokeWidth={2.5} /></span>
            </button>
            {historyOpen && (
              <ul className={styles.scheduleList}>
                {periods.map((p) => (
                  <li key={p.period}>
                    <span>{p.period}</span>
                    <span>{mp(cv(p.amount), displayCurrency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )) : (
          <div className={styles.emptyNote}>{s.noDividendHistory}</div>
        )}
      </div>
      )}
    </div>
  )
}
