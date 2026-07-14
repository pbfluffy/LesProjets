import { useCallback, useEffect, useState } from 'react'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { assertValidProduct } from './adminProducts.js'

// Admin equivalent of src/data/useListings.js — but unlike that hook, this
// one never masks Firestore's real state behind local fallback data. An
// admin needs to see "Firestore is actually empty," not a placeholder.
export function useAdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const snap = await getDocs(collection(db, 'products'))
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Read-modify-write of the whole product doc — flavors are an embedded
  // array, not a subcollection, so there's no way to patch a single flavor
  // without rewriting the doc it lives on.
  async function saveProduct(product) {
    assertValidProduct(product)
    const { id, ...data } = product
    await setDoc(doc(db, 'products', id), { id, ...data })
    await refresh()
  }

  return { products, loading, error, refresh, saveProduct }
}
