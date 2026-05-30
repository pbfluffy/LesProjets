import {
  auth, db,
  onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
} from '../firebase.js'
import { useCloudSyncCore } from '../../../shared/useCloudSyncCore.js'

// #75 — thin wrapper over the shared cloud-sync core.
// Nutritions stores the whole state object in /users/<uid> (no named field).
const COLL = 'users'

function localHasData(state) {
  if (!state) return false
  if (state.customFoods && state.customFoods.length > 0) return true
  if (state.days && Object.keys(state.days).length > 0) return true
  if (state.weights && Object.keys(state.weights).length > 0) return true
  return false
}

// Deep-canonical stringify with sorted keys.
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  const keys = Object.keys(value).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}'
}

// Conflict fingerprint: drops day-level lastEdit so old (pre-tracking) server
// docs don't always look different from current local data.
function syncFingerprint(state) {
  if (!state) return canonical(state)
  const days = state.days || {}
  const stripped = {}
  for (const k of Object.keys(days)) {
    const { lastEdit: _le, ...rest } = days[k]
    stripped[k] = rest
  }
  return canonical({ ...state, days: stripped })
}

function stripLastModified(docData) {
  const { lastModified: _lm, ...rest } = docData
  return rest
}

export function useCloudSync({ state, replaceState }) {
  const r = useCloudSyncCore({
    auth, db, onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
    collection: COLL,
    logPrefix: '[cloudSync]',
    localData: state,
    applyRemote: replaceState,
    hasData: localHasData,
    serialize: (s) => ({ ...s }),
    readRemote: (snap) => (snap.exists() ? stripLastModified(snap.data()) : null),
    stashPending: (snap) => snap.data(),
    applyPending: (raw) => { const so = stripLastModified(raw); replaceState(so); return so },
    conflictFp: syncFingerprint,
    echoFp: (s) => JSON.stringify(s),
    syncingOnChange: true,
    guardRedundantPush: false,
  })
  return {
    user: r.user,
    syncStatus: r.syncStatus,
    lastSyncedAt: r.lastSyncedAt,
    pendingServerData: r.pendingServer,
    confirmCloudWins: r.confirmCloudWins,
    confirmLocalWins: r.confirmLocalWins,
  }
}
