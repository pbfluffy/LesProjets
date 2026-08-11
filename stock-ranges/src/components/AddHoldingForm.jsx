import { useState } from 'react'
import TickerSearch from './TickerSearch.jsx'
import { useLang } from '../LangContext.jsx'
import styles from './AddHoldingForm.module.css'

// Symbol entry reuses TickerSearch as-is (autocomplete + validation already
// solved there); once a symbol is picked, qty/avg-cost/currency fields
// commit the holding. Passing an existing symbol+holding pre-fills the
// fields for editing instead of adding a duplicate.
export default function AddHoldingForm({ holdings = {}, editingSymbol = null, editingHolding = null, onSave, onCancel }) {
  const { s } = useLang()
  const [symbol, setSymbol] = useState(editingSymbol)
  const [qty, setQty] = useState(editingHolding ? String(editingHolding.qty) : '')
  const [avgCost, setAvgCost] = useState(editingHolding ? String(editingHolding.avgCost) : '')
  const [costCurrency, setCostCurrency] = useState(editingHolding?.costCurrency || 'USD')

  // Picking a symbol that's already held (via search, not the explicit
  // "edit" entry point) pre-fills its existing qty/cost too — holdings are
  // keyed by symbol so saving always overwrites, never duplicates; this just
  // makes that visible instead of silently clobbering unseen values.
  function pickSymbol(picked) {
    setSymbol(picked)
    const existing = holdings[picked]
    if (existing) {
      setQty(String(existing.qty))
      setAvgCost(String(existing.avgCost))
      setCostCurrency(existing.costCurrency)
    }
  }

  function submit(e) {
    e.preventDefault()
    const qtyNum = parseFloat(qty)
    const costNum = parseFloat(avgCost)
    if (!symbol || !Number.isFinite(qtyNum) || qtyNum <= 0 || !Number.isFinite(costNum) || costNum < 0) return
    onSave(symbol, { qty: qtyNum, avgCost: costNum, costCurrency })
  }

  if (!symbol) {
    return (
      <div className={styles.panel}>
        <TickerSearch onAdd={pickSymbol} />
        <button type="button" className={styles.cancelLink} onClick={onCancel}>{s.cancelBtn}</button>
      </div>
    )
  }

  return (
    <form className={styles.panel} onSubmit={submit}>
      <div className={styles.symbolRow}>
        <span className={styles.symbol}>{symbol}</span>
        {!editingSymbol && (
          <button type="button" className={styles.changeBtn} onClick={() => setSymbol(null)}>{s.cancelBtn}</button>
        )}
      </div>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>{s.qtyLabel}</span>
          <input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus />
        </label>
        <label className={styles.field}>
          <span>{s.avgCostLabel}</span>
          <input type="number" min="0" step="any" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} required />
        </label>
        <label className={styles.field}>
          <span>{s.costCurrencyLabel}</span>
          <select value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="THB">THB</option>
          </select>
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>{s.cancelBtn}</button>
        <button type="submit" className={styles.saveBtn}>{s.saveHoldingBtn}</button>
      </div>
    </form>
  )
}
