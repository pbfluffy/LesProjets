import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { fetchQuote } from '../stockApi.js'
import { convert } from '../fx.js'
import { formatPrice } from '../format.js'
import { computeHoldingPL, projectedDividendIncome } from '../wallet.js'
import AddHoldingForm from './AddHoldingForm.jsx'
import HoldingCard from './HoldingCard.jsx'
import styles from './WalletView.module.css'

// A holdings list independent from the watchlist — you can watch a stock
// without owning it. Fetches a 2-year daily range per held symbol: enough
// history for Yahoo to report actual dividend events (used to project
// monthly/quarterly income), while `current` still gives the live price
// needed for P/L regardless of range.
export default function WalletView({
  holdings, currency, rates,
  onAddHolding, onRemoveHolding,
}) {
  const { s } = useLang()
  const [quotes, setQuotes] = useState({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingSymbol, setEditingSymbol] = useState(null)

  const symbols = useMemo(() => Object.keys(holdings), [holdings])

  useEffect(() => {
    symbols.forEach((symbol) => {
      if (quotes[symbol]) return
      fetchQuote(symbol, '2y')
        .then((data) => setQuotes((prev) => ({
          ...prev,
          [symbol]: { current: data.current, currency: data.currency, dividends: data.dividends || [] },
        })))
        .catch(() => setQuotes((prev) => ({ ...prev, [symbol]: { current: null, currency: null, dividends: [] } })))
    })
  }, [symbols]) // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    let costBasis = 0
    let marketValue = 0
    let perMonth = 0
    let perQuarter = 0
    symbols.forEach((symbol) => {
      const holding = holdings[symbol]
      const quote = quotes[symbol]
      const convertedAvgCost = convert(holding.avgCost, holding.costCurrency, currency, rates)
      const convertedCurrent = quote?.current != null ? convert(quote.current, quote.currency, currency, rates) : null
      if (convertedAvgCost !== null && convertedCurrent !== null) {
        const pl = computeHoldingPL({ qty: holding.qty, avgCost: convertedAvgCost, currentPrice: convertedCurrent })
        costBasis += pl.costBasis
        marketValue += pl.marketValue
      }
      const projected = quote ? projectedDividendIncome(quote.dividends, holding.qty) : null
      if (projected && quote.currency) {
        perMonth += convert(projected.perMonth, quote.currency, currency, rates) ?? 0
        perQuarter += convert(projected.perQuarter, quote.currency, currency, rates) ?? 0
      }
    })
    return { costBasis, marketValue, unrealizedPL: marketValue - costBasis, perMonth, perQuarter }
  }, [symbols, holdings, quotes, currency, rates])

  function startEdit(symbol) {
    setEditingSymbol(symbol)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingSymbol(null)
  }

  function handleSave(symbol, data) {
    onAddHolding(symbol, data)
    closeForm()
  }

  return (
    <div>
      {symbols.length > 0 && (
        <div className={styles.summaryStrip}>
          <div className={styles.summaryStat}>
            <span>{s.summaryCostBasis}</span>
            <strong>{formatPrice(summary.costBasis, currency)}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span>{s.summaryMarketValue}</span>
            <strong>{formatPrice(summary.marketValue, currency)}</strong>
          </div>
          <div className={styles.summaryStat} data-direction={summary.unrealizedPL >= 0 ? 'up' : 'down'}>
            <span>{s.summaryUnrealizedPL}</span>
            <strong>{summary.unrealizedPL >= 0 ? '+' : ''}{formatPrice(summary.unrealizedPL, currency)}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span>{s.estPerMonth}</span>
            <strong>{formatPrice(summary.perMonth, currency)}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span>{s.estPerQuarter}</span>
            <strong>{formatPrice(summary.perQuarter, currency)}</strong>
          </div>
        </div>
      )}

      {symbols.length === 0 && !formOpen && <div className={styles.empty}>{s.walletEmpty}</div>}

      {formOpen ? (
        <AddHoldingForm
          holdings={holdings}
          editingSymbol={editingSymbol}
          editingHolding={editingSymbol ? holdings[editingSymbol] : null}
          onSave={handleSave}
          onCancel={closeForm}
        />
      ) : (
        <button className={styles.addBtn} onClick={() => setFormOpen(true)}>{s.addHoldingBtn}</button>
      )}

      <div className={styles.list}>
        {symbols.map((symbol) => (
          <HoldingCard
            key={symbol}
            symbol={symbol}
            holding={holdings[symbol]}
            currentPrice={quotes[symbol]?.current ?? null}
            currentCurrency={quotes[symbol]?.currency ?? null}
            dividendEvents={quotes[symbol]?.dividends ?? []}
            displayCurrency={currency}
            rates={rates}
            onEdit={startEdit}
            onRemove={onRemoveHolding}
          />
        ))}
      </div>
    </div>
  )
}
