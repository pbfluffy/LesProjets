/**
 * TripsTab — Trip mode UI (#128)
 *
 * Views:
 *   'list'   — all trips
 *   'detail' — single trip (bills + summary + settlement)
 *   'new'    — create trip form
 */
import { useState, useCallback } from 'react'
import { useLang } from '../LangContext'
import { useTripsStore } from '../hooks/useTripsStore'
import Avatar from './Avatar'
import styles from './TripsTab.module.css'

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAmount(n, currency = 'THB') {
  const sym = { THB:'฿', KRW:'₩', JPY:'¥', USD:'$', EUR:'€', SGD:'S$', HKD:'HK$', GBP:'£', AUD:'A$', CNY:'¥' }[currency] ?? currency
  const decimals = (currency === 'KRW' || currency === 'JPY') ? 0 : 2
  return `${sym}${Number(n).toFixed(decimals)}`
}

// ── New trip form ───────────────────────────────────────────────────────────
function NewTripForm({ onSave, onCancel }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [members, setMembers] = useState([])
  const [currency, setCurrency] = useState('THB')
  const CURRENCIES = [
    { code:'THB', label:'฿ THB' }, { code:'KRW', label:'₩ KRW' },
    { code:'JPY', label:'¥ JPY' }, { code:'USD', label:'$ USD' },
    { code:'EUR', label:'€ EUR' }, { code:'SGD', label:'S$ SGD' },
  ]

  const addMember = () => {
    const m = memberInput.trim()
    if (!m || members.includes(m)) return
    setMembers(prev => [...prev, m])
    setMemberInput('')
  }

  return (
    <div className={styles.form}>
      <h2 className={styles.formTitle}>{t.tripNew ?? 'New Trip'}</h2>
      <label className={styles.label}>{t.tripName ?? 'Trip name'}</label>
      <input
        className={styles.input}
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={t.tripNamePlaceholder ?? 'e.g. Korea June 2026'}
        maxLength={60}
      />
      <label className={styles.label}>{t.members}</label>
      <div className={styles.memberInputRow}>
        <input
          className={styles.input}
          value={memberInput}
          onChange={e => setMemberInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMember()}
          placeholder={t.memberPlaceholder}
        />
        <button className={styles.addMemberBtn} onClick={addMember}>{t.addMember}</button>
      </div>
      {members.length > 0 && (
        <div className={styles.memberChips}>
          {members.map(m => (
            <span key={m} className={styles.memberChip}>
              <Avatar name={m} size={18} />
              {m}
              <button className={styles.chipRemove} onClick={() => setMembers(prev => prev.filter(x => x !== m))}>×</button>
            </span>
          ))}
        </div>
      )}
      <label className={styles.label}>{t.tripCurrency ?? 'Currency'}</label>
      <div className={styles.currencyRow}>
        {CURRENCIES.map(c => (
          <button
            key={c.code}
            type="button"
            className={`${styles.currencyChip} ${currency === c.code ? styles.currencyChipActive : ''}`}
            onClick={() => setCurrency(c.code)}
          >{c.label}</button>
        ))}
      </div>
      <div className={styles.formActions}>
        <button className={styles.saveBtn} onClick={() => { if (name.trim()) onSave(name, members, currency) }} disabled={!name.trim()}>
          {t.tripCreate ?? 'Create trip'}
        </button>
        <button className={styles.cancelBtn} onClick={onCancel}>{t.receiptCancel}</button>
      </div>
    </div>
  )
}

// ── Settlement + summary section ────────────────────────────────────────────
function TripSummarySection({ trip, entries, tripSummary }) {
  const summary = tripSummary(trip.id, entries)
  if (!summary || summary.grandTotal === 0) return null

  return (
    <div className={styles.summarySection}>
      {/* Per-person owed */}
      <div className={styles.summaryTitle}>สรุปยอด</div>
      {trip.members.map(m => (
        <div key={m} className={styles.summaryRow}>
          <span className={styles.summaryName}>
            <Avatar name={m} size={20} />
            {m}
          </span>
          <span className={styles.summaryAmt}>{fmtAmount(summary.owed[m] ?? 0, summary.currency)}</span>
        </div>
      ))}
      <div className={styles.summaryTotal}>
        <span>รวม</span>
        <span>{fmtAmount(summary.grandTotal, summary.currency)}</span>
      </div>

      {/* Settlement transfers */}
      {summary.hasPayers && summary.settlements.length > 0 && (
        <>
          <div className={styles.summaryTitle} style={{ marginTop: 14 }}>
            💸 ใครโอนให้ใคร
          </div>
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
                {fmtAmount(s.amount, summary.currency)}
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
          💡 เลือกว่าใครจ่ายแต่ละบิลเพื่อคำนวณยอดโอน
        </div>
      )}
    </div>
  )
}

// ── Trip detail view ────────────────────────────────────────────────────────
function TripDetail({ trip, entries, tripSummary, onBack, onAddBill, onRemoveBill, onLoadBill, onEditTrip, onSetPayer }) {
  const { t } = useLang()
  const tripBills = trip.billIds
    .map(id => entries.find(e => e.id === id))
    .filter(Boolean)
  const paidBy = trip.paidBy || {}

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack}>← {t.tripBack ?? 'Trips'}</button>
        <button className={styles.editBtn} onClick={onEditTrip}>✏️</button>
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
      <TripSummarySection trip={trip} entries={entries} tripSummary={tripSummary} />
      <div className={styles.billsTitle}>{t.tripBills ?? 'Bills'} ({tripBills.length})</div>
      {tripBills.length === 0 && (
        <p className={styles.empty}>{t.tripNoBills ?? 'No bills yet — add one below'}</p>
      )}
      {tripBills.map(entry => {
        const totalAmt = entry.state?.result?.grandTotal
        const payer = paidBy[entry.id] || ''
        return (
          <div key={entry.id} className={styles.billCard} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className={styles.billCardMain} onClick={() => onLoadBill(entry)}>
                <span className={styles.billCardName}>{entry.billName || t.unnamedBill}</span>
                <span className={styles.billCardDate}>{fmtDate(entry.savedAt)}</span>
                {totalAmt > 0 && (
                  <span className={styles.billCardAmt}>{fmtAmount(totalAmt, trip.currency)}</span>
                )}
              </button>
              <button className={styles.billCardRemove} onClick={() => onRemoveBill(trip.id, entry.id)} aria-label="Remove from trip">×</button>
            </div>
            {/* Payer selector — only shown when trip has members */}
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
      <button className={styles.addBillBtn} onClick={onAddBill}>
        + {t.tripAddBill ?? 'Add bill to trip'}
      </button>
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
export default function TripsTab({ entries, onLoadBill, onNewBillForTrip }) {
  const { trips, createTrip, updateTrip, deleteTrip, addBillToTrip, removeBillFromTrip, setBillPayer, getTrip, tripSummary } = useTripsStore()
  const [view, setView] = useState('list')   // 'list' | 'detail' | 'new'
  const [activeTrip, setActiveTrip] = useState(null)
  const [addingBill, setAddingBill] = useState(false)

  const handleNew = () => setView('new')
  const handleSave = (name, members, currency) => {
    const trip = createTrip(name, members, currency)
    setActiveTrip(trip)
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

  const handleLoadBill = (entry) => { onLoadBill(entry) }

  // Bill picker — shows history entries to add to trip
  const BillPicker = () => {
    const available = entries.filter(e => !activeTrip.billIds.includes(e.id))
    const { t } = useLang()
    return (
      <div className={styles.picker}>
        <div className={styles.pickerHeader}>
          <span>{t.tripPickBill ?? 'Pick a bill to add'}</span>
          <button className={styles.closeBtn} onClick={() => setAddingBill(false)}>×</button>
        </div>
        {available.length === 0 && <p className={styles.empty}>{t.tripNoBillsToAdd ?? 'No saved bills to add'}</p>}
        {available.map(entry => (
          <button key={entry.id} className={styles.pickerRow} onClick={() => {
            addBillToTrip(activeTrip.id, entry.id)
            setActiveTrip(prev => ({ ...prev, billIds: [...prev.billIds, entry.id] }))
            setAddingBill(false)
          }}>
            <span className={styles.billCardName}>{entry.billName || t.unnamedBill}</span>
            <span className={styles.billCardDate}>{fmtDate(entry.savedAt)}</span>
          </button>
        ))}
        <button className={styles.cancelBtn} style={{ marginTop: 12 }} onClick={() => setAddingBill(false)}>{t.receiptCancel}</button>
      </div>
    )
  }

  if (addingBill && activeTrip) return <BillPicker />
  if (view === 'new') return <NewTripForm onSave={handleSave} onCancel={() => setView('list')} />
  if (view === 'detail' && activeTrip) {
    const trip = getTrip(activeTrip.id) ?? activeTrip
    return (
      <TripDetail
        trip={trip}
        entries={entries}
        tripSummary={tripSummary}
        onBack={handleBack}
        onAddBill={handleAddBill}
        onRemoveBill={handleRemoveBill}
        onLoadBill={handleLoadBill}
        onEditTrip={() => {}}
        onSetPayer={handleSetPayer}
      />
    )
  }
  return <TripList trips={trips} onSelect={handleSelect} onNew={handleNew} />
}
