import { useState } from 'react'
import { signInWithGoogle } from './useAuth.js'

// Only the account whose email matches ADMIN_EMAIL actually gets in — see
// AdminApp.jsx's "not authorized" screen and the Firestore rules (the real
// gate). Popup-closed/cancelled isn't a real error, so it's swallowed
// rather than shown as a scary message.
export default function LoginForm() {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setError('')
    setSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('Could not sign in with Google.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-auth-screen">
      <div className="admin-card admin-login-card">
        <h1 className="admin-login-title">ProteinVault admin</h1>
        {error && <div className="admin-error">{error}</div>}
        <button type="button" className="btn btn-primary" onClick={handleClick} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}
