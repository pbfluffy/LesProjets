import { useAuth, signOutAdmin } from './useAuth.js'
import { useTheme } from '../hooks.js'
import { ADMIN_EMAIL } from './config.js'
import LoginForm from './LoginForm.jsx'
import AdminDashboard from './AdminDashboard.jsx'

export default function AdminApp() {
  useTheme()
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="empty-state">Loading…</div>
  }

  if (!user) {
    return <LoginForm />
  }

  if (user.email !== ADMIN_EMAIL) {
    // Defense-in-depth only, not the real gate — Firestore's own security
    // rules are what actually stop a non-admin account from writing.
    return (
      <div className="admin-auth-screen">
        <div className="admin-card admin-login-card">
          <h1 className="admin-login-title">Not authorized</h1>
          <p>This account isn't the ProteinVault admin.</p>
          <button type="button" className="btn" onClick={signOutAdmin}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return <AdminDashboard userEmail={user.email} />
}
