import { useLangContext } from '../LangContext'
import styles from './ui.module.css'

// Shown only when the page is opened with ?admin (the link isn't anywhere in
// the app). Hiding it is just tidiness — firestore.rules are what actually
// keep non-admins out of admin data.
export default function AdminEntrySheet({ user, onGoogle, onSignOut, onClose }) {
  const { t } = useLangContext()
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.sheet} ${styles.signInSheet}`}>
        <h2 className={styles.sheetTitle}>🛡️ {t.navAdmin}</h2>
        {user ? (
          <>
            <p className={styles.error}>{t.adminNotAdmin}</p>
            <button type="button" className={styles.secondaryBtn} onClick={onSignOut}>{t.signOut}</button>
          </>
        ) : (
          <button type="button" className={styles.primaryBtn} onClick={onGoogle}>{t.adminSignIn}</button>
        )}
        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </div>
  )
}
