import { useLangContext } from '../LangContext'
import styles from './ui.module.css'

// Asks for LINE sign-in before posting or rating. `ready` is false until a
// LINE Login channel id is set in config.js.
export default function SignInSheet({ ready, onLine, onClose }) {
  const { t } = useLangContext()
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.sheet} ${styles.signInSheet}`}>
        <h2 className={styles.sheetTitle}>{t.signInTitle}</h2>
        <p className={styles.hint}>{t.signInWhy}</p>
        {ready ? (
          <button type="button" className={styles.lineSignIn} onClick={onLine}>
            <span aria-hidden="true">💬</span> {t.signInWithLine}
          </button>
        ) : (
          <p className={styles.error}>{t.lineNotReady}</p>
        )}
        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  )
}
