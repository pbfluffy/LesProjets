import { useEffect, useMemo, useState } from 'react'
import { db, collection, query, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase'

// 1–5 star ratings for handymen and shops, with an optional comment: one per
// signed-in account per post, at villageRatings/{postId}_{uid}, so
// re-rating overwrites. Anyone can read them; firestore.rules checks the id
// is the rater's own.
const RATINGS = 'villageRatings'
const ITEM_RATINGS = 'villageItemRatings'

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

  // Item ratings (stars only): villageItemRatings/{postId}_{itemId}_{uid}.
  // Items get a short stable id when saved (PostForm / toggleSold).
  const [itemDocs, setItemDocs] = useState([])
  useEffect(() => onSnapshot(
    query(collection(db, ITEM_RATINGS), limit(5000)),
    (snap) => setItemDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => console.error('[village] item ratings subscribe failed:', e?.code),
  ), [])
  // "postId_itemId" -> { avg, count, mine }
  const byItem = useMemo(() => {
    const map = {}
    for (const r of itemDocs) {
      const s = (map[r.postId + '_' + r.itemId] ||= { sum: 0, count: 0, mine: 0 })
      s.sum += r.stars
      s.count += 1
      if (uid && r.id === `${r.postId}_${r.itemId}_${uid}`) s.mine = r.stars
    }
    for (const s of Object.values(map)) s.avg = s.sum / s.count
    return map
  }, [itemDocs, uid])
  const removeItemDocs = (match) =>
    Promise.all(itemDocs.filter(match).map((r) => deleteDoc(doc(db, ITEM_RATINGS, r.id))))

  // merge: changing the stars keeps the comment, and vice versa.
  const write = (postId, fields) => setDoc(
    doc(db, RATINGS, `${postId}_${uid}`),
    { postId, ...fields, name: (user?.displayName || '').slice(0, 80), updatedAt: serverTimestamp() },
    { merge: true },
  )

  return {
    total: docs.length + itemDocs.length,
    // Every rating, for the admin tab: kind 'post' (shop / handyman, maybe
    // with a comment) or 'item' (stars on one shop item).
    all: () => [
      ...docs.map((r) => ({ ...r, kind: 'post', raterUid: r.id.slice(r.postId.length + 1) })),
      ...itemDocs.map((r) => ({ ...r, kind: 'item', raterUid: r.id.slice(r.postId.length + r.itemId.length + 2) })),
    ],
    // Delete one rating from the admin tab.
    removeRating: (r) => deleteDoc(doc(db, r.kind === 'item' ? ITEM_RATINGS : RATINGS, r.id)),
    item: (postId, itemId) => byItem[postId + '_' + itemId] || { avg: 0, count: 0, mine: 0 },
    rateItem: (postId, itemId, stars) => setDoc(
      doc(db, ITEM_RATINGS, `${postId}_${itemId}_${uid}`),
      { postId, itemId, stars, name: (user?.displayName || '').slice(0, 80), updatedAt: serverTimestamp() },
    ),
    get: (postId) => byPost[postId] || { avg: 0, count: 0, mine: 0, myComment: '', reviews: [] },
    // Ratings or reviews for a post changed after `since` (ms) — the owner's
    // "new reviews" badge in My shops.
    newSince: (postId, since) => docs.filter((r) => r.postId === postId && (r.updatedAt?.toMillis?.() || 0) > since).length,
    rate: (postId, stars) => write(postId, { stars }),
    comment: (postId, text) => write(postId, { comment: text.trim().slice(0, 200) }),
    // When a post is deleted its ratings go too (owner or admin).
    removeAll: (postId) => removeItemDocs((r) => r.postId === postId).then(() =>
      Promise.all(docs.filter((r) => r.postId === postId).map((r) => deleteDoc(doc(db, RATINGS, r.id))))),
    // One rating / review by its doc id (admin).
    remove: (ratingId) => deleteDoc(doc(db, RATINGS, ratingId)),
    // Every rating / review someone wrote (admin, when removing a banned user).
    removeBy: (raterUid) => removeItemDocs((r) => r.id.endsWith('_' + raterUid)).then(() =>
      Promise.all(docs.filter((r) => r.id.endsWith('_' + raterUid)).map((r) => deleteDoc(doc(db, RATINGS, r.id))))),
  }
}
