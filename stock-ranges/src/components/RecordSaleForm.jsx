import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import styles from './AddHoldingForm.module.css'

function localToday() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Records a sale of (part of) an existing holding — same panel look as
// AddHoldingForm (shares its stylesheet). The realized gain is computed
// later from the avg cost snapshotted into the log entry by App.jsx's
// recordSale, so this only collects what actually happened: how many were
// sold, at what price/currency, and when.
export default function RecordSaleForm({ symbol, holding, defaultPrice, defaultCurrency, logFull, onSave, onCancel }) {
  const { s } = useLang()
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState(defaultPrice != null ? String(Math.round(defaultPrice * 10000) / 10000) : '')
  // The prefilled price is in the quote's own currency, so that currency must
  // be selectable (a EUR/GBP/HKD stock would otherwise be recorded as USD).
  const initialCurrency = defaultCurrency || holding.costCurrency || 'USD'
  const currencyOptions = [...new Set(['USD', 'THB', initialCurrency])]
  const [saleCurrency, setSaleCurrency] = useState(initialCurrency)
  const [date, setDate] = useState(localToday())
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (logFull) {
      setError(s.saleLogFull)
      return
    }
    const qtyNum = parseFloat(qty)
    const priceNum = parseFloat(price)
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError(s.invalidQtyError)
      return
    }
    if (qtyNum > holding.qty + 1e-9) {
      setError(s.saleTooManyError)
      return
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError(s.invalidSalePriceError)
      return
    }
    if (!date || date > localToday()) {
      setError(s.invalidSaleDateError)
      return
    }
    setError('')
    onSave(symbol, { qty: qtyNum, price: priceNum, currency: saleCurrency, date })
  }

  return (
    <form className={styles.panel} onSubmit={submit}>
      <div className={styles.symbolRow}>
        <span className={styles.symbol}>{symbol}</span>
        <span className={styles.changeBtn} style={{ textDecoration: 'none' }}>
          {s.saleHeldLabel}: {holding.qty}
        </span>
      </div>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>{s.saleQtyLabel}</span>
          <input
            type="number" min="0" step="any" value={qty}
            onChange={(e) => { setQty(e.target.value); setError('') }}
            required autoFocus
          />
        </label>
        <label className={styles.field}>
          <span>{s.salePriceLabel}</span>
          <input
            type="number" min="0" step="any" value={price}
            onChange={(e) => { setPrice(e.target.value); setError('') }}
            required
          />
        </label>
        <label className={styles.field}>
          <span>{s.costCurrencyLabel}</span>
          <select value={saleCurrency} onChange={(e) => setSaleCurrency(e.target.value)}>
            {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>{s.saleDateLabel}</span>
          <input
            type="date" value={date} max={localToday()}
            onChange={(e) => { setDate(e.target.value); setError('') }}
            required
          />
        </label>
      </div>
      {(error || logFull) && <div className={styles.error}>{error || s.saleLogFull}</div>}
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} onClick={() => setQty(String(holding.qty))}>
          {s.saleSellAll}
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>{s.cancelBtn}</button>
        <button type="submit" className={styles.saveBtn}>{s.saleSaveBtn}</button>
      </div>
    </form>
  )
}
