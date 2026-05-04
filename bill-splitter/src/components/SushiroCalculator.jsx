import { useState } from 'react'
import { useSushiroStore, PLATES } from '../hooks/useSushiroStore'
import styles from './SushiroCalculator.module.css'

const fmt = n => n.toFixed(2)

function Counter({ value, onInc, onDec }) {
  return (
    <div className={styles.counter}>
      <button type="button" className={styles.cntBtn} onClick={onDec}>−</button>
      <span className={styles.cntVal}>{value}</span>
      <button type="button" className={styles.cntBtn} onClick={onInc}>+</button>
    </div>
  )
}

function SnackAdder({ person, onAdd }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const handleAdd = () => { const ok = onAdd(person, name, price); if (ok) { setName(''); setPrice('') } }
  return (
    <div className={styles.snackAdder}>
      <input type="text" placeholder="ชื่อรายการ (ไม่บังคับ)" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackName} />
      <div className={styles.snackPriceWrap}>
        <span className={styles.bahtSign}>฿</span>
        <input type="number" placeholder="ราคา" value={price} min="0" onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackPrice} />
      </div>
      <button type="button" className={styles.snackAddBtn} onClick={handleAdd}>+</button>
    </div>
  )
}

export default function SushiroCalculator() {
  const store = useSushiroStore()
  const result = store.calculate()
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  const handleAddPerson = () => {
    const ok = store.addPerson(nameInput)
    if (ok) { setNameInput(''); setNameError('') }
    else if (nameInput.trim()) { setNameError('ชื่อนี้มีแล้ว'); setTimeout(() => setNameError(''), 1500) }
  }

  return (
    <div>
      <section className={styles.section}>
        <h2 className={styles.title}>คนที่กิน</h2>
        <div className={styles.inputRow}>
          <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPerson()} placeholder="ชื่อ เช่น พุม, กีกี้" className={nameError ? styles.inputError : ''} />
          <button type="button" className={styles.addBtn} onClick={handleAddPerson}>+ เพิ่ม</button>
        </div>
        {nameError && <p className={styles.error}>{nameError}</p>}
        {store.people.length > 0 && (
          <div className={styles.personTabs}>
            {store.people.map(name => (
              <button type="button" key={name} className={`${styles.personTab} ${store.activePerson === name ? styles.personTabActive : ''}`} onClick={() => store.setActivePerson(name)}>
                <span className={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
                {name}
                <span className={styles.removePersonBtn} onClick={e => { e.stopPropagation(); store.removePerson(name) }}>×</span>
              </button>
            ))}
          </div>
        )}
        {store.people.length === 0 && <p className={styles.empty}>เพิ่มชื่อคนก่อน แล้วค่อยนับจานให้แต่ละคน</p>}
      </section>

      {store.activePerson && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>จานของ <span className={styles.activePersonBadge}>{store.activePerson}</span></h2>
            <button type="button" className={styles.resetBtn} onClick={store.resetAll}>รีเซ็ตทุกคน</button>
          </div>
          <div className={styles.plateList}>
            {PLATES.map(plate => {
              const count = (store.plates[store.activePerson] ?? {})[plate.id] ?? 0
              return (
                <div key={plate.id} className={styles.plateRow}>
                  <span className={styles.dot} style={{ background: plate.color, border: `2px solid ${plate.border}` }} />
                  <span className={styles.plateName}>{plate.label}</span>
                  <span className={styles.platePriceTag}>฿{plate.price}</span>
                  <Counter value={count} onInc={() => store.changePlate(store.activePerson, plate.id, 1)} onDec={() => store.changePlate(store.activePerson, plate.id, -1)} />
                  {count > 0 && <span className={styles.plateSubtotal}>฿{count * plate.price}</span>}
                </div>
              )
            })}
          </div>
          <div className={styles.snackSection}>
            <div className={styles.snackTitle}>🍟 ของกินเล่น / อื่นๆ</div>
            {(store.snacks[store.activePerson] ?? []).map(snack => (
              <div key={snack.id} className={styles.snackRow}>
                <span className={styles.snackRowName}>{snack.name}</span>
                <span className={styles.snackRowPrice}>฿{snack.price % 1 === 0 ? snack.price : fmt(snack.price)}</span>
                <button type="button" className={styles.snackRemove} onClick={() => store.removeSnack(store.activePerson, snack.id)}>×</button>
              </div>
            ))}
            <SnackAdder person={store.activePerson} onAdd={store.addSnack} />
          </div>
          {(() => { const sub = result.personSubtotals[store.activePerson] ?? 0; return sub > 0 ? (<div className={styles.personSubBar}><span>รวมของ {store.activePerson}</span><span className={styles.personSubAmt}>฿{sub.toLocaleString()}</span></div>) : null })()}
        </section>
      )}

      {store.people.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.title}>ตัวเลือก</h2>
          <div className={styles.toggles}>
            <label className={styles.toggle}><input type="checkbox" checked={store.vatEnabled} onChange={e => store.setVatEnabled(e.target.checked)} /><span>VAT</span><span className={`${styles.badge} ${styles.blue}`}>7%</span></label>
            <label className={styles.toggle}><input type="checkbox" checked={store.serviceChargeEnabled} onChange={e => store.setServiceChargeEnabled(e.target.checked)} /><span>Service Charge</span><span className={`${styles.badge} ${styles.green}`}>10%</span></label>
          </div>
        </section>
      )}

      {store.people.length > 0 && result.totalPlates > 0 && (
        <section className={styles.section}>
          <h2 className={styles.title}>สรุปรายคน</h2>
          <div className={styles.personSummaryList}>
            {store.people.map(name => {
              const total = result.personTotals[name] ?? 0
              const pct = result.grandTotal > 0 ? (total / result.grandTotal) * 100 : 0
              const usedPlates = PLATES.filter(p => ((store.plates[name] ?? {})[p.id] ?? 0) > 0)
              const personSnacks = store.snacks[name] ?? []
              return (
                <div key={name} className={styles.personSummaryCard}>
                  <div className={styles.personSummaryHeader}>
                    <div className={styles.personSummaryLeft}>
                      <span className={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
                      <div>
                        <div className={styles.personSummaryName}>{name}</div>
                        <div className={styles.personPlateDots}>
                          {usedPlates.map(p => <span key={p.id} className={styles.plateDotSmall} style={{ background: p.color, border: `1px solid ${p.border}` }} title={p.label} />)}
                          {usedPlates.length > 0 && <span className={styles.personPlateCount}>{PLATES.reduce((s,p) => s+((store.plates[name]??{})[p.id]??0),0)} จาน</span>}
                          {personSnacks.length > 0 && <span className={styles.snackCount}>+ {personSnacks.length} รายการ</span>}
                        </div>
                      </div>
                    </div>
                    <span className={styles.personSummaryAmt}>฿{fmt(total)}</span>
                  </div>
                  <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>
          <div className={styles.grandTotalBox}>
            <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>ยอดอาหาร</span><span>฿{fmt(result.subtotal)}</span></div>
            {result.serviceCharge > 0 && <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>Service Charge (10%)</span><span>฿{fmt(result.serviceCharge)}</span></div>}
            {result.vat > 0 && <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>VAT (7%)</span><span>฿{fmt(result.vat)}</span></div>}
            <div className={`${styles.grandTotalRow} ${styles.grandTotalFinal}`}><span>รวมทั้งหมด ({result.totalPlates} จาน)</span><span>฿{fmt(result.grandTotal)}</span></div>
          </div>
        </section>
      )}
    </div>
  )
}
