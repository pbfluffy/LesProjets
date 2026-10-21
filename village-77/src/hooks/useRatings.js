import { useEffect, useMemo, useState } from 'react'
import { db, collection, query, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase'

// 1–5 star ratings for handymen: one per signed-in (LINE) account per
// handyman, at villageRatings/{postId}_{uid}, so re-rating overwrites.
// Anyone can read them; firestore.rules checks the id is the rater's own.
const RATINGS = 'villageRatings'

export function useRatings(user) {
  const [docs, setDocs] = useState([])
  const uid = user?.uid || null

  useEffect(() => {
    return onSnapshot(
      query(collection(db, RATINGS), limit(5000)),
      (snap) => setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error('[village] ratings subscribe failed:', e?.code),
    )
  }, [])

  // postId -> { avg, count, mine }
  const byPost = useMemo(() => {
    const map = {}
    for (const r of docs) {
      const s = (map[r.postId] ||= { sum: 0, count: 0, mine: 0 })
      s.sum += r.stars
      s.count += 1
      if (uid && r.id === `${r.postId}_${uid}`) s.mine = r.stars
    }
    for (const s of Object.values(map)) s.avg = s.sum / s.count
    return map
  }, [docs, uid])

  return {
    get: (postId) => byPost[postId] || { avg: 0, count: 0, mine: 0 },
    rate: (postId, stars) =>
      setDoc(doc(db, RATINGS, `${postId}_${uid}`), { postId, stars, updatedAt: serverTimestamp() }),
    // When a handyman is deleted their ratings go too (owner or admin).
    removeAll: (postId) =>
      Promise.all(docs.filter((r) => r.postId === postId).map((r) => deleteDoc(doc(db, RATINGS, r.id)))),
  }
}
