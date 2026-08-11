import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { fetchQuote } from '../stockApi.js'
import { convert } from '../fx.js'
import { formatPrice } from '../format.js'
import { computeHoldingPL } from '../wallet.js'
import AddHoldingForm from './AddHoldingForm.jsx'
import HoldingCard from './HoldingCard.jsx'
import styles from './WalletView.module.css'

// A holdings list independent from the watchlist — you can watch a stock
// without owning it. Current prices are fetched with the cheapest range
// ('1d') since only the latest close/current is needed here, not a chart.
export default function WalletView({
  holdings, plans, dividends, currency, rates,
  onAddHolding, onRemoveHolding,
  onAddPlan, onMarkPlanDone, onRemovePlan,
  onAddDividend, onRemoveDividend,
}) {
  const { s } = useLang()
  const [quotes, setQuotes] = useState({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingSymbol, setEditingSymbol] = useState(null)

  const symbols = useMemo(() => Object.keys(holdings), [holdings])

  useEffect(() => {
    symbols.forEach((symbol) => {
      if (quotes[symbol]) return
      fetchQuote(symbol, '1d')
        .then((data) => setQuotes((prev) => ({ ...prev, [symbol]: { current: data.current, currency: data.currency } })))
        .catch(() => setQuotes((prev) => ({ ...prev, [symbol]: { current: null, currency: null } })))
    })
  }, [symbols]) // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    let costBasis = 0
    let marketValue = 0
    let dividendsTotal = 0
    symbols.forEach((symbol) => {
      const holding = holdings[symbol]
      const quote = quotes[symbol]
      const convertedAvgCost = convert(holding.avgCost, holding.costCurrency, currency, rates)
      const convertedCurrent = quote?.current != null ? convert(quote.current, quote.currency, currency, rates) : null
      if (convertedAvgCost === null || convertedCurrent === null) return
      const pl = computeHoldingPL({ qty: holding.qty, avgCost: convertedAvgCost, currentPrice: convertedCurrent })
      costBasis += pl.costBasis
      marketValue += pl.marketValue
    })
    dividends.forEach((d) => {
      dividendsTotal += convert(d.amount, d.currency, currency, rates) ?? 0
    })
    const unrealizedPL = marketValue - costBasis
    return { costBasis, marketValue, unrealizedPL, dividendsTotal, totalReturn: unrealizedPL + dividendsTotal }
  }, [symbols, holdings, quotes, dividends, currency, rates])

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
            <span>{s.summaryDividends}</span>
            <strong>{formatPrice(summary.dividendsTotal, currency)}</strong>
          </div>
          <div className={styles.summaryStat} data-direction={summary.totalReturn >= 0 ? 'up' : 'down'}>
            <span>{s.summaryTotalReturn}</span>
            <strong>{summary.totalReturn >= 0 ? '+' : ''}{formatPrice(summary.totalReturn, currency)}</strong>
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
            displayCurrency={currency}
            rates={rates}
            plans={plans}
            dividends={dividends}
            onEdit={startEdit}
            onRemove={onRemoveHolding}
            onAddPlan={onAddPlan}
            onMarkPlanDone={onMarkPlanDone}
            onRemovePlan={onRemovePlan}
            onAddDividend={onAddDividend}
            onRemoveDividend={onRemoveDividend}
          />
        ))}
      </div>
    </div>
  )
}
