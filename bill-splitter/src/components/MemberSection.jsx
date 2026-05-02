import { useState } from 'react'
import styles from './MemberSection.module.css'

export default function MemberSection({ members, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const handleAdd = () => {
    const ok = onAdd(input)
    if (ok) { setInput(''); setError('') }
    else if (input.trim()) { setError('ชื่อนี้มีแล้ว'); setTimeout(() => setError(''), 1500) }
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>สมาชิก</h2>
      <div className={styles.inputRow}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleAdd()} placeholder="ชื่อสมาชิก" className={error ? styles.inputError : ''} />
        <button className={styles.addBtn} onClick={handleAdd}>+ เพิ่ม</button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {members.length > 0 && <div className={styles.tags}>{members.map(m => (<span key={m} className={styles.tag}><span className={styles.avatar}>{m.charAt(0).toUpperCase()}</span>{m}<button className={styles.removeBtn} onClick={() => onRemove(m)}>×</button></span>))}</div>}
      {members.length === 0 && <p className={styles.empty}>ยังไม่มีสมาชิก — เพิ่มชื่อด้านบนก่อนเลย</p>}
    </section>
  )
}
