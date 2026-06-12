import { useState, useEffect } from 'react'
import { useLang } from '../LangContext'
import styles from './StickyBottomBar.module.css'

// Feature #76 Phase C — fixed bottom bar showing the running total.
// Visible only when (a) the bill has members + a non-zero total, AND
// (b) the Result section isn't currently in view. A "tap to jump to Result"
// CTA is meaningless when Result is already on screen, so the bar auto-hides
// once the user scrolls down to it (#78).
export default function StickyBottomBar({ memberCount, grandTotal, currencySymbol = '฿' }) {
  const { t } = useLang()
  const [isResultVisible, setIsResultVisible] = useState(false)

  useEffect(() => {
    const target = document.querySelector('[data-bill-result]')
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsResultVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  if (memberCount === 0 || grandTotal === 0 || isResultVisible) return null

  const handleTap = () => {
    const target = document.querySelector('[data-bill-result]')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }

  return (
    <button type="button" className={styles.bar} onClick={handleTap} aria-label={t.total || 'Total'}>
      <span className={styles.label}>{t.total || 'Total'}</span>
      <span className={styles.amount}>{currencySymbol}{grandTotal.toFixed(2)}</span>
      <span className={styles.chevron} aria-hidden="true">›</span>
    </button>
  )
}
