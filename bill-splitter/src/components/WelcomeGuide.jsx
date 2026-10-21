import { useLang } from '../LangContext'
import styles from './WelcomeGuide.module.css'

/**
 * "How to use" link at the end of the Split Bill tab: replays the guided
 * tour (Tour.jsx), which replaced the old static "How to split a bill" card.
 */
export default function HowToUseLink({ onClick }) {
  const { t } = useLang()
  return (
    <div className={styles.reopenRow} data-snapshot-hide>
      <button type="button" className={styles.reopen} onClick={onClick}>{t.guideReopen}</button>
    </div>
  )
}
