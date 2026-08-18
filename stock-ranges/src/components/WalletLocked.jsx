import { useState } from 'react'
import { auth, GoogleAuthProvider, signInWithPopup } from '../firebase.js'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './WalletLocked.module.css'

// Wallet holds real position data (qty, cost basis) that's only useful once
// synced across devices, so — unlike the Watchlist, which works fine as a
// local-only list — it's gated behind sign-in rather than offered signed-out
// with a "you'll lose this" caveat.
export default function WalletLocked() {
  const { s } = useLang()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState(false)

  async function handleSignIn() {
    if (signingIn) return
    setSigningIn(true)
    setError(false)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        console.warn('[wallet] sign-in failed:', e)
        setError(true)
      }
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className={styles.locked}>
      <Icon name="briefcase" size={28} strokeWidth={1.5} />
      <div className={styles.title}>{s.walletLockedTitle}</div>
      <p className={styles.body}>{s.walletLockedBody}</p>
      <button className={styles.signInBtn} onClick={handleSignIn} disabled={signingIn}>
        {signingIn ? s.acctSigningIn : s.acctContinueWithGoogle}
      </button>
      {error && <div className={styles.errorText}>{s.acctSignInError}</div>}
    </div>
  )
}
