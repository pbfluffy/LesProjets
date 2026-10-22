import { useEffect, useMemo, useState } from 'react'
import { db, collection, query, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase'

// 1–5 star ratings for handymen and shops, with an optional comment: one per
// signed-in account per post, at villageRatings/{postId}_{uid}, so
// re-rating overwrites. Anyone can read them; firestore.rules checks the id
// is the rater's own.
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

  // postId -> { avg, count, mine, myComment, reviews: [{ stars, comment, name }] newest first }
  const byPost = useMemo(() => {
    const map = {}
    for (const r of docs) {
      const s = (map[r.postId] ||= { sum: 0, count: 0, mine: 0, myComment: '', reviews: [] })
      s.sum += r.stars
      s.count += 1
      if (uid && r.id === `${r.postId}_${uid}`) {
        s.mine = r.stars
        s.myComment = r.comment || ''
      }
      if (r.comment) s.reviews.push(r)
    }
    for (const s of Object.values(map)) {
      s.avg = s.sum / s.count
      s.reviews.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
    }
    return map
  }, [docs, uid])

  // merge: changing the stars keeps the comment, and vice versa.
  const write = (postId, fields) => setDoc(
    doc(db, RATINGS, `${postId}_${uid}`),
    { postId, ...fields, name: (user?.displayName || '').slice(0, 80), updatedAt: serverTimestamp() },
    { merge: true },
  )

  return {
    total: docs.length,
    get: (postId) => byPost[postId] || { avg: 0, count: 0, mine: 0, myComment: '', reviews: [] },
    // Ratings or reviews for a post changed after `since` (ms) — the owner's
    // "new reviews" badge in My shops.
    newSince: (postId, since) => docs.filter((r) => r.postId === postId && (r.updatedAt?.toMillis?.() || 0) > since).length,
    rate: (postId, stars) => write(postId, { stars }),
    comment: (postId, text) => write(postId, { comment: text.trim().slice(0, 200) }),
    // When a post is deleted its ratings go too (owner or admin).
    removeAll: (postId) =>
      Promise.all(docs.filter((r) => r.postId === postId).map((r) => deleteDoc(doc(db, RATINGS, r.id)))),
    // Every rating / review someone wrote (admin, when removing a banned user).
    removeBy: (raterUid) =>
      Promise.all(docs.filter((r) => r.id.endsWith('_' + raterUid)).map((r) => deleteDoc(doc(db, RATINGS, r.id)))),
  }
}
