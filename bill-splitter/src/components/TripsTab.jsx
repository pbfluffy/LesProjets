/**
 * TripsTab — Trip mode UI (#128)
 *
 * Views:
 *   'list'   — all trips
 *   'detail' — single trip (bills + summary + settlement)
 *   'new'    — create trip form
 *   'edit'   — edit trip name/members/currency
 */
import { useState, useRef } from 'react'
import { useLang } from '../LangContext'
import { useTripsStore, calcBillResult } from '../hooks/useTripsStore'
import Avatar from './Avatar'
import styles from './TripsTab.module.css'
import { compressImage, scanReceipt, localizeError, getScanCount, bumpScanCount, SCAN_CAP, CURRENCY_FLAGS } from './receiptScanUtils'
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
function TripSummarySection({ trip, entries, tripSummary, rate, rateLoading, onConvertToggle }) {
  const summary = tripSummary(trip.id, entries)
  if (!summary) return null
  if (!trip.billIds.length) return null

  const hasOwedData = trip.members.some(m => (summary.owed[m] ?? 0) > 0)
  const isTHB = summary.currency === 'THB'
  // Dual-currency helpers: show original + THB conversion side by side
  const orig = (n) => fmtAmount(n, summary.currency)
  const thb  = (n) => rate ? ` ≈ ฿${Math.round(n * rate).toLocaleString()}` : ''

  return (
    <div className={styles.summarySection}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className={styles.summaryTitle} style={{ margin: 0 }}>สรุปยอด</div>
        {/* Show toggle for any non-THB trip (single or mixed currencies) */}
        {!isTHB && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {summary.mixedCurrencies && (
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>⚠️ หลายสกุล</span>
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
              {rateLoading ? '…' : rate ? `1 ${summary.currency} = ฿${rate.toFixed(2)}` : 'แปลงเป็น ฿'}
            </button>
          </div>
        )}
      </div>

      {hasOwedData
        ? trip.members.map(m => (
            <div key={m} className={styles.summaryRow}>
              <span className={styles.summaryName}><Avatar name={m} size={20} />{m}</span>
              <span className={styles.summaryAmt}>
                {orig(summary.owed[m] ?? 0)}
                {!isTHB && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>{thb(summary.owed[m] ?? 0)}</span>}
              </span>
            </div>
          ))
        : (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              💡 เปิดแต่ละบิลและกด Save เพื่อบันทึกยอดต่อคน
            </div>
          )
      }

      <div className={styles.summaryTotal}>
        <span>รวม</span>
        <span>
          {orig(summary.grandTotal)}
          {!isTHB && rate && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 6 }}>≈ ฿{Math.round(summary.grandTotal * rate).toLocaleString()}</span>}
        </span>
      </div>


      {/* Settlement transfers */}
      {summary.hasPayers && summary.settlements.length > 0 && (
        <>
          <div className={styles.summaryTitle} style={{ marginTop: 14 }}>💸 ใครโอนให้ใคร</div>
          {summary.settlements.map((s, i) => (
            <div key={i} className={styles.summaryRow}>
              <span className={styles.summaryName} style={{ gap: 6 }}>
                <Avatar name={s.from} size={18} />
                <span style={{ fontSize: 13 }}>{s.from}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>→</span>
                <Avatar name={s.to} size={18} />
                <span style={{ fontSize: 13 }}>{s.to}</span>
              </span>
              <span className={styles.summaryAmt} style={{ color: 'var(--color-accent, #ff6b35)' }}>
                {orig(s.amount)}
                {!isTHB && rate && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>{thb(s.amount)}</span>}
              </span>
            </div>
          ))}
        </>
      )}

      {summary.hasPayers && summary.settlements.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
          ✅ ไม่มียอดค้างชำระ
        </div>
      )}

      {!summary.hasPayers && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>
          💳 เลือกว่าใครจ่ายแต่ละบิลเพื่อคำนวณยอดโอน
        </div>
      )}
    </div>
  )
}


// ── Inline receipt scanner for trip tab ────────────────────────────────────
function TripReceiptScanner({ trip, onSaveBill, onAddBillToTrip }) {
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
      // Members already set from trip in state — no extra merge needed
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
function TripDetail({ trip, entries, tripSummary, onBack, onAddBill, onRemoveBill, onLoadBill, onEditTrip, onDeleteTrip, onSetPayer, onSaveBill, onAddBillToTrip }) {
  const { t } = useLang()
  const tripBills = trip.billIds.map(id => entries.find(e => e.id === id) ?? { id, _missing: true })
  const paidBy = trip.paidBy || {}
  const summary = tripSummary(trip.id, entries)
  const detailCurrency = summary?.currency ?? trip.currency
  const isTHB = detailCurrency === 'THB'
  const [rate, setRate] = useState(null)
  const [rateLoading, setRateLoading] = useState(false)
  const handleConvertToggle = async () => {
    if (rate) { setRate(null); return }
    if (isTHB) return
    setRateLoading(true)
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${detailCurrency}`)
      const d = await res.json()
      const r = d?.rates?.THB
      if (r) setRate(r)
    } catch {} finally { setRateLoading(false) }
  }
  const conv = (n) => rate !== null ? n * rate : n
  const dispCurrency = rate !== null ? 'THB' : detailCurrency

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
      <h2 className={styles.tripTitle}>{trip.name}</h2>
      <div className={styles.tripMeta}>{fmtDate(trip.createdAt)}</div>
      <div className={styles.memberChips} style={{ marginBottom: 16 }}>
        {trip.members.map(m => (
          <span key={m} className={styles.memberChip}>
            <Avatar name={m} size={18} />{m}
          </span>
        ))}
      </div>

      <TripSummarySection trip={trip} entries={entries} tripSummary={tripSummary} rate={rate} rateLoading={rateLoading} onConvertToggle={handleConvertToggle} />

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
        const { grandTotal: totalAmt, currency: _billCurr, totals } = calcBillResult(entry)
        const billCurrency = _billCurr ?? detailCurrency
        const payer = paidBy[entry.id] || ''
        return (
          <div key={entry.id} className={styles.billCard} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className={styles.billCardMain} onClick={() => onLoadBill(entry)}>
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
              <button className={styles.billCardRemove} onClick={() => onRemoveBill(trip.id, entry.id)} aria-label="Remove from trip">×</button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 10px', borderTop: '0.5px solid var(--color-border)' }}>
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
      <button className={styles.addBillBtn} style={{ marginTop: 16 }} onClick={onAddBill}>
        + {t.tripAddBill ?? 'Add bill to trip'}
      </button>
      <TripReceiptScanner trip={trip} onSaveBill={onSaveBill} onAddBillToTrip={onAddBillToTrip} />
    </div>
  )
}

// ── Trip list ───────────────────────────────────────────────────────────────
function TripList({ trips, onSelect, onNew }) {
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
        <button key={trip.id} className={styles.tripCard} onClick={() => onSelect(trip)}>
          <div className={styles.tripCardName}>{trip.name}</div>
          <div className={styles.tripCardMeta}>
            {trip.members.length} {t.tripMembers ?? 'members'} · {trip.billIds.length} {t.tripBills ?? 'bills'} · {fmtDate(trip.createdAt)}
          </div>
          <div className={styles.tripCardAvatars}>
            {trip.members.slice(0, 5).map(m => <Avatar key={m} name={m} size={22} />)}
            {trip.members.length > 5 && <span className={styles.moreAvatars}>+{trip.members.length - 5}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function TripsTab({ entries, onLoadBill, onNewBillForTrip, onSaveBill }) {
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
        const billMembers = entry.state?.members ?? []
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
  return <TripList trips={trips} onSelect={handleSelect} onNew={handleNew} />
}
