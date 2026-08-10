import {
  auth, db,
  onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
} from '../firebase.js'
import { useCloudSyncCore } from '../../../shared/useCloudSyncCore.js'

// Thin wrapper over the shared cloud-sync core (same one bill-splitter,
// nutritions-thailand, and pumgoda use) — see shared/useCloudSyncCore.js
// for the actual sync/conflict logic. Stock Ranges data lives in
// /userStockRanges/<uid>: watchlist + lookback range + display currency.
// Theme/language stay local-only, same as every sibling app.
const COLL = 'userStockRanges'
const DEFAULT_WATCHLIST = ['AAPL', 'MSFT']
const DEFAULT_RANGE = '1y'
const DEFAULT_CURRENCY = 'USD'

// Deep, deterministic stringification — sorts keys recursively so identical
// data with different field order produces the same fingerprint.
function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(canonical)
  const sorted = {}
  Object.keys(obj).sort().forEach((k) => { sorted[k] = canonical(obj[k]) })
  return sorted
}

function fingerprint(data) {
  return JSON.stringify(canonical(data || {}))
}

// True only if the local state differs from the untouched default — a
// fresh browser's seed watchlist shouldn't trigger a conflict prompt
// against real cloud data on first sign-in.
function hasData(local) {
  return fingerprint(local) !== fingerprint({ watchlist: DEFAULT_WATCHLIST, range: DEFAULT_RANGE, currency: DEFAULT_CURRENCY })
}

export function useCloudSync({ watchlist, range, currency, applyRemote }) {
  const localData = { watchlist, range, currency }
  const r = useCloudSyncCore({
    auth, db, onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
    collection: COLL,
    logPrefix: '[stockRangesSync]',
    localData,
    applyRemote,
    hasData,
    serialize: (d) => ({ watchlist: d.watchlist, range: d.range, currency: d.currency }),
    readRemote: (snap) => (snap.exists() ? snap.data() : null),
    stashPending: (snap) => snap.data(),
    applyPending: (p) => { applyRemote(p); return p },
    conflictFp: fingerprint,
    echoFp: fingerprint,
    syncingOnChange: false,
  })
  return {
    user: r.user,
    syncStatus: r.syncStatus,
    lastSyncedAt: r.lastSyncedAt,
    pendingServer: r.pendingServer,
    confirmCloudWins: r.confirmCloudWins,
    confirmLocalWins: r.confirmLocalWins,
  }
}
