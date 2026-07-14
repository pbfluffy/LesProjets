import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './styles.css'

// Hash-based split, not a router dependency — `#/admin` never reaches the
// server, so this works regardless of how this app is mounted/proxied
// under its parent domain. Admin isn't linked from the public UI.
const isAdmin = window.location.hash.startsWith('#/admin')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>{isAdmin ? <AdminApp /> : <App />}</ErrorBoundary>
  </React.StrictMode>,
)
