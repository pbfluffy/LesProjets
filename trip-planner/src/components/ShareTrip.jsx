import { useState } from 'react'
import { shareTrip } from '../api.js'

const EXPIRY_OPTIONS = [15, 30, 60, 90]

function shareUrlFor(id) {
  return `${window.location.origin}${window.location.pathname}#/t/${id}`
}

export default function ShareTrip({ trip }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleCreateLink() {
    setBusy(true)
    setError('')
    try {
      const { id, expiresAt } = await shareTrip({ trip, days })
      setLink({ url: shareUrlFor(id), expiresAt })
    } catch (err) {
      setError(err.message || 'Could not create a link — try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost share-toggle" onClick={() => setOpen(true)}>
        Share this trip
      </button>
    )
  }

  return (
    <div className="share-panel">
      {!link ? (
        <>
          <span className="field-label">Link expires after</span>
          <div className="share-expiry-options">
            {EXPIRY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={days === d}
                onClick={() => setDays(d)}
              >
                {d} days
              </button>
            ))}
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="share-actions">
            <button type="button" className="btn-primary" onClick={handleCreateLink} disabled={busy}>
              {busy ? 'Creating link…' : 'Create link'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="field-label">Anyone with this link can view this trip</span>
          <div className="share-link-row">
            <input className="share-link-input" readOnly value={link.url} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn-primary" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <span className="share-expires-note">Expires {new Date(link.expiresAt).toLocaleDateString()}</span>
        </>
      )}
    </div>
  )
}
