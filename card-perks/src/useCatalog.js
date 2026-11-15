import { useEffect, useState } from 'react'
import { db, collection, getDocs } from './firebase.js'

// The privilege catalog the scanner (card-perks/scanner) publishes from banks'
// official pages: Firestore cardCatalog/{bankId} = { bank, cards: [...], scannedAt }.
// Read-only here; only the scheduled job writes it. If it can't be loaded the app
// still works with the user's own cards and typed-in privileges, so a failure
// is reported as 'error' but never blocks anything.
export function useCatalog(user) {
  const [catalog, setCatalog] = useState({})
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    if (!user) { setCatalog({}); setStatus('loading'); return }
    let cancelled = false
    getDocs(collection(db, 'cardCatalog'))
      .then((snap) => {
        if (cancelled) return
        const out = {}
        snap.forEach((d) => { out[d.id] = d.data() })
        setCatalog(out)
        setStatus('ready')
      })
      .catch((e) => { console.warn('[catalog] load failed:', e?.code); if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [user])

  return { catalog, catalogStatus: status }
}
