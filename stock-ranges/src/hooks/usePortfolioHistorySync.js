import { useEffect, useRef } from 'react'
import { db, doc, getDoc, setDoc } from '../firebase.js'
import { loadPortfolioHistory, savePortfolioHistory, mergePortfolioHistories } from '../portfolioHistory.js'

const COLL = 'userStockRanges'

// Syncs daily portfolio-value snapshots across devices — same Firestore
// collection the rest of Stock Ranges uses, but bypassing the whole-doc
// conflict-resolution flow in useCloudSync.js (see mergePortfolioHistories
// for why: this is regenerable derived data, not something worth a "pick a
// side" prompt). Pulls and merges once per sign-in, then pushes each new
// local snapshot up as it's recorded. Best-effort — a failed pull/push
// just means this device stays local-only until the next attempt, same
// as everything else optional about cloud sync in this app.
export function usePortfolioHistorySync(user, onMerged) {
  const pulledForUid = useRef(null)

  useEffect(() => {
    if (!user || pulledForUid.current === user.uid) return
    pulledForUid.current = user.uid
    const ref = doc(db, COLL, user.uid)
    getDoc(ref)
      .then((snap) => {
        const remoteMap = snap.exists() ? snap.data().portfolioHistory : null
        if (!remoteMap || typeof remoteMap !== 'object') return
        const remoteEntries = Object.entries(remoteMap).map(([date, entry]) => ({ date, ...entry }))
        const merged = mergePortfolioHistories(loadPortfolioHistory(), remoteEntries)
        savePortfolioHistory(merged)
        onMerged(merged)
      })
      .catch((err) => console.warn('[portfolioHistorySync] pull failed:', err))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function pushSnapshot(entry) {
    if (!user || !entry) return
    const ref = doc(db, COLL, user.uid)
    setDoc(ref, { portfolioHistory: { [entry.date]: entry } }, { merge: true })
      .catch((err) => console.warn('[portfolioHistorySync] push failed:', err))
  }

  return { pushSnapshot }
}
