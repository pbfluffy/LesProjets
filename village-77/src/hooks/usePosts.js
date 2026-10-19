import { useEffect, useState } from 'react'
import {
  db, collection, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from '../firebase'

// Live list of one collection (villageListings | villageProviders), newest
// first. Public read, so this subscribes whether or not anyone is signed in.
export function usePosts(collectionName) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

export function createPost(collectionName, data) {
  return addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export function updatePost(collectionName, id, data) {
  return updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() })
}

export function deletePost(collectionName, id) {
  return deleteDoc(doc(db, collectionName, id))
}
