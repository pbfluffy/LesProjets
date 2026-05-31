import { useState, useEffect } from 'react'
import { db, doc, setDoc, onSnapshot, serverTimestamp } from '../firebase'

// Feature #96 — Saved payees.
// A per-user roster of { id, name, promptPay } reused across bills, stored in a
// DEDICATED top-level doc `userPayees/<uid>` (isolated from `userBills` so it can't
// tangle with the bills sync). Owner-only Firestore rule — no cross-user reads.
// Signed-out users get an empty list and the UI hides itself.

const MAX_PAYEES = 20

export function useSavedPayees(user) {
  const uid = user?.uid || null
  const [payees, setPayees] = useState([])

  // Live subscription so the list stays in sync across the user's devices.
  useEffect(() => {
    if (!uid) { setPayees([]); return }
    const ref = doc(db, 'userPayees', uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null
        setPayees(Array.isArray(data?.payees) ? data.payees : [])
      },
      (err) => console.warn('[payees] snapshot failed:', err)
    )
    return unsub
  }, [uid])

  const persist = async (next) => {
    if (!uid) return
    setPayees(next) // optimistic; onSnapshot will reconcile
    try {
      await setDoc(
        doc(db, 'userPayees', uid),
        { payees: next, lastModified: serverTimestamp() },
        { merge: true }
      )
    } catch (e) {
      console.warn('[payees] write failed:', e)
    }
  }

  // De-dupe by promptPay: saving an existing number just refreshes its name.
  const addPayee = (name, promptPay) => {
    const n = (name || '').trim()
    const p = (promptPay || '').trim()
    if (!n || !p || !uid) return
    const existing = payees.find(x => x.promptPay === p)
    if (existing) {
      persist(payees.map(x => x.promptPay === p ? { ...x, name: n } : x))
      return
    }
    if (payees.length >= MAX_PAYEES) return
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    persist([...payees, { id, name: n, promptPay: p }])
  }

  const removePayee = (id) => {
    if (!uid) return
    persist(payees.filter(x => x.id !== id))
  }

  return { payees, addPayee, removePayee }
}
