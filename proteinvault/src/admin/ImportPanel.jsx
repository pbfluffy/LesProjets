import { useState } from 'react'
import { IMPORT_WORKER_URL } from './config.js'

// Detects which backend route to call from the pasted URL's hostname.
// Tops isn't listed here on purpose — the Worker has a /api/fetch-tops
// route, but it's confirmed blocked in production (Tops' WAF rejects
// Cloudflare Workers' own IP ranges), so it's never offered in the UI.
function detectEndpoint(url) {
  try {
    const { hostname } = new URL(url)
    if (hostname.endsWith('shopee.co.th')) return 'fetch-shopee'
    if (hostname === 'shop.villamarket.com') return 'fetch-villa'
    if (hostname.endsWith('nutritiondepot.co.th')) return 'fetch-nutritiondepot'
  } catch {
    // not a valid URL at all — falls through to null below
  }
  return null
}

// Matches the same hostname to a shop id from src/data/shops.js, so
// FlavorForm can auto-select that shop and fill in its URL field — no
// reason to make the admin paste the same link twice.
function detectShopId(url) {
  try {
    const { hostname } = new URL(url)
    if (hostname.endsWith('shopee.co.th')) return 'shopee-thailand'
    if (hostname === 'shop.villamarket.com') return 'villa-market'
    if (hostname.endsWith('nutritiondepot.co.th')) return 'nutrition-depot'
  } catch {
    // not a valid URL at all — falls through to null below
  }
  return null
}

// Calls the standalone Cloudflare Worker (see worker/) backing product
// imports. Best-effort only: pre-fills name/price/image, the structured
// fields each shop's own page exposes. Protein, macros, and country are
// never auto-parsed here — they live in inconsistent freeform seller
// text, and guessing at them on a health-adjacent site is worse than
// typing them in (see the sourcing notes in src/data/listings.js for why
// this project already treats that data as something to confirm
// carefully, not infer). None of these are official/documented APIs
// except Nutrition Depot's (a standard Shopify storefront feature), so
// this degrades to "nothing pre-filled" on any failure rather than
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
      setErrorMsg('Paste a Shopee, Villa Market, or Nutrition Depot product link.')
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
      onImport({ ...data, attributesText, shopId: detectShopId(trimmed) })
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Could not fetch that listing — fill in the fields manually.')
    }
  }

  return (
    <div className="admin-import-panel">
      <div className="label">Import from Shopee, Villa Market, or Nutrition Depot (optional)</div>
      <div className="admin-field-row">
        <input
          className="input"
          placeholder="Paste a product link"
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
