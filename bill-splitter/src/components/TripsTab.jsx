/**
 * TripsTab — Trip mode UI (#128)
 *
 * Views:
 *   'list'   — all trips
 *   'detail' — single trip (bills + summary + settlement)
 *   'new'    — create trip form
 *   'edit'   — edit trip name/members/currency
 */
import { useState, useRef, useEffect } from 'react'
import { useLang } from '../LangContext'
import { useTripsStore, calcBillResult } from '../hooks/useTripsStore'
import Avatar from './Avatar'
import styles from './TripsTab.module.css'
import { compressImage, scanReceipt, localizeError, getScanCount, bumpScanCount, SCAN_CAP, CURRENCY_FLAGS } from './receiptScanUtils'
import { ShareIcon } from './icons'
import { buildShareUrl, createShortLink, shareLink } from '../share'
import { normaliseCurrency } from '../currencies'

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAmount(n, currency = 'THB') {
  const sym = { THB:'฿', KRW:'₩', JPY:'¥', USD:'$', EUR:'€', SGD:'S$', HKD:'HK$', GBP:'£', AUD:'A$', CNY:'¥' }[currency] ?? currency
  const decimals = (currency === 'KRW' || currency === 'JPY') ? 0 : 2
  return `${sym}${Number(n).toFixed(decimals)}`
}

// ── Trip form (new + edit) ──────────────────────────────────────────────────
function TripForm({ initial, onSave, onCancel, title }) {
  const { t } = useLang()
  const [name, setName] = useState(initial?.name ?? '')

  return (
    <div className={styles.form}>
      <h2 className={styles.formTitle}>{title}</h2>
      <label className={styles.label}>{t.tripName ?? 'Trip name'}</label>
      <input
        className={styles.input}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name)}
        placeholder={t.tripNamePlaceholder ?? 'e.g. Korea June 2026'}
        maxLength={60}
        autoFocus
      />
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
        {t.tripMembersAutoHint ?? 'Members and currency are detected automatically from your bills.'}
      </div>
      <div className={styles.formActions}>
        <button className={styles.saveBtn} onClick={() => { if (name.trim()) onSave(name) }} disabled={!name.trim()}>
          {title === 'Edit Trip' ? (t.tripSave ?? 'Save') : (t.tripCreate ?? 'Create trip')}
        </button>
        <button className={styles.cancelBtn} onClick={onCancel}>{t.receiptCancel}</button>
      </div>
    </div>
  )
}

// ── Settlement + summary section ────────────────────────────────────────────
function TripSummarySection({ trip, summary, rate, rates, rateLoading, onConvertToggle, convOwed, convPaid, mixedConv }) {
  const { t } = useLang()
  if (!summary) return null
  if (!trip.billIds.length) return null
  if (!summary.hasData) return (
    <div className={styles.summarySection}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>
        {t.tripSummaryNoData ?? 'Bill data unavailable — bills were deleted from history'}
      </div>
    </div>
  )

  const hasOwedData = trip.members.some(m => (summary.owed[m] ?? 0) > 0)
  const isTHB = summary.currency === 'THB'
  const orig = (n) => fmtAmount(n, summary.currency)

  // convOwed/convPaid/mixedConv passed down from TripDetail (already computed there)
  // so share buttons and TripSummarySection both use the same values
  const convSettlements = (() => {
    if (!summary.hasPayers) return []
    const net = {}
    trip.members.forEach(m => { net[m] = (convPaid[m] || 0) - (convOwed[m] || 0) })
    const creditors = Object.entries(net).filter(([, v]) => v > 0.5).map(([m, v]) => ({ m, v }))
    const debtors   = Object.entries(net).filter(([, v]) => v < -0.5).map(([m, v]) => ({ m, v: -v }))
    creditors.sort((a, b) => b.v - a.v); debtors.sort((a, b) => b.v - a.v)
    const result = []; let ci = 0, di = 0
    while (ci < creditors.length && di < debtors.length) {
      const amount = Math.min(creditors[ci].v, debtors[di].v)
      if (amount > 0.5) result.push({ from: debtors[di].m, to: creditors[ci].m, amount })
      creditors[ci].v -= amount; debtors[di].v -= amount
      if (creditors[ci].v < 0.5) ci++; if (debtors[di].v < 0.5) di++
    }
    return result
  })()
  const _converted = (rates && !isTHB) || (rate && !isTHB)
  const displaySettlements = _converted ? convSettlements : summary.settlements
  const displayCurrency = _converted ? 'THB' : summary.currency

  return (
    <div className={styles.summarySection}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className={styles.summaryTitle} style={{ margin: 0 }}>{t.tripSummaryTitle ?? 'Summary'}</div>
        {!isTHB && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {summary.mixedCurrencies && (
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.tripMixedCurrencies ?? '⚠️ Mixed currencies'}</span>
            )}
            <button
              onClick={onConvertToggle}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 12,
                border: '0.5px solid var(--color-border)',
                background: rate ? 'var(--color-text)' : 'var(--color-surface)',
                color: rate ? 'var(--color-bg)' : 'var(--color-text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              }}
            >
              {rateLoading ? '…' : rates ? (rate ? `1 ${summary.currency} = ฿${rate.toFixed(2)}` : `฿ loaded`) : (t.tripConvertBtn ?? 'Convert to ฿')}
            </button>
          </div>
        )}
      </div>

      {/* For mixed-currency trips without rates: raw summary.owed is meaningless (adds different currencies).
           Show a prompt to load rates instead of wrong numbers. */}
      {summary.mixedCurrencies && !rates
        ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              💱 {t.tripConvertHint ?? 'Tap "Convert to ฿" to see per-person amounts'}
            </div>
          )
        : hasOwedData
          ? trip.members.map(m => (
              <div key={m} className={styles.summaryRow}>
                <span className={styles.summaryName}><Avatar name={m} size={20} />{m}</span>
                <span className={styles.summaryAmt}>
                  {rates && !isTHB
                    ? <><span>฿{(convOwed[m] ?? 0).toLocaleString()}</span>{!summary.mixedCurrencies && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>{orig(summary.owed[m] ?? 0)}</span>}</>
                    : orig(summary.owed[m] ?? 0)
                  }
                </span>
              </div>
            ))
          : (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                💡 {t.tripSummaryAddHint ?? 'Open each bill and tap Save to record per-person amounts'}
              </div>
            )
      }

      <div className={styles.summaryTotal}>
        <span>{t.tripSummaryTotal ?? 'Total'}</span>
        <span>
          {rates && !isTHB
            ? <><span>฿{Object.values(convOwed).reduce((a,v)=>a+(v||0),0).toLocaleString()}</span>{!summary.mixedCurrencies && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 6 }}>{orig(summary.grandTotal)}</span>}</>
            : summary.mixedCurrencies ? <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span> : orig(summary.grandTotal)
          }
        </span>
      </div>

      {summary.hasPayers && displaySettlements.length > 0 && (
        <>
          <div className={styles.summaryTitle} style={{ marginTop: 14 }}>{t.tripSummaryTransfers ?? '💸 Who pays whom'}</div>
          {displaySettlements.map((s, i) => (
            <div key={i} className={styles.summaryRow}>
              <span className={styles.summaryName} style={{ gap: 6 }}>
                <Avatar name={s.from} size={18} />
                <span style={{ fontSize: 13 }}>{s.from}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>→</span>
                <Avatar name={s.to} size={18} />
                <span style={{ fontSize: 13 }}>{s.to}</span>
              </span>
              <span className={styles.summaryAmt} style={{ color: 'var(--color-accent, #ff6b35)' }}>
                {fmtAmount(s.amount, displayCurrency)}
              </span>
            </div>
          ))}
        </>
      )}

      {summary.hasPayers && displaySettlements.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
          {t.tripSummaryAllSettled ?? '✅ All settled'}
        </div>
      )}

      {!summary.hasPayers && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>
          💳 {t.tripSummaryNoPayers ?? 'Select who paid each bill to calculate transfers'}
        </div>
      )}
    </div>
  )
}


// ── Inline receipt scanner for trip tab ────────────────────────────────────
function TripReceiptScanner({ trip, onSaveBill, onAddBillToTrip, onUpdateTrip }) {
  const { t } = useLang()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null) // { items, billName, currency, vatIncluded, scIncluded, scRate }

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (getScanCount() >= SCAN_CAP) { setError(t.receiptCapReached ?? 'Scan limit reached'); return }
    setLoading(true); setError(null)
    try {
      const base64 = await compressImage(f)
      const r = await scanReceipt(base64)
      if (r.error) throw new Error(r.error)
      bumpScanCount()
      const items = Array.isArray(r.items) ? r.items.filter(i => i.price > 0) : []
      setPreview({
        items,
        billName: r.merchantName || '',
        currency: normaliseCurrency(r.currency),
        vatIncluded: !!r.vatIncluded,
        scIncluded: !!r.serviceChargeIncluded,
        scRate: r.serviceChargeRate || 10,
      })
    } catch (err) {
      setError(localizeError(err.message, t))
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleConfirm() {
    if (!preview) return
    const state = {
      billName: preview.billName,
      members: trip.members,
      foods: preview.items.map((item, i) => ({
        id: String(i),
        name: item.name || item.originalName || '',
        price: String(item.price),
        who: [...trip.members],
      })),
      vatEnabled: preview.vatIncluded,
      serviceChargeEnabled: preview.scIncluded,
      serviceChargeRate: String(preview.scRate),
      currency: preview.currency,
      promptPay: '', bankInfo: '', notes: '', roundTotalEnabled: false,
    }
    const entry = onSaveBill('split', state)
    if (entry) {
      onAddBillToTrip(trip.id, entry.id)
      // Merge bill members into trip
      const billMembers = [...new Set([...(entry.state?.members ?? []), ...(entry.state?.people ?? [])])]
      if (billMembers.length > 0) {
        const merged = [...new Set([...(trip.members ?? []), ...billMembers])]
        if (merged.length !== (trip.members ?? []).length) onUpdateTrip(trip.id, { members: merged })
      }
    }
    setPreview(null)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '10px 0', borderRadius: 10,
          border: '1.5px dashed var(--color-border)',
          background: 'none', color: loading ? 'var(--color-text-muted)' : 'var(--color-text)',
          fontSize: 13, fontFamily: 'var(--font-body)', cursor: loading ? 'default' : 'pointer',
        }}
      >
        <span style={{ fontSize: 16 }}>{loading ? '⏳' : '📷'}</span>
        <span>{loading ? (t.receiptScanning ?? 'Scanning…') : (t.tripScanNew ?? 'Scan receipt → add to trip')}</span>
      </button>
      {error && <div style={{ fontSize: 12, color: 'var(--color-error,#c00)', marginTop: 6, padding: '0 4px' }}>{error}</div>}

      {/* Preview modal */}
      {preview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end',
        }} onClick={e => { if (e.target === e.currentTarget) setPreview(null) }}>
          <div style={{
            background: 'var(--color-bg)', borderRadius: '16px 16px 0 0',
            padding: '20px 16px 32px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {preview.billName || (t.untitledBill ?? '(untitled)')}
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, color: 'var(--color-text-muted)' }}>
                {CURRENCY_FLAGS[preview.currency] ?? ''} {preview.currency}
              </span>
            </div>
            {preview.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                <span>{item.name}{item.originalName && item.originalName !== item.name ? ` (${item.originalName})` : ''}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(item.price).toLocaleString()}</span>
              </div>
            ))}
            {preview.items.length === 0 && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>No items detected</div>}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
              {preview.vatIncluded && '✓ VAT  '}{preview.scIncluded && `✓ SC ${preview.scRate}%  `}
              {trip.members.length > 0 && `Split: ${trip.members.join(', ')}`}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setPreview(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer', color: 'var(--color-text)' }}>
                {t.receiptCancel}
              </button>
              <button onClick={handleConfirm} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--color-text)', color: 'var(--color-bg)', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer' }}>
                ✓ {t.tripScanAdd ?? 'Add to trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Trip detail view ────────────────────────────────────────────────────────
function TripDetail({ trip, entries, tripSummary, onBack, onAddBill, onRemoveBill, onLoadBill, onEditTrip, onDeleteTrip, onSetPayer, onSaveBill, onAddBillToTrip, user, sharedSnapshot, onUpdateTrip }) {
  const { t } = useLang()
  const tripBills = trip.billIds.map(id => entries.find(e => e.id === id) ?? { id, _missing: true })
  const paidBy = trip.paidBy || {}

  // Backfill members from bills when trip.members is empty (e.g. existing trips
  // created before member-merge was implemented)
  useEffect(() => {
    if (sharedSnapshot) return // read-only shared view
    const hasLocal = tripBills.some(e => !e._missing)
    if (!hasLocal) return // no local bills to derive from
    if (trip.members.length > 0) return // already has members
    const derived = [...new Set(tripBills.flatMap(entry => {
      if (entry._missing) return []
      return [
        ...(entry.state?.members ?? []),
        ...(entry.state?.people ?? []),
      ]
    }))]
    if (derived.length > 0) onUpdateTrip(trip.id, { members: derived })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, trip.members.length])
  const summary = tripSummary(trip.id, entries) ?? (sharedSnapshot ? { ...sharedSnapshot, hasData: true, mixedCurrencies: false } : null)
  const detailCurrency = summary?.currency ?? trip.currency
  const isTHB = detailCurrency === 'THB'
  const [rates, setRates] = useState(null) // null | { [currency]: thbRate }
  const [rateLoading, setRateLoading] = useState(false)
  const rate = rates ? rates[detailCurrency] ?? null : null // backwards-compat for single-currency toggle label
  const captureRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [shareStatus, setShareStatus] = useState(null) // null | 'creating' | 'copied' | 'shared' | 'error'
  const [toast, setToast] = useState(null)
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }
  const handleConvertToggle = async () => {
    if (rates) { setRates(null); return }
    if (isTHB) return
    setRateLoading(true)
    try {
      // Collect all unique non-THB currencies across trip bills
      const billCurrencies = new Set()
      tripBills.forEach(entry => {
        if (entry._missing) return
        const _pre = entry._sharedBill
        const { currency: bCurr } = _pre ?? calcBillResult(entry)
        if (bCurr && bCurr !== 'THB') billCurrencies.add(bCurr)
      })
      if (billCurrencies.size === 0) return
      // Fetch from dominant currency (open.er-api returns all rates in one call)
      const res = await fetch(`https://open.er-api.com/v6/latest/THB`)
      const d = await res.json()
      if (!d?.rates) return
      // open.er-api /latest/THB gives rates[X] = how many X per 1 THB
      // We want: 1 X = ? THB → 1 / rates[X]
      const map = {}
      billCurrencies.forEach(c => {
        if (d.rates[c]) map[c] = Math.round((1 / d.rates[c]) * 10000) / 10000
      })
      if (Object.keys(map).length > 0) setRates(map)
    } catch {} finally { setRateLoading(false) }
  }
  const conv = (n) => rate !== null ? n * rate : n
  const dispCurrency = rate !== null ? 'THB' : detailCurrency

  // Compute mixed-currency conversion in TripDetail so both share buttons
  // and TripSummarySection can use the same values
  const getMixedConvOwed = () => {
    if (!rates || !summary?.mixedCurrencies) return null
    const o = Object.fromEntries(trip.members.map(m => [m, 0]))
    const p = Object.fromEntries(trip.members.map(m => [m, 0]))
    tripBills.forEach(entry => {
      if (entry._missing) return
      const _pre = entry._sharedBill
      const { grandTotal: bt, totals: bTotals, currency: bCurr } = _pre ?? calcBillResult(entry)
      const factor = (bCurr && bCurr !== 'THB') ? (rates[bCurr] ?? 1) : 1
      Object.entries(bTotals || {}).forEach(([m, v]) => {
        if (o[m] !== undefined) o[m] += Math.round((Number(v) || 0) * factor)
      })
      const payer = (trip.paidBy || {})[entry.id]
      if (payer && p[payer] !== undefined) p[payer] += Math.round((bt || 0) * factor)
    })
    return { owed: o, paid: p }
  }
  const mixedConv = (rates && summary?.mixedCurrencies) ? getMixedConvOwed() : null
  const convOwed = mixedConv?.owed ?? (rates && !isTHB
    ? Object.fromEntries(trip.members.map(m => [m, Math.round((summary?.owed[m] ?? 0) * (rate ?? 1))]))
    : (summary?.owed ?? {}))
  const convPaid = mixedConv?.paid ?? (rates && !isTHB
    ? Object.fromEntries(trip.members.map(m => [m, Math.round((summary?.paid?.[m] ?? 0) * (rate ?? 1))]))
    : (summary?.paid ?? {}))

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack}>← {t.tripBack ?? 'Trips'}</button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={styles.editBtn} onClick={onEditTrip}>✏️</button>
          <button
            className={styles.editBtn}
            onClick={() => {
              if (window.confirm(t.tripDeleteConfirm ?? `Delete "${trip.name}"? This cannot be undone.`)) {
                onDeleteTrip(trip.id)
              }
            }}
            style={{ color: 'var(--color-error, #c62828)' }}
            title={t.tripDelete ?? 'Delete trip'}
          >🗑️</button>
        </div>
      </div>
      <div ref={captureRef} style={{ padding: '0 0 8px', background: 'var(--color-bg)' }}>
      <h2 className={styles.tripTitle}>{trip.name}</h2>
      <div className={styles.tripMeta}>{fmtDate(trip.createdAt)}</div>
      <div className={styles.memberChips} style={{ marginBottom: 16 }}>
        {(() => {
          // If no bills are locally available (e.g. viewing on another device),
          // skip the amount filter and show all trip members
          const hasLocalBills = tripBills.some(e => !e._missing && !e._sharedBill)
          return trip.members.filter(m => {
            if (!hasLocalBills) return true // can't filter by amounts — show all
            const isPayer = Object.values(trip.paidBy || {}).includes(m)
            if (isPayer) return true
            return tripBills.some(entry => {
              if (entry._missing) return false
              const _pre = entry._sharedBill
              const { totals } = _pre ?? calcBillResult(entry)
              return (totals[m] ?? 0) > 0
            })
          }).map(m => (
            <span key={m} className={styles.memberChip}>
              <Avatar name={m} size={18} />{m}
            </span>
          ))
        })()}
      </div>
      <TripSummarySection trip={trip} summary={summary} rate={rate} rates={rates} rateLoading={rateLoading} onConvertToggle={handleConvertToggle} convOwed={convOwed} convPaid={convPaid} mixedConv={mixedConv} />

      {/* Buttons: Share link | Line | Save image — matches Bill Splitter ResultSection */}
      {summary && summary.hasData && (
        <div className={styles.shareBtnGroup} data-snapshot-hide>

          {/* 1. Share link ↗ — purple */}
          <button
            className={styles.shareBtn}
            style={{ background: 'var(--accent, #4f46e5)', color: 'white' }}
            disabled={shareStatus === 'creating'}
            onClick={async () => {
              setShareStatus('creating')
              try {
                // Use THB-converted values in snapshot if rates loaded
                // For mixed trips, re-derive per bill; for single currency use dominant rate
                const _snapRate = rates ? rate : null
                const snapOwed = mixedConv?.owed ?? (_snapRate && !isTHB
                  ? Object.fromEntries(trip.members.map(m => [m, Math.round((summary.owed[m] ?? 0) * _snapRate)]))
                  : summary.owed)
                const _snapGrand = rates ? tripBills.reduce((acc, entry) => {
                  if (entry._missing) return acc
                  const _pre = entry._sharedBill
                  const { grandTotal: bt, currency: bCurr } = _pre ?? calcBillResult(entry)
                  const f = (bCurr && bCurr !== 'THB') ? (rates[bCurr] ?? 1) : 1
                  return acc + Math.round((bt || 0) * f)
                }, 0) : summary.grandTotal
                const snapSettlements = (_snapRate || mixedConv) && summary.hasPayers
                  ? (() => {
                      const sOwed = snapOwed
                      const sPaid = mixedConv?.paid ?? (_snapRate && !isTHB
                        ? Object.fromEntries(trip.members.map(m => [m, Math.round((summary.paid?.[m] ?? 0) * _snapRate)]))
                        : (summary.paid ?? {}))
                      const net = {}
                      trip.members.forEach(m => { net[m] = (sPaid[m] || 0) - (sOwed[m] || 0) })
                      const creds = Object.entries(net).filter(([,v]) => v > 0.5).map(([m,v]) => ({m,v}))
                      const debts = Object.entries(net).filter(([,v]) => v < -0.5).map(([m,v]) => ({m,v:-v}))
                      creds.sort((a,b) => b.v-a.v); debts.sort((a,b) => b.v-a.v)
                      const res = []; let ci=0,di=0
                      while (ci<creds.length && di<debts.length) {
                        const amt = Math.min(creds[ci].v, debts[di].v)
                        if (amt > 0.5) res.push({from:debts[di].m, to:creds[ci].m, amount:amt})
                        creds[ci].v -= amt; debts[di].v -= amt
                        if (creds[ci].v < 0.5) ci++; if (debts[di].v < 0.5) di++
                      }
                      return res
                    })()
                  : summary.settlements
                const snapTotal = rates ? _snapGrand : (_snapRate && !isTHB ? Math.round(summary.grandTotal * _snapRate) : summary.grandTotal)
                const snapCurrency = rates ? 'THB' : (_snapRate && !isTHB ? 'THB' : summary.currency)
                // Embed bill display data so recipients see bill list without needing local history
                const billsData = trip.billIds.map(id => {
                  const entry = entries.find(e => e.id === id)
                  if (!entry) return null
                  const { grandTotal: bt, totals: bTotals, currency: bCurr } = calcBillResult(entry)
                  const _bRate = rates ? (rates[bCurr] ?? null) : (rate && bCurr !== 'THB' ? rate : null)
                  const dispCurr = _bRate ? 'THB' : (bCurr ?? detailCurrency)
                  const dispTotal = _bRate ? Math.round(bt * _bRate) : bt
                  const dispTotals = _bRate
                    ? Object.fromEntries(Object.entries(bTotals).map(([m, v]) => [m, Math.round(v * _bRate)]))
                    : bTotals
                  return {
                    id: entry.id,
                    billName: entry.billName || '',
                    savedAt: entry.savedAt,
                    grandTotal: dispTotal,
                    currency: dispCurr,
                    totals: dispTotals,
                    payer: (trip.paidBy || {})[id] || '',
                  }
                }).filter(Boolean)
                const payload = {
                  name: trip.name,
                  members: trip.members,
                  billIds: trip.billIds,
                  paidBy: trip.paidBy || {},
                  currency: snapCurrency,
                  bills: billsData,
                  snapshot: {
                    owed: snapOwed,
                    paid: summary.paid,
                    grandTotal: snapTotal,
                    settlements: snapSettlements,
                    hasPayers: summary.hasPayers,
                    currency: snapCurrency,
                  },
                }
                const url = user
                  ? await createShortLink('trips', payload, user.uid)
                  : buildShareUrl('trips', payload)
                const result = await shareLink({ title: trip.name, text: `Trip: ${trip.name}`, url })
                // Only show toast for clipboard copy — share sheet is its own confirmation
                if (result !== 'shared') showToast('✓ Link copied')
              } catch { showToast('Share failed') }
              finally { setShareStatus(null) }
            }}
          >
            {shareStatus === 'creating' ? (t.shareCreating ?? 'Creating…') : <><ShareIcon width={14} height={14} /> {t.shareLink ?? 'Share link ↗'}</>}
          </button>

          {/* 2. Line — green, captures image → Web Share → fallback text */}
          <button
            className={styles.shareBtn}
            style={{ background: '#06C755', color: 'white' }}
            disabled={capturing}
            onClick={async () => {
              if (!captureRef.current || capturing) return
              setCapturing(true)
              try {
                const html2canvas = (await import('html2canvas')).default
                const el = captureRef.current
                const prevStyle = el.getAttribute('style') || ''
                el.setAttribute('style', (prevStyle + ';background:#ffffff;color:#1a1a1a;--color-surface:#ffffff;--color-surface-alt:#f5f5f4;--color-text:#1a1a1a;--color-text-muted:#6b7280;--color-text-faint:#9ca3af;--color-border:rgba(0,0,0,0.08);--color-border-strong:rgba(0,0,0,0.15);--color-accent:#1a1a1a;--color-accent-text:#ffffff;').replace(/^;/, ''))
                const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true, ignoreElements: el => el.hasAttribute && el.hasAttribute('data-snapshot-hide') })
                el.setAttribute('style', prevStyle)
                const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
                if (!blob) { showToast(t.imageFailed ?? 'Failed'); return }
                const safeName = (trip.name || 'trip').replace(/[^\w\u0E00-\u0E7F-]+/g, '_')
                const file = new File([blob], `${safeName}.png`, { type: 'image/png' })
                if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
                  try { await navigator.share({ files: [file], title: trip.name }); return } catch (e) { if (e?.name === 'AbortError') return }
                }
                // Fallback: LINE text — use THB-converted values if rates loaded
                const dispCurrency = rates ? 'THB' : detailCurrency
                const dispOwed = mixedConv?.owed ?? (rate && !isTHB
                  ? Object.fromEntries(trip.members.map(m => [m, Math.round((summary.owed[m] ?? 0) * rate)]))
                  : summary.owed)
                const dispSettlements = snapSettlements ?? summary.settlements
                const dispTotal = snapTotal
                const lines = [`🧳 ${trip.name}`, '']
                if (summary?.hasPayers && dispSettlements?.length > 0) {
                  lines.push('💸 Who pays whom:')
                  dispSettlements.forEach(s => lines.push(`  ${s.from} → ${s.to}: ${fmtAmount(s.amount, dispCurrency)}`))
                  lines.push('')
                }
                if (trip.members.length > 0 && dispOwed) {
                  lines.push('Per person:')
                  trip.members.forEach(m => lines.push(`  ${m}: ${fmtAmount(dispOwed[m] ?? 0, dispCurrency)}`))
                  lines.push('')
                }
                lines.push(`Total: ${fmtAmount(dispTotal, dispCurrency)}`)
                window.open(`https://line.me/R/share?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener')
              } catch { showToast(t.imageFailed ?? 'Failed') } finally { setCapturing(false) }
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg> Line
          </button>

          {/* 3. Save image — matches Bill Splitter (no More dropdown) */}
          <button
            className={styles.shareBtn}
            disabled={capturing}
            onClick={async () => {
              if (!captureRef.current || capturing) return
              setCapturing(true)
              try {
                const html2canvas = (await import('html2canvas')).default
                const el = captureRef.current
                const prevStyle = el.getAttribute('style') || ''
                el.setAttribute('style', (prevStyle + ';background:#ffffff;color:#1a1a1a;--color-surface:#ffffff;--color-surface-alt:#f5f5f4;--color-text:#1a1a1a;--color-text-muted:#6b7280;--color-text-faint:#9ca3af;--color-border:rgba(0,0,0,0.08);--color-border-strong:rgba(0,0,0,0.15);--color-accent:#1a1a1a;--color-accent-text:#ffffff;').replace(/^;/, ''))
                const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true, ignoreElements: el => el.hasAttribute && el.hasAttribute('data-snapshot-hide') })
                el.setAttribute('style', prevStyle)
                const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
                if (!blob) { showToast(t.imageFailed ?? 'Failed'); return }
                const safeName = (trip.name || 'trip').replace(/[^\w\u0E00-\u0E7F-]+/g, '_')
                const file = new File([blob], `${safeName}.png`, { type: 'image/png' })
                if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
                  try { await navigator.share({ files: [file], title: trip.name }); return } catch (e) { if (e?.name === 'AbortError') return }
                }
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${safeName}.png`; document.body.appendChild(a); a.click(); a.remove()
                showToast(t.imageSaved ?? '✓ Image saved')
              } catch { showToast(t.imageFailed ?? 'Failed') } finally { setCapturing(false) }
            }}
          >
            {t.saveImage ?? '📷 Save image'}
          </button>

        </div>
      )}
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.billsTitle}>{t.tripBills ?? 'Bills'} ({tripBills.length})</div>
      {tripBills.length === 0 && (
        <p className={styles.empty}>{t.tripNoBills ?? 'No bills yet — add one below'}</p>
      )}
      {tripBills.map(entry => {
        // Missing entry — bill was deleted from history but trip still references it
        if (entry._missing) return (
          <div key={entry.id} className={styles.billCard} style={{ flexDirection: 'column', alignItems: 'stretch', opacity: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {t.tripBillMissing ?? '(Bill deleted from history)'}
              </span>
              <button className={styles.billCardRemove} onClick={() => onRemoveBill(trip.id, entry.id)} aria-label="Remove from trip">×</button>
            </div>
          </div>
        )
        const _pre = entry._sharedBill
        const { grandTotal: totalAmt, currency: _billCurr, totals } = _pre ?? calcBillResult(entry)
        const billCurrency = (_pre?.currency) ?? _billCurr ?? detailCurrency
        const payer = paidBy[entry.id] || ''
        return (
          <div key={entry.id} className={styles.billCard} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className={styles.billCardMain} onClick={() => !entry._sharedBill && onLoadBill(entry)} style={{ cursor: entry._sharedBill ? 'default' : undefined }}>
                <span className={styles.billCardName}>{(() => {
                  const name = entry.billName || (t.untitledBill ?? '(untitled)')
                  const idx = tripBills.findIndex(b => b.id === entry.id)
                  const dupesBefore = tripBills.slice(0, idx).filter(b => (b.billName || (t.untitledBill ?? '(untitled)')) === name).length
                  return dupesBefore > 0 ? `${name} (${dupesBefore + 1})` : name
                })()}</span>
                <span className={styles.billCardDate}>{fmtDate(entry.savedAt)}</span>
                {totalAmt > 0 && (
                  <span className={styles.billCardAmt}>
                    {fmtAmount(totalAmt, billCurrency)}
                    {rate && billCurrency !== 'THB' && (
                      <span style={{fontSize:11,color:'var(--color-text-muted)',marginLeft:4}}>≈฿{Math.round(totalAmt*rate).toLocaleString()}</span>
                    )}
                  </span>
                )}
              </button>
              <button className={styles.billCardRemove} onClick={() => onRemoveBill(trip.id, entry.id)} aria-label="Remove from trip" data-snapshot-hide>×</button>
            </div>
            {/* Per-person totals */}
            {trip.members.length > 0 && Object.keys(totals).some(m => trip.members.includes(m)) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 14px 8px' }}>
                {trip.members.map(m => totals[m] != null ? (
                  <span key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <Avatar name={m} size={14} />
                    {fmtAmount(totals[m] ?? 0, billCurrency)}
                    {rate && billCurrency !== 'THB' && (
                      <span style={{fontSize:10,color:'var(--color-text-muted)',marginLeft:3}}>≈฿{Math.round((totals[m]??0)*rate).toLocaleString()}</span>
                    )}
                  </span>
                ) : null)}
              </div>
            )}
            {trip.members.length > 0 && (
              <div data-snapshot-hide style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 10px', borderTop: '0.5px solid var(--color-border)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  💳 {payer ? '' : 'ใครจ่าย?'}
                </span>
                {payer && <Avatar name={payer} size={16} />}
                <select
                  value={payer}
                  onChange={e => onSetPayer(trip.id, entry.id, e.target.value)}
                  style={{
                    fontSize: 13,
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 6,
                    background: 'var(--color-surface)',
                    color: payer ? 'var(--color-text)' : 'var(--color-text-muted)',
                    padding: '3px 6px',
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">— เลือก —</option>
                  {trip.members.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )
      })}
      </div>{/* /captureRef: summary+bills */}
      <button className={styles.addBillBtn} style={{ marginTop: 16 }} onClick={onAddBill}>
        + {t.tripAddBill ?? 'Add bill to trip'}
      </button>
      <TripReceiptScanner trip={trip} onSaveBill={onSaveBill} onAddBillToTrip={onAddBillToTrip} onUpdateTrip={(id, patch) => updateTrip(id, patch)} />
    </div>
  )
}

// ── Trip list ───────────────────────────────────────────────────────────────
function TripList({ trips, onSelect, onNew, onDelete }) {
  const { t } = useLang()
  return (
    <div className={styles.list}>
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>{t.tabTrips ?? 'Trips'}</h2>
        <button className={styles.newTripBtn} onClick={onNew}>+ {t.tripNew ?? 'New'}</button>
      </div>
      {trips.length === 0 && (
        <p className={styles.empty}>{t.tripEmpty ?? 'No trips yet — create one to group bills together'}</p>
      )}
      {trips.map(trip => (
        <div key={trip.id} className={styles.tripCard} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onSelect(trip)}>
          <button
            className={styles.editBtn}
            style={{ position: 'absolute', top: 10, right: 10, fontSize: 16, opacity: 0.5 }}
            onClick={e => {
              e.stopPropagation()
              if (window.confirm(t.tripDeleteConfirm ?? `Delete "${trip.name}"?`)) onDelete(trip.id)
            }}
            aria-label="Delete trip"
          >🗑️</button>
          <div className={styles.tripCardName} style={{ paddingRight: 28 }}>{trip.name}</div>
          <div className={styles.tripCardMeta}>
            {trip.members.length} {t.tripMembers ?? 'members'} · {trip.billIds.length} {t.tripBills ?? 'bills'} · {fmtDate(trip.createdAt)}
          </div>
          <div className={styles.tripCardAvatars}>
            {trip.members.slice(0, 5).map(m => <Avatar key={m} name={m} size={22} />)}
            {trip.members.length > 5 && <span className={styles.moreAvatars}>+{trip.members.length - 5}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function TripsTab({ entries, onLoadBill, onNewBillForTrip, onSaveBill, user, sharedTrip, onExitShared }) {
  const { trips, createTrip, updateTrip, deleteTrip, addBillToTrip, removeBillFromTrip, setBillPayer, getTrip, tripSummary } = useTripsStore()
  const [view, setView] = useState('list')   // 'list' | 'detail' | 'new' | 'edit'
  const [activeTrip, setActiveTrip] = useState(null)
  const [addingBill, setAddingBill] = useState(false)

  const handleNew = () => setView('new')

  const handleCreate = (name) => {
    const trip = createTrip(name, [], 'THB')
    setActiveTrip(trip)
    setView('detail')
  }

  const handleEdit = (name) => {
    updateTrip(activeTrip.id, { name: name.trim().slice(0, 60) })
    setActiveTrip(prev => ({ ...prev, name: name.trim().slice(0, 60) }))
    setView('detail')
  }

  const handleSelect = (trip) => { setActiveTrip(trip); setView('detail') }
  const handleBack = () => { setActiveTrip(null); setView('list') }
  const handleAddBill = () => setAddingBill(true)

  const handleRemoveBill = (tripId, billId) => {
    removeBillFromTrip(tripId, billId)
    setActiveTrip(prev => prev ? { ...prev, billIds: prev.billIds.filter(b => b !== billId) } : prev)
  }

  const handleSetPayer = (tripId, billId, payer) => {
    setBillPayer(tripId, billId, payer)
    setActiveTrip(prev => {
      if (!prev || prev.id !== tripId) return prev
      return { ...prev, paidBy: { ...(prev.paidBy || {}), [billId]: payer } }
    })
  }

  // Bill picker
  const BillPicker = () => {
    const available = entries.filter(e => !activeTrip.billIds.includes(e.id))
    const { t } = useLang()
    const [selected, setSelected] = useState(new Set())
    const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    const selectAll = () => setSelected(available.length === selected.size ? new Set() : new Set(available.map(e => e.id)))

    const handleConfirmAdd = () => {
      if (!selected.size) return
      let mergedMembers = [...(activeTrip.members ?? [])]
      const newBillIds = []
      selected.forEach(id => {
        const entry = entries.find(e => e.id === id)
        if (!entry) return
        addBillToTrip(activeTrip.id, id)
        newBillIds.push(id)
        const billMembers = [...new Set([...(entry.state?.members ?? []), ...(entry.state?.people ?? [])])]
        mergedMembers = [...new Set([...mergedMembers, ...billMembers])]
      })
      if (mergedMembers.length !== (activeTrip.members ?? []).length) {
        updateTrip(activeTrip.id, { members: mergedMembers })
      }
      setActiveTrip(prev => ({ ...prev, billIds: [...prev.billIds, ...newBillIds], members: mergedMembers }))
      setAddingBill(false)
    }

    return (
      <div className={styles.picker}>
        <div className={styles.pickerHeader}>
          <span>{t.tripPickBill ?? 'Select bills to add'}</span>
          <button className={styles.closeBtn} onClick={() => setAddingBill(false)}>×</button>
        </div>
        {available.length === 0 && <p className={styles.empty}>{t.tripNoBillsToAdd ?? 'No saved bills to add'}</p>}
        {available.length > 1 && (
          <button onClick={selectAll} style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px 8px', fontFamily: 'var(--font-body)', display: 'block' }}>
            {selected.size === available.length ? '☐ Deselect all' : '☑ Select all'}
          </button>
        )}
        {available.map(entry => {
          const isSelected = selected.has(entry.id)
          const { grandTotal, currency: billCurr } = calcBillResult(entry)
          return (
            <button key={entry.id}
              onClick={() => toggleSelect(entry.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', textAlign: 'left', padding: '10px 12px',
                background: isSelected ? 'var(--color-surface-hover, rgba(0,0,0,0.04))' : 'none',
                border: 'none', borderBottom: '0.5px solid var(--color-border)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${isSelected ? 'var(--color-text)' : 'var(--color-border)'}`,
                background: isSelected ? 'var(--color-text)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-bg)', fontSize: 11, fontWeight: 700,
              }}>{isSelected ? '✓' : ''}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>{entry.billName || (t.untitledBill ?? '(untitled)')}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fmtDate(entry.savedAt)}</span>
              </span>
              {grandTotal > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', flexShrink: 0 }}>{fmtAmount(grandTotal, billCurr ?? 'THB')}</span>}
            </button>
          )
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className={styles.cancelBtn} style={{ flex: 1 }} onClick={() => setAddingBill(false)}>{t.receiptCancel}</button>
          <button className={styles.saveBtn} style={{ flex: 2, opacity: selected.size ? 1 : 0.4 }} disabled={!selected.size} onClick={handleConfirmAdd}>
            + {selected.size > 0 ? `Add ${selected.size} bill${selected.size !== 1 ? 's' : ''}` : 'Add bills'}
          </button>
        </div>
      </div>
    )
  }

  // Shared trip read-only view
  if (sharedTrip) {
    const fakeTrip = {
      id: '__shared__',
      name: sharedTrip.name || 'Shared Trip',
      members: sharedTrip.members || [],
      billIds: sharedTrip.billIds || [],
      paidBy: sharedTrip.paidBy || {},
      currency: sharedTrip.currency || 'THB',
      createdAt: null,
    }
    // Use embedded snapshot for summary (fakeTrip id won't be found in local store)
    const sharedSnapshot = sharedTrip.snapshot || null
    // Build fake entries from embedded bills so bill cards render without local history
    const sharedEntries = sharedTrip.bills
      ? sharedTrip.bills.map(b => ({
          id: b.id,
          billName: b.billName,
          savedAt: b.savedAt,
          tab: 'split',
          // state is minimal — calcBillResult won't be called; we pass pre-computed totals via _sharedBill
          state: {},
          _sharedBill: { grandTotal: b.grandTotal, currency: b.currency, totals: b.totals, payer: b.payer },
        }))
      : entries
    return (
      <div>
        {onExitShared && (
          <div style={{ background: 'var(--color-surface-alt)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>👁️ Viewing shared trip</span>
            <button onClick={onExitShared} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>✕ Exit</button>
          </div>
        )}
        <TripDetail
          trip={fakeTrip}
          entries={sharedEntries}
          tripSummary={tripSummary}
          sharedSnapshot={sharedSnapshot}
          onBack={onExitShared ?? (() => {})}
          onAddBill={() => {}}
          onRemoveBill={() => {}}
          onLoadBill={() => {}}
          onEditTrip={() => {}}
          onDeleteTrip={() => {}}
          onSetPayer={() => {}}
          onSaveBill={onSaveBill}
          onAddBillToTrip={() => {}}
          user={user}
          readOnly
        />
      </div>
    )
  }

  if (addingBill && activeTrip) return <BillPicker />
  if (view === 'new') return <TripForm title="New Trip" onSave={handleCreate} onCancel={() => setView('list')} />
  if (view === 'edit' && activeTrip) {
    const trip = getTrip(activeTrip.id) ?? activeTrip
    return <TripForm title="Edit Trip" initial={trip} onSave={handleEdit} onCancel={() => setView('detail')} />
  }
  if (view === 'detail' && activeTrip) {
    const trip = getTrip(activeTrip.id) ?? activeTrip
    return (
      <TripDetail
        trip={trip}
        entries={entries}
        tripSummary={tripSummary}
        onBack={handleBack}
        onAddBill={handleAddBill}
        onSaveBill={onSaveBill}
        user={user}
        onUpdateTrip={(id, patch) => { updateTrip(id, patch); setActiveTrip(prev => prev?.id === id ? { ...prev, ...patch } : prev) }}
        onAddBillToTrip={(tripId, billId) => {
          addBillToTrip(tripId, billId)
          setActiveTrip(prev => prev ? { ...prev, billIds: [...prev.billIds, billId] } : prev)
        }}
        onRemoveBill={handleRemoveBill}
        onLoadBill={onLoadBill}
        onEditTrip={() => setView('edit')}
        onDeleteTrip={(id) => { deleteTrip(id); handleBack() }}
        onSetPayer={handleSetPayer}
      />
    )
  }
  return <TripList trips={trips} onSelect={handleSelect} onNew={handleNew} onDelete={(id) => { deleteTrip(id); if (activeTrip?.id === id) setActiveTrip(null) }} />
}
