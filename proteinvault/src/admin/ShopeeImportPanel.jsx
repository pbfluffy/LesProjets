import { useState } from 'react'

// Calls the Cloudflare Pages Function at /api/fetch-shopee. Best-effort
// only: pre-fills name/price/image, the structured fields Shopee's own
// page exposes. Protein, macros, and country are never auto-parsed here —
// they live in inconsistent freeform seller text, and guessing at them on
// a health-adjacent site is worse than typing them in (see the sourcing
// notes in src/data/listings.js for why this project already treats that
// data as something to confirm carefully, not infer). On any failure this
// degrades to "nothing pre-filled" rather than blocking the form — the
// Shopee endpoint is unofficial and can break without notice.
export default function ShopeeImportPanel({ onImport }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFetch() {
    if (!url.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/fetch-shopee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Fetch failed (${res.status})`)
      }
      const data = await res.json()
      const attributesText = (data.attributes || []).map((a) => `${a.name}: ${a.value}`).join('\n')
      onImport({ ...data, attributesText })
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Could not fetch that listing — fill in the fields manually.')
    }
  }

  return (
    <div className="admin-import-panel">
      <div className="label">Import from Shopee (optional)</div>
      <div className="admin-field-row">
        <input
          className="input"
          placeholder="Paste a Shopee product or s.shopee.co.th link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="button" className="btn" onClick={handleFetch} disabled={status === 'loading'}>
          {status === 'loading' ? 'Fetching…' : 'Fetch'}
        </button>
      </div>
      {status === 'error' && <div className="admin-error">{errorMsg}</div>}
    </div>
  )
}
