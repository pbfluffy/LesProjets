import { useEffect, useState } from 'react'
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase'
import { deletePost, deletePrivateAddress } from './usePosts'

// Banned accounts, villageBans/{uid} = { name, reason, by, byName, at }.
// firestore.rules stop a banned account posting, editing, rating, reporting
// or saving a house no.; the Worker stops their photo uploads. Admins only.
const BANS = 'villageBans'

// uid -> ban, live (admin tab).
export function useBans() {
  const [bans, setBans] = useState({})
  useEffect(() => onSnapshot(
    collection(db, BANS),
    (snap) => setBans(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))),
    (e) => console.error('[village] bans failed:', e?.code),
  ), [])
  return bans
}

// removeContent: also delete everything they posted (shops, handymen, with
// their house no. and the ratings on them) and every rating they wrote.
// Their photos stay in R2 — the Worker only lets the uploader delete those.
export async function banUser({ uid, name, reason, admin, removeContent, shops, providers, ratings }) {
  await setDoc(doc(db, BANS, uid), {
    name: (name || '').slice(0, 200),
    reason: (reason || '').trim().slice(0, 300),
    by: admin.uid,
    byName: (admin.displayName || '').slice(0, 200),
    at: serverTimestamp(),
  })
  if (!removeContent) return
  const theirs = [
    ...shops.filter((p) => p.ownerUid === uid).map((p) => ['villageShops', p]),
    ...providers.filter((p) => p.ownerUid === uid).map((p) => ['villageProviders', p]),
  ]
  await Promise.all(theirs.map(async ([coll, p]) => {
    await deletePost(coll, p.id)
    await Promise.all([deletePrivateAddress(p.id).catch(() => {}), ratings.removeAll(p.id).catch(() => {})])
  }))
  await ratings.removeBy(uid)
}

export const unbanUser = (uid) => deleteDoc(doc(db, BANS, uid))
