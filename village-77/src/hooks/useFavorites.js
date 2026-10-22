import { createContext, useContext, useEffect, useState } from 'react'
import { db, doc, setDoc, onSnapshot } from '../firebase'

// ♥ saved shops / handymen: villageFavorites/{uid} = { ids: [postId, …] },
// readable and writable only by that person (firestore.rules).
export const MAX_FAVORITES = 200

export function useFavorites(user) {
  const [ids, setIds] = useState([])

  useEffect(() => {
    if (!user) { setIds([]); return }
    return onSnapshot(
      doc(db, 'villageFavorites', user.uid),
      (snap) => setIds(snap.exists() ? snap.data().ids || [] : []),
      (e) => console.error('[village] favourites failed:', e?.code),
    )
  }, [user])

  function toggle(postId) {
    if (!user) return Promise.resolve()
    const next = ids.includes(postId)
      ? ids.filter((id) => id !== postId)
      : [postId, ...ids].slice(0, MAX_FAVORITES)
    setIds(next) // show it straight away; the snapshot confirms
    return setDoc(doc(db, 'villageFavorites', user.uid), { ids: next })
  }

  return { ids, has: (postId) => ids.includes(postId), toggle }
}

export const FavoritesContext = createContext({ ids: [], has: () => false, toggle: () => Promise.resolve() })
export const useFavoritesContext = () => useContext(FavoritesContext)
