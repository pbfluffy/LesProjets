import { useEffect, useState } from 'react'
import {
  db, collection, query, orderBy, limit, onSnapshot,
  addDoc, setDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from '../firebase'

// Live list of one collection (villageShops | villageProviders), newest
// first. Public read, so this subscribes whether or not anyone is signed in.
export function usePosts(collectionName) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(!!collectionName)

  useEffect(() => {
    if (!collectionName) return // switched-off feature (e.g. news): load nothing
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(300))
    return onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (e) => {
        console.error(`[village] ${collectionName} subscribe failed:`, e?.code)
        setLoading(false)
      },
    )
  }, [collectionName])

  return { posts, loading }
}

export function createPost(collectionName, user, data) {
  return addDoc(collection(db, collectionName), {
    ...data,
    ownerUid: user.uid,
    verified: false, // only an admin can set this (firestore.rules)
    createdAt: serverTimestamp(),
  })
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

export function savePrivateAddress(postId, collectionName, address) {
  return setDoc(doc(db, PRIVATE, postId), {
    address,
    collection: collectionName,
    updatedAt: serverTimestamp(),
  })
}

export function deletePrivateAddress(postId) {
  return deleteDoc(doc(db, PRIVATE, postId))
}
