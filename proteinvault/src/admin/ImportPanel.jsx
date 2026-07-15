import { useState } from 'react'
import { IMPORT_WORKER_URL } from './config.js'

// Detects which backend route to call from the pasted URL's hostname.
function detectEndpoint(url) {
  try {
    const { hostname } = new URL(url)
    if (hostname.endsWith('shopee.co.th')) return 'fetch-shopee'
    if (hostname === 'shop.villamarket.com') return 'fetch-villa'
  } catch {
    // not a valid URL at all — falls through to null below
  }
  return null
}

// Calls the standalone Cloudflare Worker (see worker/) backing Shopee and
// Villa Market imports. Best-effort only: pre-fills name/price/image, the
// structured fields each shop's own API exposes. Protein, macros, and
// country are never auto-parsed here — they live in inconsistent freeform
// seller text, and guessing at them on a health-adjacent site is worse
// than typing them in (see the sourcing notes in src/data/listings.js for
// why this project already treats that data as something to confirm
// carefully, not infer). Neither shop's endpoint is official/documented,
// so this degrades to "nothing pre-filled" on any failure rather than
// blocking the form.
export default function ImportPanel({ onImport }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFetch() {
    const trimmed = url.trim()
    if (!trimmed) return

    const endpoint = detectEndpoint(trimmed)
    if (!endpoint) {
      setStatus('error')
      setErrorMsg('Paste a Shopee (shopee.co.th) or Villa Market (shop.villamarket.com) product link.')
      return
    }
    if (!IMPORT_WORKER_URL) {
      setStatus('error')
      setErrorMsg('Import backend not configured — set VITE_IMPORT_WORKER_URL (see README).')
      return
    }

    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`${IMPORT_WORKER_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
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
      <div className="label">Import from Shopee or Villa Market (optional)</div>
      <div className="admin-field-row">
        <input
          className="input"
          placeholder="Paste a Shopee or Villa Market product link"
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
