import { useEffect, useState, useCallback } from 'react'
import {
  auth,
  firestore,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from '../firebase'

// Community vote store, backed by Cloud Firestore (#37 voting v2).
// Replaces the legacy RTDB-based useVotes which used a per-device
// localStorage id. Now uses the Google account uid as identity.
//
// Schema: placeVotes/<uid>_<placeId> with { uid, placeId, vote, note,
// ts, lastModified }. Composite key enforces one vote per user per place
// at the security-rule level (see handoff §9.1 for the rule body). note
// is optional free text (≤140 chars, enforced in firestore.rules) — a
// short tip attached to that vote, e.g. "pet fee now applies weekends".
//
// Signed-out callers see submitVote as a no-op + 'auth' lastError.
// The UI (VoteButtons.jsx) gates buttons + shows a sign-in prompt
// based on the `user` field returned here.

const SIGNALS = ['up', 'paw', 'warn']
const NOTE_MAX_LEN = 140

export function useVotesFs() {
  const [user, setUser] = useState(null)
  const [tallies, setTallies] = useState({})
  const [myVotes, setMyVotes] = useState({})
  const [notesByPlace, setNotesByPlace] = useState({})
  const [status, setStatus] = useState('loading')
  const [lastError, setLastError] = useState(null)

  const clearError = useCallback(() => setLastError(null), [])

  // Auth state — drives myVotes derivation and the write gate.
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  // Subscribe to the whole placeVotes collection. Cheap at our scale
  // (~25 places * sparse votes = a few hundred docs at most).
  useEffect(() => {
    const ref = collection(firestore, 'placeVotes')
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const t = {}
        const mine = {}
        const notes = {}
        snap.docs.forEach((d) => {
          const v = d.data()
          if (!v || !v.placeId || SIGNALS.indexOf(v.vote) === -1) return
          if (!t[v.placeId]) t[v.placeId] = { up: 0, paw: 0, warn: 0 }
          t[v.placeId][v.vote] += 1
          if (user && v.uid === user.uid) mine[v.placeId] = v.vote
          if (v.note && typeof v.note === 'string') {
            if (!notes[v.placeId]) notes[v.placeId] = []
            notes[v.placeId].push({ uid: v.uid, vote: v.vote, note: v.note, ts: v.ts || 0 })
          }
        })
        Object.values(notes).forEach((list) => list.sort((a, b) => b.ts - a.ts))
        setTallies(t)
        setMyVotes(mine)
        setNotesByPlace(notes)
        setStatus('ready')
      },
      (e) => {
        console.warn('[useVotesFs] snapshot error:', e)
        setLastError('read')
        setStatus('error')
      }
    )
    return unsub
  }, [user])

  const submitVote = useCallback(
    async (placeId, vote) => {
      if (!user) {
        // Signed-out caller — UI should prevent this from happening,
        // but be defensive: surface a soft error and bail.
        setLastError('auth')
        return
      }
      if (SIGNALS.indexOf(vote) === -1) return
      setLastError(null)
      const voteId = user.uid + '_' + placeId
      const ref = doc(firestore, 'placeVotes', voteId)
      const prev = myVotes[placeId]
      // Optimistic local update so the UI flips instantly; the
      // snapshot listener reconciles on the next round-trip.
      if (prev === vote) {
        // Re-tap retracts the vote.
        setMyVotes((m) => {
          const next = { ...m }
          delete next[placeId]
          return next
        })
        try {
          await deleteDoc(ref)
        } catch (e) {
          console.warn('[useVotesFs] delete failed:', e)
          setLastError('write')
          setMyVotes((m) => ({ ...m, [placeId]: prev }))
        }
        return
      }
      setMyVotes((m) => ({ ...m, [placeId]: vote }))
      try {
        // merge: true — switching which signal you picked (up → paw etc.)
        // shouldn't silently wipe a note you'd already left; only the
        // fields touched here (vote/ts) actually change.
        await setDoc(
          ref,
          { uid: user.uid, placeId, vote, ts: Date.now(), lastModified: serverTimestamp() },
          { merge: true }
        )
      } catch (e) {
        console.warn('[useVotesFs] write failed:', e)
        setLastError('write')
        setMyVotes((m) => {
          const rolled = { ...m }
          if (prev) rolled[placeId] = prev
          else delete rolled[placeId]
          return rolled
        })
      }
    },
    [user, myVotes]
  )

  // Attaches/updates a short free-text tip on the caller's OWN existing
  // vote — there's nothing to attach a note to until they've voted, so
  // this is a no-op (with a surfaced error) if they haven't yet.
  const submitNote = useCallback(
    async (placeId, note) => {
      if (!user) { setLastError('auth'); return }
      if (!myVotes[placeId]) { setLastError('write'); return }
      const trimmed = (note || '').trim().slice(0, NOTE_MAX_LEN)
      setLastError(null)
      const voteId = user.uid + '_' + placeId
      const ref = doc(firestore, 'placeVotes', voteId)
      try {
        await setDoc(ref, { note: trimmed || null, lastModified: serverTimestamp() }, { merge: true })
      } catch (e) {
        console.warn('[useVotesFs] note write failed:', e)
        setLastError('write')
      }
    },
    [user, myVotes]
  )

  return { user, tallies, myVotes, notesByPlace, status, lastError, submitVote, submitNote, clearError, NOTE_MAX_LEN }
}
