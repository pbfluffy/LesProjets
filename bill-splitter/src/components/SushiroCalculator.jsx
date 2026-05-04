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
              