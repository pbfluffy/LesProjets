import {
  auth, db,
  onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
} from '../firebase.js'
import { useCloudSyncCore } from '../../../shared/useCloudSyncCore.js'

// #75 — thin wrapper over the shared cloud-sync core.
// Bill Splitter saved bills live in /userBills/<uid>, stored under `history`.
const COLL = 'userBills'

function localHasData(entries) {
  return Array.isArray(entries) && entries.length > 0
}

// Deep, deterministic stringification — sorts keys recursively so identical
// data with different field order produces the same fingerprint.
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
    auth, db, onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
    collection: COLL,
    logPrefix: '[billSync]',
    localData: entries,
    applyRemote: replaceEntries,
    hasData: localHasData,
    serialize: (e) => ({ history: e, lastEdit: Date.now() }),
    readRemote: (snap) => (snap.exists() ? (snap.data().history || []) : null),
    stashPending: (snap) => (snap.data().history || []),
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
