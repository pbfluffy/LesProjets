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

// P4 — resolve a stable display name for attribution. Google sign-in supplies
// displayName; fall back to the email local-part, then empty (caller skips).
function displayNameOf(u) {
  if (!u) return ''
  const dn = u.displayName && u.displayName.trim()
  if (dn) return dn
  if (u.email && u.email.includes('@')) return u.email.split('@')[0]
  return ''
}

export function useSharedTrip(tripId) {
  const [user, setUser] = useState(null)
  // remote: { id, ownerUid, name, placeIds, members, createdAt, lastModified, lastModifiedBy } | null
  const [remote, setRemote] = useState(null)
  // 'idle' | 'loading' | 'live' | 'denied' | 'error'
  const [status, setStatus] = useState('idle')

  const pushTimer = useRef(null)
  const pendingRef = useRef(null)
  const nameSyncRef = useRef('')

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

  // P4 — attribution writes (owner badge + per-stop "added by"). Deliberately
  // SEPARATE, best-effort merges (NOT folded into the proven create/join/content
  // writes) so a sharedTrips rule that doesn't yet allow the addedBy /
  // memberNames keys can reject these WITHOUT breaking add / join / create. If
  // attribution never appears after deploy, allow `addedBy` + `memberNames` in
  // the sharedTrips update rule — no code change needed. addedBy/memberNames are
  // maps, so setDoc(merge:true) deep-merges new entries without clobbering.
  const writeMerge = useCallback(
    async (patch) => {
      if (!tripId || !user) return
      try {
        await setDoc(
          doc(firestore, 'sharedTrips', tripId),
          { ...patch, lastModified: serverTimestamp(), lastModifiedBy: user.uid },
          { merge: true }
        )
      } catch {
        /* best-effort: attribution is non-critical, never blocks core edits */
      }
    },
    [tripId, user]
  )

  // Record "place X was added by uid" for one or more places: { placeId: uid }.
  const recordAdds = useCallback(
    (map) => {
      if (!map || Object.keys(map).length === 0) return
      writeMerge({ addedBy: map })
    },
    [writeMerge]
  )

  // P4 self-heal: once the doc is live and the signed-in user is a member,
  // record their own display name under memberNames if it's missing or stale.
  // This covers the owner, pre-P4 trips, and anyone who joined before P4 —
  // names converge without a dedicated write on the create/join paths (which
  // stay byte-identical to the shipped P3 versions). The ref + equality guard
  // make it fire at most once per (trip, uid, name).
  useEffect(() => {
    if (status !== 'live' || !user || !remote) return
    const nm = displayNameOf(user)
    if (!nm) return
    if (!(remote.members || []).includes(user.uid)) return
    const stored = remote.memberNames && remote.memberNames[user.uid]
    if (stored === nm) return
    const key = tripId + '\u0000' + user.uid + '\u0000' + nm
    if (nameSyncRef.current === key) return
    nameSyncRef.current = key
    writeMerge({ memberNames: { [user.uid]: nm } })
  }, [status, user, remote, tripId, writeMerge])

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
        // P4 — seed attribution as a SEPARATE best-effort write (own try/catch
        // so a rule rejection here never undoes the successful create above).
        try {
          const seeds = {}
          ;(Array.isArray(placeIds) ? placeIds : []).forEach((pid) => {
            if (typeof pid === 'string') seeds[pid] = user.uid
          })
          const nm = displayNameOf(user)
          const patch = { lastModified: serverTimestamp(), lastModifiedBy: user.uid }
          if (Object.keys(seeds).length) patch.addedBy = seeds
          if (nm) patch.memberNames = { [user.uid]: nm }
          if (patch.addedBy || patch.memberNames) {
            await setDoc(doc(firestore, 'sharedTrips', id), patch, { merge: true })
          }
        } catch {
          /* best-effort attribution; create already succeeded */
        }
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

  return { user, remote, status, isMember, isOwner, update, create, join, flush, recordAdds, myName: displayNameOf(user) }
}
