import { useState } from 'react'
import { auth, GoogleAuthProvider, signInWithPopup } from '../firebase.js'

export default function LoginGate() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function signIn() {
    if (busy) return
    setBusy(true); setError(false)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        console.warn('[auth] sign-in failed:', e)
        setError(true)
      }
    } finally { setBusy(false) }
  }

  return (
    <main className="gate">
      <div className="gate-card">
        <div className="gate-icon">💳</div>
        <h1>Card Perks</h1>
        <p>Sign in to add your credit cards and check which privileges you can use.</p>
        <button className="btn primary" onClick={signIn} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && <p className="error" role="alert">Sign-in failed. Please try again.</p>}
        <p className="fine">Your cards are private to your account. Never enter card numbers — only the card name and its perks.</p>
      </div>
    </main>
  )
}
