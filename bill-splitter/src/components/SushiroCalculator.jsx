import { useState } from 'react'
import { useSushiroStore, PLATES } from '../hooks/useSushiroStore'
import { useLang } from '../LangContext'
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
  const { t } = useLang()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const handleAdd = () => { const ok = onAdd(person, name, price); if (ok) { setName(''); setPrice('') } }
  return (
    <div className={styles.snackAdder}>
      <input type="text" placeholder={t.snackName} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackName} />
      <div className={styles.snackPriceWrap}>
        <span className={styles.bahtSign}>฿</span>
        <input type="number" placeholder={t.snackPrice} value={price} min="0" onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackPrice} />
      </div>
      <button type="button" className={styles.snackAddBtn} onClick={handleAdd}>+</button>
    </div>
  )
}

export default function SushiroCalculator() {
  const store = useSushiroStore()
  const result = store.calculate()
  const { t } = useLang()
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  const handleAddPerson = () => {
    const ok = store.addPerson(nameInput)
    if (ok) { setNameInput(''); setNameError('') }
    else if (nameInput.trim()) { setNameError(t.nameTaken); setTimeout(() => setNameError(''), 1500) }
  }

  return (
    <div>
      <section className={styles.section}>
        <h2 className={styles.title}>{t.people}</h2>
        <div className={styles.inputRow}>
          <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPerson()} placeholder={t.personPlaceholder} className={nameError ? styles.inputError : ''} />
          <button type="button" className={styles.addBtn} onClick={handleAddPerson}>{t.addPerson}</button>
