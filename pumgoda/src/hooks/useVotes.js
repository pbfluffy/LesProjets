import { useEffect, useState, useCallback } from 'react'
import { db, ref, set, remove, onValue } from '../firebase'

// Community vote store, backed by Firebase Realtime Database.
// Schema: votes are written to /votes/{deviceId}_{placeId} via `set`, so a
// user changing their mind overwrites their previous vote in place rather
// than stacking a second entry. Legacy push-keyed votes (auto-id) are still
// counted by the tally aggregator for backward compatibility.
// One vote per place per device is enforced by the deterministic key.

const LS_KEY = 'pumgoda_votes_v1'
const DEVICE_LS_KEY = 'pumgoda_device_id'
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

function getOrMintDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_LS_KEY)
    if (!id) {
      id =
        crypto && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(DEVICE_LS_KEY, id)
    }
    return id
  } catch {
    // localStorage disabled — re-voting works within the session only.
    return 'session_' + Math.random().toString(36).slice(2, 10)
  }
}

export function useVotes() {
  const [tallies, setTallies] = useState({})
  const [myVotes, setMyVotes] = useState(loadMyVotes)
  const [status, setStatus] = useState('loading')
  const [deviceId] = useState(getOrMintDeviceId)

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
      const prev = myVotes[placeId]
      if (prev === vote) {
        // Re-tapping the current choice retracts the vote entirely.
        const nextMine = { ...myVotes }
        delete nextMine[placeId]
        setMyVotes(nextMine)
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(nextMine))
        } catch {
          /* storage disabled — non-fatal */
        }
        remove(ref(db, 'votes/' + deviceId + '_' + placeId)).catch(() => {
          // delete failed — restore the local record.
          setMyVotes((m) => {
            const rolled = { ...m, [placeId]: prev }
            try {
              localStorage.setItem(LS_KEY, JSON.stringify(rolled))
            } catch {
              /* non-fatal */
            }
            return rolled
          })
        })
        return
      }

      const nextMine = { ...myVotes, [placeId]: vote }
      setMyVotes(nextMine)
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(nextMine))
      } catch {
        /* storage disabled — non-fatal */
      }

      const voteKey = deviceId + '_' + placeId
      set(ref(db, 'votes/' + voteKey), {
        placeId: placeId,
        vote: vote,
        ts: Date.now(),
        deviceId: deviceId,
      }).catch(() => {
        // write failed — restore the previous local record (or clear it).
        setMyVotes((m) => {
          const rolled = { ...m }
          if (prev) rolled[placeId] = prev
          else delete rolled[placeId]
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(rolled))
          } catch {
            /* non-fatal */
          }
          return rolled
        })
      })
    },
    [myVotes, deviceId]
  )

  return { tallies, myVotes, status, submitVote }
}
