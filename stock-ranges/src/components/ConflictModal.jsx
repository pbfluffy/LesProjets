import { useLang } from '../LangContext.jsx'
import styles from './ConflictModal.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// Shown when this account already has a synced watchlist that doesn't
// match this device's local one. Deliberately simpler than bill-splitter's
// version (no second "are you sure" step) — a ticker watchlist is low-stakes
// and trivially rebuilt, unlike bill history.
export default function ConflictModal({ localData, cloudData, onUseLocal, onUseCloud }) {
  const { s, lang } = useLang()
  const localCount = localData.watchlist.length
  const cloudCount = Array.isArray(cloudData?.watchlist) ? cloudData.watchlist.length : 0
  const cloudWhen = cloudData?.lastModified?.toDate ? cloudData.lastModified.toDate() : null
  const fmtWhen = (d) => d.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.title}>{s.conflictTitle}</div>
        <div className={styles.body}>{s.conflictBody}</div>
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>{s.conflictThisDevice}</div>
            <div className={styles.cardCount}>{interp(s.conflictTickerCount, { n: localCount })}</div>
            <div className={styles.cardWhen}>{s.conflictNeverSaved}</div>
            <button className={styles.useBtn} onClick={onUseLocal}>{s.conflictUse}</button>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>{s.conflictOtherDevice}</div>
            <div className={styles.cardCount}>{interp(s.conflictTickerCount, { n: cloudCount })}</div>
            <div className={styles.cardWhen}>{cloudWhen ? interp(s.conflictLastSaved, { when: fmtWhen(cloudWhen) }) : s.conflictNeverSaved}</div>
            <button className={styles.useBtn} onClick={onUseCloud}>{s.conflictUse}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
