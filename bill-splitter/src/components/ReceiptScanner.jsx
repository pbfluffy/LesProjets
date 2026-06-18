import { useRef, useState } from 'react'
import { useLang } from '../LangContext'
import { normaliseCurrency } from '../currencies'
import styles from './ReceiptScanner.module.css'
import {
  CURRENCY_FLAGS, SCAN_CAP, SCAN_KEY,
  getScanCount, bumpScanCount, localizeError, compressImage, scanReceipt,
} from './receiptScanUtils'


// Mirrors Nutritions PhotoTab BUG-02 Leak B fix — wrap object URL in try/finally
// so it's revoked even if Image.onerror fires or drawImage/toBlob throws.


// Map free-form English error strings from the worker to localized UI text.
// Mirrors the Nutritions BUG-07 fix.


// Simple {placeholder} interpolation matching how the rest of the app uses LangContext strings.
function format(template, vars) {
  if (typeof template !== 'string') return ''
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  )
}

export default function ReceiptScanner({
  onAddItems,
  onSetBillName,
  onSetVat,
  onSetServiceCharge,
  onSetServiceChargeRate,
  onSetCurrency,
}) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState(null)
  const [vatDetected, setVatDetected] = useState(false)
  const [scRate, setScRate] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [merchant, setMerchant] = useState('')
  const [merchantOriginal, setMerchantOriginal] = useState('')
  const [merchantEng, setMerchantEng] = useState('')
  const [detectedCurrency, setDetectedCurrency] = useState(null)
  const [capReached, setCapReached] = useState(false)
  const fileRef = useRef(null)
  // Monotonic request id — same pattern as Nutritions PhotoTab BUG-04 fix.
  const requestIdRef = useRef(0)

  function reset() {
    requestIdRef.current++
    setOpen(false)
    setLoading(false)
    setError(null)
    setItems(null)
    setVatDetected(false)
    setScRate(null)
    setConfidence(null)
    setMerchant('')
    setMerchantOriginal('')
    setMerchantEng('')
    setDetectedCurrency(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (getScanCount() >= SCAN_CAP) {
      setCapReached(true)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setItems(null)
    setOpen(true)
    try {
      const base64 = await compressImage(f)
      const r = await scanReceipt(base64)
      if (reqId !== requestIdRef.current) return
      if (r.error) throw new Error(r.error)
      const rawItems = Array.isArray(r.items) ? r.items : []
      const cleanItems = rawItems
        .filter(
          (it) =>
            it &&
            typeof it.name === 'string' &&
            it.name.trim() &&
            Number.isFinite(Number(it.price)),
        )
        .map((it) => {
          const engName = String(it.name).slice(0, 80)
          const origName =
            it.originalName && typeof it.originalName === 'string' && it.originalName.trim()
              ? String(it.originalName).slice(0, 80)
              : null
          return {
            name: engName,
            engName,
            originalName: origName,
            price: String(it.price),
          }
        })
      if (cleanItems.length === 0) throw new Error('no items')
      bumpScanCount()
      setItems(cleanItems)
      setVatDetected(!!r.vatDetected)
      setScRate(
        Number.isFinite(Number(r.serviceChargeRate)) && Number(r.serviceChargeRate) > 0
          ? Number(r.serviceChargeRate)
          : null,
      )
      setConfidence(
        ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'medium',
      )
      const engMerch = typeof r.merchantName === 'string' ? r.merchantName.trim().slice(0, 60) : ''
      setMerchant(engMerch)
      setMerchantEng(engMerch)
      setMerchantOriginal(
        typeof r.merchantOriginal === 'string' ? r.merchantOriginal.trim().slice(0, 60) : '',
      )
      const detCurrency = normaliseCurrency(r.currency)
      setDetectedCurrency(detCurrency)
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      const msg = err?.message || String(err)
      setError(msg === 'no items' ? t.receiptErrNoItems : localizeError(msg, t))
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function updateItem(idx, field, value) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    )
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function commit() {
    if (!items?.length) return
    const clean = items
      .map((it) => ({ name: it.name.trim(), price: it.price }))
      .filter(
        (it) =>
          it.name && Number.isFinite(Number(it.price)) && Number(it.price) > 0,
      )
    if (clean.length === 0) {
      setError(t.receiptErrNoItems)
      return
    }
    onAddItems(clean)
    if (vatDetected && (!detectedCurrency || detectedCurrency === 'THB')) onSetVat(true)
    if (scRate !== null && scRate > 0) {
      onSetServiceCharge(true)
      onSetServiceChargeRate(String(scRate))
    }
    if (merchant.trim()) onSetBillName?.(merchant.trim())
    if (detectedCurrency && onSetCurrency) onSetCurrency(detectedCurrency)
    reset()
  }

  const confLabel =
    confidence === 'high'
      ? t.receiptConfHigh
      : confidence === 'low'
      ? t.receiptConfLow
      : t.receiptConfMedium

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className={styles.hiddenFile}
      />
      <button
        type="button"
        className={styles.scanBtn}
        onClick={() => fileRef.current?.click()}
        disabled={loading}
      >
        {t.receiptScan}
      </button>
      {capReached && <div className={styles.capWarn}>{t.receiptCapReached}</div>}
      {open && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) reset()
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t.receiptModalTitle}</h3>
              {!loading && (
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={reset}
                  aria-label={t.receiptCancel}
                >
                  ×
                </button>
              )}
            </div>

            <div className={styles.modalBody}>
              {loading && <p className={styles.loading}>{t.receiptScanning}</p>}
              {error && <p className={styles.error}>{error}</p>}

              {!loading && !error && items && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>{t.receiptBillName}</div>
                    <input
                      type="text"
                      className={styles.itemName}
                      style={{ width: '100%' }}
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder={t.receiptBillName}
                      maxLength={60}
                      aria-label={t.receiptBillName}
                    />
                    {merchantOriginal && (
                      <div className={styles.altChips}>
                        <button type="button" className={`${styles.altChip} ${merchant === merchantEng ? styles.altChipActive : ''}`} onClick={() => setMerchant(merchantEng)}>{merchantEng}</button>
                        <button type="button" className={`${styles.altChip} ${merchant === merchantOriginal ? styles.altChipActive : ''}`} onClick={() => setMerchant(merchantOriginal)}>{merchantOriginal}</button>
                      </div>
                    )}
                  </div>
                  {confidence === 'low' && (
                    <div className={styles.lowConfWarn}>{t.receiptLowConfWarn}</div>
                  )}
                  <p className={styles.confidence}>
                    {format(t.receiptConfidence, { level: confLabel })}
                  </p>
                  {(vatDetected || (scRate !== null && scRate > 0)) && (
                    <div className={styles.detected}>
                      <span className={styles.detectedLabel}>{t.receiptDetected}</span>
                      {vatDetected && <span className={styles.badge}>{t.receiptVat}</span>}
                      {scRate !== null && scRate > 0 && (
                        <span className={styles.badge}>
                          {format(t.receiptSvc, { rate: scRate })}
                        </span>
                      )}
                    </div>
                  )}
                  {detectedCurrency && detectedCurrency !== 'THB' && (
                    <div className={styles.currencyRow}>
                      <span className={styles.detectedLabel}>{t.receiptCurrency ?? 'Currency'}:</span>
                      <span className={styles.currencyPill}>
                        {CURRENCY_FLAGS[detectedCurrency] ?? '🏳️'} {detectedCurrency}
                        <button type="button" className={styles.currencyPillDismiss} onClick={() => setDetectedCurrency('THB')} aria-label="Dismiss">×</button>
                      </span>
                    </div>
                  )}
                  <ul className={styles.itemList}>
                    {items.map((it, i) => (
                      <li key={i} className={styles.item}>
                        <div className={styles.itemTopRow}>
                          <input
                            type="text"
                            className={styles.itemName}
                            value={it.name}
                            onChange={(e) => updateItem(i, 'name', e.target.value)}
                            placeholder={t.receiptItemNamePlaceholder}
                          />
                          <input
                            type="number"
                            className={styles.itemPrice}
                            value={it.price}
                            onChange={(e) => updateItem(i, 'price', e.target.value)}
                            placeholder={t.receiptItemPricePlaceholder}
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                          />
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => removeItem(i)}
                            aria-label={t.receiptRemoveItem}
                            title={t.receiptRemoveItem}
                          >
                            ×
                          </button>
                        </div>
                        {it.originalName && (
                          <div className={styles.altChips}>
                            <button type="button" className={`${styles.altChip} ${it.name === it.engName ? styles.altChipActive : ''}`} onClick={() => updateItem(i, 'name', it.engName)}>{it.engName}</button>
                            <button type="button" className={`${styles.altChip} ${it.name === it.originalName ? styles.altChipActive : ''}`} onClick={() => updateItem(i, 'name', it.originalName)}>{it.originalName}</button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className={styles.modalActions}>
              {!loading && items && items.length > 0 && (
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={commit}
                >
                  {format(t.receiptAddItems, { n: items.length })}
                </button>
              )}
              {!loading && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={reset}
                >
                  {t.receiptCancel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
