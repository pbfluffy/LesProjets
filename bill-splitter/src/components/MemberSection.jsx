import { useState } from 'react'
import { useLang } from '../LangContext'
import styles from './MemberSection.module.css'

export default function MemberSection({ members, onAdd, onRemove }) {
  const { t } = useLang()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    const ok = onAdd(input)
    if (ok) { setInput(''); setError('') }
    else if (input.trim()) {
      setError(t.nameTaken)
      setTimeout(() => setError(''), 1500)
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t.members}</h2>
      <div className={styles.inputRow}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder={t.memberPlaceholder} className={error ? styles.inputError : ''} />
        <button className={styles.addBtn} onClick={handleAdd}>{t.addMember}</button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {members.length > 0 && (
        <div className={styles.tags}>
          {members.map(m => (
            <span key={m} className={styles.tag}>
              <span className={styles.avatar}>{m.charAt(0).toUpperCase()}</span>
              {m}
              <button className={styles.removeBtn} onClick={() => onRemove(m)} aria-label={`${t.removeLabel} ${m}`}>Ì7</button>
            </span>
          ))}
        </div>
      )}
      {members.length === 0 && <p className={styles.empty}>{t.noMembers}</p>}
    </section>
  )
}
