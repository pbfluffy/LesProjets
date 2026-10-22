import { useEffect, useMemo, useState } from 'react'
import {
  db, collection, query, where, limit, onSnapshot, getDocs, doc, setDoc, deleteDoc, serverTimestamp,
} from '../firebase'

// 1–5 star ratings for handymen and shops, with an optional comment: one per
// signed-in account per post, at villageRatings/{postId}_{uid}, so
// re-rating overwrites. Anyone can read them; firestore.rules checks the id
// is the rater's own. These load for everyone (cards show the average and
// boards sort by it); item stars and the owners' replies only matter on one
// post's page, so they load per post (usePostExtras) — or, for the admin
// tab, all at once (useAllItemRatings).
const RATINGS = 'villageRatings'
const ITEM_RATINGS = 'villageItemRatings' // {postId}_{itemId}_{uid}
const REPLIES = 'villageReplies' // {ratingId} = { postId, text }

const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))
const byQuery = async (coll, ...constraints) => rows(await getDocs(query(collection(db, coll), ...constraints)))

// The reply (if any) goes after its review, so the rules already see the
// review gone — needed when the post was deleted first.
const removeRatingDoc = (coll, id) => deleteDoc(doc(db, coll, id)).then(() =>
  (coll === RATINGS ? deleteDoc(doc(db, REPLIES, id)).catch(() => {}) : null))

export function useRatings(user) {
  const [docs, setDocs] = useState([])
  const uid = user?.uid || null

  useEffect(() => {
    return onSnapshot(
      query(collection(db, RATINGS), limit(5000)),
      (snap) => setDocs(rows(snap)),
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
    uid,
    displayName: user?.displayName || '',
    count: docs.length,
    // Shop / handyman ratings, for the admin tab (kind 'post').
    postRatings: () => docs.map((r) => ({ ...r, kind: 'post', raterUid: r.id.slice(r.postId.length + 1) })),
    get: (postId) => byPost[postId] || { avg: 0, count: 0, mine: 0, myComment: '', reviews: [] },
    // Ratings or reviews for a post changed after `since` (ms) — the owner's
    // "new reviews" badge in My shops.
    newSince: (postId, since) => docs.filter((r) => r.postId === postId && (r.updatedAt?.toMillis?.() || 0) > since).length,
    rate: (postId, stars) => write(postId, { stars }),
    comment: (postId, text) => write(postId, { comment: text.trim().slice(0, 200) }),
    // Delete one rating from the admin tab ({ kind, id }).
    removeRating: (r) => removeRatingDoc(r.kind === 'item' ? ITEM_RATINGS : RATINGS, r.id),
    // One shop / handyman review by its doc id (admin).
    remove: (ratingId) => removeRatingDoc(RATINGS, ratingId),
    // When a post is deleted its ratings, item stars and replies go too (owner or admin).
    removeAll: async (postId) => {
      const items = await byQuery(ITEM_RATINGS, where('postId', '==', postId))
      await Promise.all(items.map((r) => deleteDoc(doc(db, ITEM_RATINGS, r.id))))
      await Promise.all(docs.filter((r) => r.postId === postId).map((r) => removeRatingDoc(RATINGS, r.id)))
    },
    // Every rating someone wrote (admin, when removing a banned user's content).
    // Item rating ids end with the rater's uid, so this reads them all (admin only, rare).
    removeBy: async (raterUid) => {
      const items = (await byQuery(ITEM_RATINGS)).filter((r) => r.id.endsWith('_' + raterUid))
      await Promise.all(items.map((r) => deleteDoc(doc(db, ITEM_RATINGS, r.id))))
      await Promise.all(docs.filter((r) => r.id.endsWith('_' + raterUid)).map((r) => removeRatingDoc(RATINGS, r.id)))
    },
  }
}

// One post's item stars and the owner's replies, live, while its page is
// open (enabled = false loads nothing, e.g. for list cards).
export function usePostExtras(postId, ratings, enabled = true) {
  const [itemDocs, setItemDocs] = useState([])
  const [replies, setReplies] = useState({})
  const uid = ratings.uid

  useEffect(() => {
    if (!enabled) return
    const off1 = onSnapshot(
      query(collection(db, ITEM_RATINGS), where('postId', '==', postId)),
      (snap) => setItemDocs(rows(snap)),
      (e) => console.error('[village] item ratings failed:', e?.code),
    )
    const off2 = onSnapshot(
      query(collection(db, REPLIES), where('postId', '==', postId)),
      (snap) => setReplies(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))),
      (e) => console.error('[village] replies failed:', e?.code),
    )
    return () => { off1(); off2() }
  }, [postId, enabled])

  // itemId -> { avg, count, mine }
  const byItem = useMemo(() => {
    const map = {}
    for (const r of itemDocs) {
      const s = (map[r.itemId] ||= { sum: 0, count: 0, mine: 0 })
      s.sum += r.stars
      s.count += 1
      if (uid && r.id === `${postId}_${r.itemId}_${uid}`) s.mine = r.stars
    }
    for (const s of Object.values(map)) s.avg = s.sum / s.count
    return map
  }, [itemDocs, uid, postId])

  return {
    item: (itemId) => byItem[itemId] || { avg: 0, count: 0, mine: 0 },
    rateItem: (itemId, stars) => setDoc(
      doc(db, ITEM_RATINGS, `${postId}_${itemId}_${uid}`),
      { postId, itemId, stars, name: ratings.displayName.slice(0, 80), updatedAt: serverTimestamp() },
    ),
    // Owner's reply to a review ({ text } or undefined), and saving / removing it.
    reply: (ratingId) => replies[ratingId],
    saveReply: (ratingId, text) => setDoc(doc(db, REPLIES, ratingId), { postId, text: text.trim().slice(0, 300), updatedAt: serverTimestamp() }),
    removeReply: (ratingId) => deleteDoc(doc(db, REPLIES, ratingId)),
  }
}

// Every item rating, live — admin tab only (count and the reviews list).
export function useAllItemRatings(enabled = true) {
  const [itemDocs, setItemDocs] = useState([])
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(
      query(collection(db, ITEM_RATINGS), limit(5000)),
      (snap) => setItemDocs(rows(snap).map((r) => ({
        ...r, kind: 'item', raterUid: r.id.slice(r.postId.length + r.itemId.length + 2),
      }))),
      (e) => console.error('[village] item ratings failed:', e?.code),
    )
  }, [enabled])
  return itemDocs
}
