import { useEffect, useState } from 'react'
import { db, collection, getDocs } from './firebase.js'

// Restaurant promotions the scanner publishes: Firestore cardPromos/{bank}-dining-{n},
// each shard { bank, kind, part, parts, scannedAt, promos: [...] }. About 1,000
// promotions in total, so it is only fetched when the user actually holds a card
// from a bank that has promotions (`enabled`). Returns { [bank]: { promos, scannedAt } }.
export function usePromos(user, enabled) {
  const [promoData, setPromoData] = useState({})

  useEffect(() => {
    if (!user || !enabled) { setPromoData({}); return }
    let cancelled = false
    getDocs(collection(db, 'cardPromos'))
      .then((snap) => {
        if (cancelled) return
        const out = {}
        snap.forEach((d) => {
          const s = d.data()
          const cur = out[s.bank] || { promos: [], scannedAt: s.scannedAt }
          cur.promos.push(...(s.promos || []))
          if (s.scannedAt > cur.scannedAt) cur.scannedAt = s.scannedAt
          out[s.bank] = cur
        })
        setPromoData(out)
      })
      // Promotions are a bonus: if they can't load, the rest of the app still works.
      .catch((e) => console.warn('[promos] load failed:', e?.code))
    return () => { cancelled = true }
  }, [user, enabled])

  return promoData
}
