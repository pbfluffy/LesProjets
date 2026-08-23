import { useRef } from 'react'
import { useLang } from '../LangContext.jsx'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import styles from './ConflictModal.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// Deep-ish equality good enough for these plain JSON-shaped values (arrays/
// objects of primitives) — order-sensitive for watchlist (a user-arranged
// list), which is fine since a real reorder is itself a real difference.
// `fallback` normalizes a missing/undefined side (e.g. a pre-price-alerts
// Firestore doc with no `alerts` field at all) to the same empty shape the
// rest of the app already treats as "nothing set" — without it, "missing"
// and "empty" would misreport as a real difference.
function differs(a, b, fallback) {
  return JSON.stringify(a ?? fallback) !== JSON.stringify(b ?? fallback)
}

// Which synced fields actually differ, in the same terms a user recognizes
// from the UI — this is what actually decides whether the modal shows up
// (see useCloudSyncCore's conflictFp comparing all of these together), so
// naming them here is what makes the choice make sense instead of two
// same-looking cards with no visible reason to pick one over the other.
const DIFF_FIELDS = [
  { key: 'watchlist', labelKey: 'conflictDiffWatchlist', fallback: [] },
  { key: 'currency', labelKey: 'conflictDiffCurrency', fallback: null },
  { key: 'range', labelKey: 'conflictDiffRange', fallback: null },
  { key: 'tags', labelKey: 'conflictDiffTags', fallback: {} },
  { key: 'holdings', labelKey: 'conflictDiffHoldings', fallback: {} },
  { key: 'knownFor', labelKey: 'conflictDiffKnownFor', fallback: {} },
  { key: 'alerts', labelKey: 'conflictDiffAlerts', fallback: {} },
]

// Shown when this account already has a synced watchlist that doesn't
// match this device's local one. Deliberately simpler than bill-splitter's
// version (no second "are you sure" step) — a ticker watchlist is low-stakes
// and trivially rebuilt, unlike bill history.
export default function ConflictModal({ localData, cloudData, onUseLocal, onUseCloud }) {
  const { s, lang } = useLang()
  const modalRef = useRef(null)
  useFocusTrap(modalRef)

  const localCount = localData.watchlist.length
  const cloudCount = Array.isArray(cloudData?.watchlist) ? cloudData.watchlist.length : 0
  const cloudWhen = cloudData?.lastModified?.toDate ? cloudData.lastModified.toDate() : null
  const fmtWhen = (d) => d.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  const diffLabels = DIFF_FIELDS
    .filter(({ key, fallback }) => differs(localData[key], cloudData?.[key], fallback))
    .map(({ labelKey }) => s[labelKey])

  return (
    <div className={styles.overlay}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="conflict-modal-title">
        <div className={styles.title} id="conflict-modal-title">{s.conflictTitle}</div>
        <div className={styles.body}>{s.conflictBody}</div>
        {diffLabels.length > 0 && (
          <div className={styles.diffLine}>{interp(s.conflictDiffIntro, { list: diffLabels.join(s.conflictDiffSeparator) })}</div>
        )}
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>{s.conflictThisDevice}</div>
            <div className={styles.cardCount}>{interp(s.conflictTickerCount, { n: localCount })}</div>
            <div className={styles.cardWhen}>{s.conflictThisDeviceHint}</div>
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
