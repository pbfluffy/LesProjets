import { useEffect, useMemo, useState } from 'react'
import { db, collection, query, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase'

// 1–5 star ratings for handymen. No sign-in for now, so a rating belongs to
// a random per-device id: villageRatings/{postId}_{deviceId}. Re-rating from
// the same phone overwrites that phone's rating instead of adding another.
// Like the rest of the app this keeps honest people honest; it can't stop
// someone clearing their browser to vote twice.
const RATINGS = 'villageRatings'
const DEVICE_KEY = 'village_device_id'

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '')
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return null // storage blocked — rating is disabled for this visitor
  }
}

export function useRatings() {
  const [docs, setDocs] = useState([])
  const me = useMemo(deviceId, [])

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
      if (me && r.id === `${r.postId}_${me}`) s.mine = r.stars
    }
    for (const s of Object.values(map)) s.avg = s.sum / s.count
    return map
  }, [docs, me])

  return {
    canRate: !!me,
    get: (postId) => byPost[postId] || { avg: 0, count: 0, mine: 0 },
    rate: (postId, stars) =>
      setDoc(doc(db, RATINGS, `${postId}_${me}`), { postId, stars, updatedAt: serverTimestamp() }),
    // After a handyman is deleted their ratings are orphans; rules let anyone remove those.
    removeAll: (postId) =>
      Promise.all(docs.filter((r) => r.postId === postId).map((r) => deleteDoc(doc(db, RATINGS, r.id)))),
  }
}
