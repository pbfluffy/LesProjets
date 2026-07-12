import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import { products as fallbackProducts } from './listings.js'

// Tries Firestore first; falls back to local placeholder data if the
// `products` collection is empty or Firebase isn't configured yet.
export function useListings() {
  const [items, setItems] = useState(fallbackProducts)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const snap = await getDocs(collection(db, 'products'))
        if (cancelled) return
        if (!snap.empty) {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
          setUsingFallback(false)
        }
      } catch (err) {
        console.warn('Falling back to local product data:', err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { items, loading, usingFallback }
}
