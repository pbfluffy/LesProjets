import { useEffect, useRef, useState } from 'react'
import { auth, GoogleAuthProvider, signInWithPopup, signOut } from '../firebase.js'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './AccountButton.module.css'

const STATUS_LABEL_KEY = { syncing: 'acctSyncing', synced: 'acctSynced', error: 'acctSyncError' }

export default function AccountButton({ user, syncStatus }) {
  const { s } = useLang()
  const [open, setOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSignIn() {
    if (signingIn) return
    setSigningIn(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      setOpen(false)
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        console.warn('[acct] sign-in failed:', e)
      }
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    try { await signOut(auth) } catch (e) { console.warn('[acct] sign-out failed:', e) }
    setOpen(false)
  }

  const dotStatus = user ? syncStatus : null

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={styles.avatarBtn}
        data-photo={user?.photoURL ? 'true' : 'false'}
        onClick={() => setOpen((o) => !o)}
        aria-label={user ? user.email : s.acctSignIn}
        title={user ? user.email : s.acctSignIn}
      >
        {user?.photoURL ? <img className={styles.avatarImg} src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <Icon name="user" size={16} />}
        {dotStatus && dotStatus !== 'idle' && <span className={styles.dot} data-status={dotStatus} />}
      </button>

      {open && (
        <div className={styles.popover}>
          {user ? (
            <>
              <div className={styles.row}>
                {user.photoURL && <img className={styles.rowAvatar} src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
                <div className={styles.rowText}>
                  <div className={styles.email}>{user.email}</div>
                </div>
              </div>
              {STATUS_LABEL_KEY[syncStatus] && (
                <div className={styles.statusLine}>
                  <span className={styles.statusDot} data-status={syncStatus} />
                  {s[STATUS_LABEL_KEY[syncStatus]]}
                </div>
              )}
              <button className={styles.signOutBtn} onClick={handleSignOut}>{s.acctSignOut}</button>
            </>
          ) : (
            <>
              <div className={styles.blurb}>{s.acctSyncBlurb}</div>
              <button className={styles.googleBtn} onClick={handleSignIn} disabled={signingIn}>
                <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.72v2.27h2.9c1.7-1.57 2.69-3.88 2.69-6.63z"/><path fill="#34A853" d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.9-2.27c-.8.55-1.84.87-3.05.87a5.36 5.36 0 0 1-5.03-3.7H1v2.34A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H1A9 9 0 0 0 0 9c0 1.45.35 2.83.97 4.06l3-2.34z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0a9 9 0 0 0-8.03 4.94l3 2.34A5.36 5.36 0 0 1 9 3.58z"/></svg>
                {signingIn ? s.acctSigningIn : s.acctContinueWithGoogle}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
