import { useLang } from '../LangContext'
import styles from './StickyBottomBar.module.css'

// Feature #76 Phase C — fixed bottom bar showing the running total.
// Hidden until the user has added members AND the bill has a non-zero total.
// Tap scrolls smoothly to the Result section (data-bill-result anchor).
export default function StickyBottomBar({ memberCount, grandTotal }) {
  const { t } = useLang()
  if (memberCount === 0 || grandTotal === 0) return null

  const handleTap = () => {
    const target = document.querySelector('[data-bill-result]')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }

  return (
    <button type="button" className={styles.bar} onClick={handleTap} aria-label={t.total || 'Total'}>
      <span className={styles.label}>{t.total || 'Total'}</span>
      <span className={styles.amount}>฿{grandTotal.toFixed(2)}</span>
      <span className={styles.chevron} aria-hidden="true">›</span>
    </button>
  )
}
