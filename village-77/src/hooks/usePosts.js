import { useEffect, useState } from 'react'
import {
  db, collection, query, orderBy, limit, onSnapshot,
  addDoc, setDoc, getDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch,
} from '../firebase'

// Live list of one collection (villageShops | villageProviders), newest
// first. Public read, so this subscribes whether or not anyone is signed in.
// loading: nothing to show yet. The first list may come from the phone's
// cache (firebase.js) and be out of date; synced turns true once the server
// has answered — wait for it before deciding a post no longer exists.
export function usePosts(collectionName) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(!!collectionName)
  const [synced, setSynced] = useState(!collectionName)

  useEffect(() => {
    if (!collectionName) return // switched-off feature (e.g. news): load nothing
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(300))
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
        if (!snap.metadata.fromCache) setSynced(true)
      },
      (e) => {
        console.error(`[village] ${collectionName} subscribe failed:`, e?.code)
        setLoading(false)
      },
    )
  }, [collectionName])

  return { posts, loading, synced }
}

// Daily limit on new shops / handymen (firestore.rules: villageQuota). The
// day is the UTC date as a number, e.g. 20261022, same as the rules.
export const DAILY_POST_LIMIT = 5
const utcDay = () => {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}
const quotaRef = (uid) => doc(db, 'villageQuota', uid)

// New posts the account can still make today.
export async function postsLeftToday(user) {
  try {
    const snap = await getDoc(quotaRef(user.uid))
    const q = snap.exists() ? snap.data() : null
    return DAILY_POST_LIMIT - (q && q.day === utcDay() ? q.count : 0)
  } catch {
    return DAILY_POST_LIMIT // can't tell — let the rules decide
  }
}

// { quota: true } (everyone but admins): the post and the daily counter are
// written together, as the rules require.
export async function createPost(collectionName, user, data, { quota = false } = {}) {
  const ref = doc(collection(db, collectionName))
  const post = {
    ...data,
    ownerUid: user.uid,
    verified: false, // only an admin can set this (firestore.rules)
    createdAt: serverTimestamp(),
  }
  if (!quota) {
    await setDoc(ref, post)
    return ref
  }
  const day = utcDay()
  const snap = await getDoc(quotaRef(user.uid))
  const q = snap.exists() ? snap.data() : null
  const count = q && q.day === day ? q.count + 1 : 1
  const batch = writeBatch(db)
  batch.set(ref, post)
  batch.set(quotaRef(user.uid), { day, count })
  await batch.commit()
  return ref
}

export function updatePost(collectionName, id, data) {
  return updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() })
}

export function deletePost(collectionName, id) {
  return deleteDoc(doc(db, collectionName, id))
}

// House number / soi lives in villagePrivate/{postId}, not on the public
// post: firestore.rules lets only admins read it (they see it in the
// Firebase console), so other villagers never see where someone lives.
const PRIVATE = 'villagePrivate'

// updatedBy: set when an admin corrects it (firestore.rules requires their uid).
export function savePrivateAddress(postId, collectionName, address, updatedBy) {
  return setDoc(doc(db, PRIVATE, postId), {
    address,
    collection: collectionName,
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  })
}

export function deletePrivateAddress(postId) {
  return deleteDoc(doc(db, PRIVATE, postId))
}

// The poster's own saved house no. ('' if none, or not readable).
export async function loadPrivateAddress(postId) {
  try {
    const snap = await getDoc(doc(db, PRIVATE, postId))
    return snap.exists() ? snap.data().address || '' : ''
  } catch {
    return ''
  }
}

// Short stable id for a shop item, so ratings stay on the right item when
// items are reordered, renamed or removed. New items get a random one;
// items saved before ids existed get one made from their name (itemKey), so
// they can be rated straight away and keep the same id once the shop is saved.
export const newItemId = () => Math.random().toString(36).slice(2, 10)
export function itemKey(it) {
  if (it.id) return it.id
  let h = 0
  for (const ch of it.name || '') h = (Math.imul(h, 31) + ch.codePointAt(0)) | 0
  return 'n' + (h >>> 0).toString(36)
}
// Gives every item an id; two id-less items with the same name get different
// ones (the second gets a suffix), so their ratings don't merge.
export function withItemIds(items) {
  const seen = new Set()
  return items.map((it, i) => {
    let id = itemKey(it)
    if (seen.has(id)) id = id.slice(0, 14) + 'x' + i
    seen.add(id)
    return id === it.id ? it : { ...it, id }
  })
}

// A house no. has to contain a number (Arabic or Thai digits), e.g. "99/12"
// or "๙๙/๑๒ ซ.3" — so "." or "-" don't count. firestore.rules check the same.
export const hasHouseNumber = (address) => /[0-9๐-๙]/.test(address || '')
