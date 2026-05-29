import { useLang } from '../LangContext'
import styles from './BillHistory.module.css'
import { PLATES } from '../hooks/useSushiroStore'

function fmt(n) { return (Number(n) || 0).toFixed(2) }

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
  if (entry.tab === 'sushi') {
    const people = Array.isArray(s.people) ? s.people : []
    const plates = s.plates || {}
    const snacks = s.snacks || {}
    let totalPlates = 0, subtotal = 0
    people.forEach(name => {
      const pp = plates[name] || {}
      PLATES.forEach(p => { const c = pp[p.id] || 0; totalPlates += c; subtotal += c * p.price })
      ;(snacks[name] || []).forEach(item => { subtotal += Number(item.price) || 0 })
    })
    let mul = 1
    if (s.serviceChargeEnabled) mul *= 1.10
    if (s.vatEnabled) mul *= 1.07
    return `${people.length} ${t.people} · ${totalPlates} ${t.plates} · ฿${fmt(subtotal * mul)}`
  }
  const members = Array.isArray(s.members) ? s.members : []
  const foods = Array.isArray(s.foods) ? s.foods : []
  let subtotal = 0
  foods.forEach(f => {
    const price = parseFloat(f.price) || 0
    if (!price || !Array.isArray(f.who) || !f.who.length) return
    subtotal += price
  })
  const scRate = Math.max(0, Math.min(100, parseFloat(s.serviceChargeRate) || 0))
  const scFraction = s.serviceChargeEnabled ? scRate / 100 : 0
  let multiplier = 1 + scFraction
  if (s.vatEnabled) multiplier *= 1.07
  return `${members.length} ${t.people} · ${foods.length} ${t.items} · ฿${fmt(subtotal * multiplier)}`
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
