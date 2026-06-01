import { useCallback, useEffect, useRef, useState } from 'react'
import {
  auth,
  firestore,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from '../firebase'

// #97 Collaborative Trips — one shared trip backed by sharedTrips/<tripId>.
//
// This is the piece the snapshot-based Phase 2 lacked: a LIVE onSnapshot
// subscription, so every member sees every member's edits as they happen.
// Writes are debounced and LAST-WRITE-WINS (no merge / no conflict modal) per
// the v1 decision. Access model is B1: membership-gated with a self-join
// (a non-member appends only their own uid). Mirrors the auth/identity shape
// of useVotesFs; deliberately NOT the per-user useCloudSyncCore (that keys one
// doc to the signed-in user — collaborative trips are one doc, many writers).

const DEBOUNCE_MS = 1500

export function useSharedTrip(tripId) {
  const [user, setUser] = useState(null)
  // remote: { id, ownerUid, name, placeIds, members, createdAt, lastModified, lastModifiedBy } | null
  const [remote, setRemote] = useState(null)
  // 'idle' | 'loading' | 'live' | 'denied' | 'error'
  const [status, setStatus] = useState('idle')

  const pushTimer = useRef(null)
  const pendingRef = useRef(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  // Live subscription — the source of cross-member convergence.
  useEffect(() => {
    if (!tripId) {
      setRemote(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    const ref = doc(firestore, 'sharedTrips', tripId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRemote(null)
          setStatus('error')
          return
        }
        setRemote({ id: tripId, ...snap.data() })
        setStatus('live')
      },
      (err) => {
        setStatus(err && err.code === 'permission-denied' ? 'denied' : 'error')
      }
    )
    return () => {
      unsub()
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [tripId])

  // Flush the coalesced patch as a single LWW write.
  const flush = useCallback(async () => {
    if (!tripId || !user || !pendingRef.current) return
    const patch = pendingRef.current
    pendingRef.current = null
    try {
      await setDoc(
        doc(firestore, 'sharedTrips', tripId),
        { ...patch, lastModified: serverTimestamp(), lastModifiedBy: user.uid },
        { merge: true }
      )
    } catch {
      setStatus('error')
    }
  }, [tripId, user])

  // Debounced content update — { name?, placeIds? }.
  const update = useCallback(
    (patch) => {
      pendingRef.current = { ...(pendingRef.current || {}), ...patch }
      if (pushTimer.current) clearTimeout(pushTimer.current)
      pushTimer.current = setTimeout(flush, DEBOUNCE_MS)
    },
    [flush]
  )

  // Owner promotes a local trip to a shared doc (A1). tripId is reused as the
  // doc id and doubles as the share code. Returns the id on success, else null.
  const create = useCallback(
    async ({ id, name, placeIds }) => {
      if (!user || !id) return null
      try {
        await setDoc(doc(firestore, 'sharedTrips', id), {
          ownerUid: user.uid,
          name: (name || '').trim() || 'Shared trip',
          placeIds: Array.isArray(placeIds) ? [...placeIds] : [],
          members: [user.uid],
          createdAt: Date.now(),
          lastModified: serverTimestamp(),
          lastModifiedBy: user.uid,
        })
        return id
      } catch {
        setStatus('error')
        return null
      }
    },
    [user]
  )

  // B1 self-join: a non-member appends ONLY their own uid to members. Idempotent.
  const join = useCallback(async () => {
    if (!user || !tripId) return false
    try {
      const ref = doc(firestore, 'sharedTrips', tripId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return false
      const members = snap.data().members || []
      if (members.includes(user.uid)) return true
      await setDoc(
        ref,
        {
          members: [...members, user.uid],
          lastModified: serverTimestamp(),
          lastModifiedBy: user.uid,
        },
        { merge: true }
      )
      return true
    } catch {
      return false
    }
  }, [user, tripId])

  const isMember = !!(user && remote && (remote.members || []).includes(user.uid))
  const isOwner = !!(user && remote && remote.ownerUid === user.uid)

  return { user, remote, status, isMember, isOwner, update, create, join, flush }
}
