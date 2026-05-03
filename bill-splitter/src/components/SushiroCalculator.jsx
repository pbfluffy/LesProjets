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

  const handleAdd = () => {
    const ok = onAdd(person, name, price)
    if (ok) { setName(''); setPrice('') }
  }

  return (
    <div className={styles.snackAdder}>
      <input
        type="text"
        placeholder="ชื่อ���องกินหา (ไม่เล่น)"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className={styles.snackName}
      />
      <div className={styles.snackPriceWrap}>
        <span className={styles.bahtSign}>฿</span>
        <input
          type="number"
          placeholder="รีก