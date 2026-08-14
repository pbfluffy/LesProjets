import { useEffect, useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { renderPdfToImages, importHoldingsFromImages } from '../pdfImport.js'
import styles from './ImportPdfModal.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// Upload a broker-statement PDF -> render its pages to images client-side
// -> worker extracts holdings via Workers AI vision -> review/edit the
// result here -> confirmed rows go through the same onImport (= the
// existing add/update-holding handler) as manually typing one in.
export default function ImportPdfModal({ onImport, onClose }) {
  const { s } = useLang()
  const [status, setStatus] = useState('idle') // idle | rendering | extracting
  const [progress, setProgress] = useState({ page: 0, total: 0 })
  const [error, setError] = useState('')
  const [rows, setRows] = useState(null)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleFile(file) {
    if (!file) return
    setError('')
    setRows(null)
    setStatus('rendering')
    try {
      const images = await renderPdfToImages(file, (page, total) => setProgress({ page, total }))
      setStatus('extracting')
      const result = await importHoldingsFromImages(images)
      const withSelection = (result.rows || []).map((r, i) => ({
        id: i,
        selected: true,
        symbol: r.symbol,
        qty: String(r.shares),
        avgCost: String(r.avgCost),
        currency: r.currency,
      }))
      setRows(withSelection)
    } catch (err) {
      setError(err.message)
    } finally {
      setStatus('idle')
    }
  }

  function updateRow(id, field, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function toggleAll(checked) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
  }

  function confirmImport() {
    rows.filter((r) => r.selected).forEach((r) => {
      const qtyNum = parseFloat(r.qty)
      const avgCostNum = parseFloat(r.avgCost)
      if (!r.symbol || !Number.isFinite(qtyNum) || qtyNum <= 0 || !Number.isFinite(avgCostNum) || avgCostNum < 0) return
      onImport(r.symbol, { qty: qtyNum, avgCost: avgCostNum, costCurrency: r.currency })
    })
    onClose()
  }

  const busy = status !== 'idle'
  const selectedCount = rows ? rows.filter((r) => r.selected).length : 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="import-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.title} id="import-modal-title">{s.importModalTitle}</div>

        {!rows && (
          <div className={styles.pickPanel}>
            <input
              type="file"
              accept="application/pdf"
              className={styles.fileInput}
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={busy}
            />
            {status === 'rendering' && (
              <div className={styles.statusText}>
                {interp(s.importReadingPage, { page: progress.page, total: progress.total })}
              </div>
            )}
            {status === 'extracting' && <div className={styles.statusText}>{s.importExtracting}</div>}
            {error && <div className={styles.errorText}>{s.errorPrefix}{error}</div>}
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className={styles.statusText}>{s.importEmptyResult}</div>
        )}

        {rows && rows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedCount === rows.length}
                      ref={(el) => { if (el) el.indeterminate = selectedCount > 0 && selectedCount < rows.length }}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label={s.importSelectAll}
                      title={s.importSelectAll}
                    />
                  </th>
                  <th>{s.importColSymbol}</th>
                  <th>{s.qtyLabel}</th>
                  <th>{s.avgCostLabel}</th>
                  <th>{s.costCurrencyLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={(e) => updateRow(r.id, 'selected', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        value={r.symbol}
                        onChange={(e) => updateRow(r.id, 'symbol', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInputNarrow}
                        type="number" min="0" step="any"
                        value={r.qty}
                        onChange={(e) => updateRow(r.id, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInputNarrow}
                        type="number" min="0" step="any"
                        value={r.avgCost}
                        onChange={(e) => updateRow(r.id, 'avgCost', e.target.value)}
                      />
                    </td>
                    <td>
                      <select value={r.currency} onChange={(e) => updateRow(r.id, 'currency', e.target.value)}>
                        <option value="USD">USD</option>
                        <option value="THB">THB</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.secondaryBtn} onClick={onClose}>{s.cancelBtn}</button>
          {rows && rows.length > 0 && (
            <button className={styles.saveBtn} onClick={confirmImport} disabled={selectedCount === 0}>
              {interp(s.importConfirmBtn, { n: selectedCount })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
