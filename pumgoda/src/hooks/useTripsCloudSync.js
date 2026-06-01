import {
  auth, firestore,
  onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
} from '../firebase'
import { useCloudSyncCore } from '../../../shared/useCloudSyncCore.js'

// #97 Phase 1 — trips → Firestore.
// Personal trip list synced to /userTrips/<uid> under `trips`, mirroring the
// saved-places wrapper (useCloudSync.js). Same shared core, same #81 failed-push
// hardening. Trips are an ordered list of { id, name, placeIds[], createdAt }.
const COLL = 'userTrips'

function localHasData(trips) {
  return Array.isArray(trips) && trips.length > 0
}

function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(canonical)
  const sorted = {}
  Object.keys(obj).sort().forEach((k) => { sorted[k] = canonical(obj[k]) })
  return sorted
}

function fingerprint(trips) {
  return JSON.stringify(canonical(trips || []))
}

export function useTripsCloudSync({ trips, replaceTrips }) {
  const r = useCloudSyncCore({
    auth, db: firestore, onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
    collection: COLL,
    logPrefix: '[tripsSync]',
    localData: trips,
    applyRemote: replaceTrips,
    hasData: localHasData,
    serialize: (t) => ({ trips: t, lastEdit: Date.now() }),
    readRemote: (snap) => (snap.exists() ? (snap.data().trips || []) : null),
    stashPending: (snap) => (snap.data().trips || []),
    applyPending: (p) => { replaceTrips(p); return p },
    conflictFp: fingerprint,
    echoFp: fingerprint,
    syncingOnChange: false,
  })
  return {
    user: r.user,
    syncStatus: r.syncStatus,
    lastSyncedAt: r.lastSyncedAt,
    pendingServerTrips: r.pendingServer,
    confirmCloudWins: r.confirmCloudWins,
    confirmLocalWins: r.confirmLocalWins,
  }
}
