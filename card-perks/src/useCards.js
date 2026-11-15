import { useCallback, useEffect, useState } from 'react'
import { db, doc, getDoc, setDoc, serverTimestamp } from './firebase.js'

// Cards live in one Firestore doc per user: userCards/{uid}. No card numbers,
// expiry dates or CVVs are ever stored — only a name, issuer/network and the
// list of privileges the user typed in.
export function useCards(user) {
  const [cards, setCards] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [saving, setSaving] = useState('idle')    // idle | saving | error

  useEffect(() => {
    if (!user) { setCards([]); setStatus('loading'); return }
    let cancelled = false
    setStatus('loading')
    getDoc(doc(db, 'userCards', user.uid))
      .then((snap) => {
        if (cancelled) return
        setCards(snap.exists() && Array.isArray(snap.data().cards) ? snap.data().cards : [])
        setStatus('ready')
      })
      .catch((e) => { console.warn('[cards] load failed:', e?.code); if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [user])

  const persist = useCallback(async (next) => {
    setCards(next)
    setSaving('saving')
    try {
      await setDoc(doc(db, 'userCards', user.uid), { cards: next, lastModified: serverTimestamp() })
      setSaving('idle')
    } catch (e) {
      console.warn('[cards] save failed:', e?.code)
      setSaving('error')
    }
  }, [user])

  return { cards, status, saving, persist }
}
