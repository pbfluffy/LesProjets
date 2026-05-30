import {
  auth, firestore,
  onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
} from '../firebase'
import { useCloudSyncCore } from '../../../shared/useCloudSyncCore.js'

// #75 — thin wrapper over the shared cloud-sync core.
// Pumgoda saved places live in /userPlaces/<uid>, stored under `savedIds`.
// (Pumgoda's Firestore instance is named `firestore`; `db` is the RTDB.)
const COLL = 'userPlaces'

function localHasData(entries) {
  return Array.isArray(entries) && entries.length > 0
}

function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(canonical)
  const sorted = {}
  Object.keys(obj).sort().forEach(k => { sorted[k] = canonical(obj[k]) })
  return sorted
}

function fingerprint(entries) {
  return JSON.stringify(canonical(entries || []))
}

export function useCloudSync({ entries, replaceEntries }) {
  const r = useCloudSyncCore({
    auth, db: firestore, onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
    collection: COLL,
    logPrefix: '[pumgodaSync]',
    localData: entries,
    applyRemote: replaceEntries,
    hasData: localHasData,
    serialize: (e) => ({ savedIds: e, lastEdit: Date.now() }),
    readRemote: (snap) => (snap.exists() ? (snap.data().savedIds || []) : null),
    stashPending: (snap) => (snap.data().savedIds || []),
    applyPending: (p) => { replaceEntries(p); return p },
    conflictFp: fingerprint,
    echoFp: fingerprint,
    syncingOnChange: false,
  })
  return {
    user: r.user,
    syncStatus: r.syncStatus,
    lastSyncedAt: r.lastSyncedAt,
    pendingServerEntries: r.pendingServer,
    confirmCloudWins: r.confirmCloudWins,
    confirmLocalWins: r.confirmLocalWins,
  }
}
