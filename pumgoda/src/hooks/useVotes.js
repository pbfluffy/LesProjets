import { useEffect, useState, useCallback } from 'react'
import { db, ref, push, onValue } from '../firebase'

// Community vote store, backed by Firebase Realtime Database.
// Each vote is an append-only entry { placeId, vote, ts } under /votes.
// One vote per place per device is enforced locally via localStorage.

const LS_KEY = 'pumgoda_votes_v1'
const SIGNALS = ['up', 'paw', 'warn']

function loadMyVotes() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function useVotes() {
  const [tallies, setTallies] = useState({})
  const [myVotes, setMyVotes] = useState(loadMyVotes)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const unsub = onValue(
      ref(db, 'votes'),
      (snap) => {
        const next = {}
        const all = snap.val() || {}
        for (const key in all) {
          const v = all[key]
          if (!v || !v.placeId || SIGNALS.indexOf(v.vote) === -1) continue
          if (!next[v.placeId]) next[v.placeId] = { up: 0, paw: 0, warn: 0 }
          next[v.placeId][v.vote]++
        }
        setTallies(next)
        setStatus('ready')
      },
      () => setStatus('error')
    )
    return () => unsub()
  }, [])

  const submitVote = useCallback(
    (placeId, vote) => {
      if (SIGNALS.indexOf(vote) === -1) return
      if (myVotes[placeId]) return

      const nextMine = { ...myVotes, [placeId]: vote }
      setMyVotes(nextMine)
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(nextMine))
      } catch {
        /* storage disabled — non-fatal */
      }

      push(ref(db, 'votes'), { placeId: placeId, vote: vote, ts: Date.now() }).catch(
        () => {
          // write failed — roll back the local record so the user can retry
          setMyVotes((m) => {
            const rolled = { ...m }
            delete rolled[placeId]
            try {
              localStorage.setItem(LS_KEY, JSON.stringify(rolled))
            } catch {
              /* non-fatal */
            }
            return rolled
          })
        }
      )
    },
    [myVotes]
  )

  return { tallies, myVotes, status, submitVote }
}
