import { useLang } from '../../contexts/LangContext'
import { tr } from '../../lib/tr'
import styles from './NodeCard.module.css'

export default function NodeCard({ node, formula, locked, onSelect }) {
  const { lang } = useLang()
  const isBoss = node.type === 'boss'

  if (isBoss) {
    return (
      <div
        className={`${styles.boss} ${locked ? styles.locked : ''}`}
        title={node.label}
      >
        <div className={styles.bossIcon}>⚔</div>
        <div className={styles.bossLabel}>{node.label}</div>
        <div className={styles.bossNote}>{lang === 'th' ? 'อยู่ระหว่างพัฒนา' : 'Under development'}</div>
      </div>
    )
  }

  if (!formula) return null

  return (
    <button
      className={`${styles.node} ${locked ? styles.locked : ''}`}
      onClick={() => !locked && onSelect(formula.id)}
      style={{
        '--accent': formula.accent,
        '--accent-soft': formula.accentLight,
      }}
      disabled={locked}
    >
      <div className={styles.emoji} aria-hidden="true">
        {formula.emoji}
      </div>
      <div className={styles.label}>{formula.label}</div>
      <div className={styles.tagline}>{tr(formula.tagline, lang)}</div>
    </button>
  )
}
