import { useState } from 'react'
import { useLang } from '../LangContext'
import styles from './WelcomeGuide.module.css'

const DISMISSED_KEY = 'billSplitter_guideDismissed'

function readDismissed() {
  try { return localStorage.getItem(DISMISSED_KEY) === '1' } catch { return false }
}

/**
 * First-run "how to split a bill" card for the Split Bill tab (same pattern
 * as Dog Near Me's welcome card). Shown until dismissed; afterwards a small
 * "How to use" link at the end of the tab brings it back.
 * Returns { card, reopenLink } so the caller can place them separately.
 */
export function useWelcomeGuide() {
  const { t } = useLang()
  const [open, setOpen] = useState(() => !readDismissed())

  const dismiss = () => {
    setOpen(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
  }
  const reopen = () => {
    setOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const card = open ? (
    <section className={styles.card} aria-labelledby="welcome-guide-title" data-snapshot-hide>
      <h2 id="welcome-guide-title" className={styles.title}>{t.guideTitle}</h2>
      <ol className={styles.steps}>
        {t.guideSteps.map((step, i) => <li key={i}>{step}</li>)}
      </ol>
      <p className={styles.more}>{t.guideMore}</p>
      <button type="button" className={styles.dismiss} onClick={dismiss}>{t.guideDismiss}</button>
    </section>
  ) : null

  const reopenLink = open ? null : (
    <div className={styles.reopenRow} data-snapshot-hide>
      <button type="button" className={styles.reopen} onClick={reopen}>{t.guideReopen}</button>
    </div>
  )

  return { card, reopenLink }
}
