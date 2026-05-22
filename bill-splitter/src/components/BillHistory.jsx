import { useLang } from '../LangContext'
import styles from './BillHistory.module.css'

function fmtWhen(ts, lang) {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  if (sameDay) return `${lang === 'th' ? 'วันนี้' : 'Today'} ${hh}:${mm}`
  if (isYesterday) return `${lang === 'th' ? 'เมื่อวาน' : 'Yesterday'} ${hh}:${mm}`
  const dd = d.getDate().toString().padStart(2, '0')
  const mo = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${dd}/${mo} ${hh}:${mm}`
}

function entrySummary(entry, t) {
  const s = entry.state || {}
  const memberCount = Array.isArray(s.members) ? s.members.length : 0
  const foodCount = Array.isArray(s.foods) ? s.foods.length : 0
  if (entry.tab === 'sushi') {
    return `${t.tabSushi}`
  }
  return `${memberCount} ${t.people} · ${foodCount} ${t.items}`
}

export default function BillHistory({ entries, onLoad, onRemove, onClear, onClose }) {
  const { t, lang } = useLang()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={styles.title}>{t.historyTitle}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {entries.length === 0 ? (
          <p className={styles.empty}>{t.historyEmpty}</p>
        ) : (
          <>
            <ul className={styles.list}>
              {entries.map(entry => (
                <li key={entry.id} className={styles.row}>
                  <button
                    className={styles.loadBtn}
                    onClick={() => onLoad(entry)}
                    title={t.historyLoad}
                  >
                    <span className={styles.rowName}>
                      {entry.billName || (entry.tab === 'sushi' ? `🍣 ${t.tabSushi}` : t.untitledBill)}
                    </span>
                    <span className={styles.rowMeta}>
                      {entrySummary(entry, t)} · {fmtWhen(entry.savedAt, lang)}
                    </span>
                  </button>
                  <button
                    className={styles.delBtn}
                    onClick={() => {
                      if (confirm(t.historyConfirmDelete)) onRemove(entry.id)
                    }}
                    title={t.removeLabel}
                    aria-label={t.removeLabel}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
            <button
              className={styles.clearBtn}
              onClick={() => {
                if (confirm(t.historyConfirmClear)) onClear()
              }}
            >
              {t.historyClearAll}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
