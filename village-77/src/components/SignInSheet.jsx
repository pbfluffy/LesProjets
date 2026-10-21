import { useLangContext } from '../LangContext'
import { inLineApp, LIFF_URL } from '../liff'
import styles from './ui.module.css'

// On an iPhone outside LINE (Safari, Chrome), LINE's web login page can show
// an email / password form and "Unable to log in" instead of handing over to
// the LINE app. Opening the app inside LINE avoids that page entirely.
const isIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent)
const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

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
        {ready && !inLineApp && isPhone && LIFF_URL && (
          <a className={styles.secondaryBtn} href={LIFF_URL}>📱 {t.openInLineApp}</a>
        )}
        {ready && !inLineApp && isIphone && (
          <p className={styles.signInTip}>💡 {t.lineLoginTip}</p>
        )}
        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  )
}
