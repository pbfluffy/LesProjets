import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import { auth, onAuthStateChanged } from '../firebase'
import Avatar from './Avatar'
import styles from './MemberSection.module.css'

export default function MemberSection({ members, onAdd, onRemove }) {
  const { t } = useLang()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  const handleAdd = () => {
    const ok = onAdd(input)
    if (ok) { setInput(''); setError('') }
    else if (input.trim()) {
      setError(t.nameTaken)
      setTimeout(() => setError(''), 1500)
    }
  }

  // Owner match: case-insensitive, trimmed. Pass photoURL only on match.
  const ownerName = user?.displayName?.trim().toLowerCase()
  const photoForName = (name) => {
    if (!user || !ownerName) return null
    return name.trim().toLowerCase() === ownerName ? user.photoURL : null
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
              <Avatar name={m} photoURL={photoForName(m)} size={20} />
              {m}
              <button className={styles.removeBtn} onClick={() => onRemove(m)} aria-label={`${t.removeLabel} ${m}`}>X</button>
            </span>
          ))}
        </div>
      )}
      {members.length === 0 && <p className={styles.empty}>{t.noMembers}</p>}
    </section>
  )
}
