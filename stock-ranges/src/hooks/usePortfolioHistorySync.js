import { useEffect } from 'react'
import { db, doc, getDoc, setDoc } from '../firebase.js'
import { loadPortfolioHistory, savePortfolioHistory, mergePortfolioHistories } from '../portfolioHistory.js'

const COLL = 'userStockRanges'

// Module-level, not a ref — WalletView fully unmounts on every tab switch
// (App.jsx renders it via a ternary, not a hide/show), so a ref-based
// "already pulled" guard would reset on every remount and silently
// re-fetch from Firestore each time you switched back to the Wallet tab.
// A plain module variable survives that remount while still resetting on
// an actual page reload.
let pulledForUid = null

// Syncs daily portfolio-value snapshots across devices — same Firestore
// collection the rest of Stock Ranges uses, but bypassing the whole-doc
// conflict-resolution flow in useCloudSync.js (see mergePortfolioHistories
// for why: this is regenerable derived data, not something worth a "pick a
// side" prompt). Pulls and merges once per page load per account, then
// pushes each new local snapshot up as it's recorded. Best-effort — a
// failed pull/push just means this device stays local-only until the next
// attempt, same as everything else optional about cloud sync in this app.
export function usePortfolioHistorySync(user, onMerged) {
  useEffect(() => {
    if (!user || pulledForUid === user.uid) return
    pulledForUid = user.uid
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
