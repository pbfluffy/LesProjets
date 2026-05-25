import { useEffect, useRef, useState } from 'react'
import {
  auth, firestore,
  onAuthStateChanged, doc, setDoc, serverTimestamp,
  onSnapshot,
} from '../firebase'

const DEBOUNCE_MS = 1500
const COLL = 'userPlaces'

function localHasData(entries) {
  return Array.isArray(entries) && entries.length > 0
}

// Deep, deterministic stringification -- sorts keys recursively so two
// objects with identical data but different field insertion order produce
// the same fingerprint. Mirrors BS useCloudSync canonical() helper.
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

/**
 * Cloud sync for Pumgoda saved places (savedIds array of place IDs).
 * Uses a dedicated /userPlaces/<uid> doc -- isolated from BS/Nutritions.
 *
 * Mirrors the BS pattern (#31):
 * - Subscribes via onSnapshot for real-time cross-device updates.
 * - On first sign-in:
 *     - cloud has no doc -> push local
 *     - cloud has entries, local empty -> pull
 *     - both have entries AND differ -> 'awaiting-decision'; user picks via
 *       confirmCloudWins() or confirmLocalWins().
 * - Live updates after initial sync use echo suppression.
 */
export function useCloudSync({ entries, replaceEntries }) {
  const [user, setUser] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [pendingServerEntries, setPendingServerEntries] = useState(null)

  const initialSyncDone = useRef(false)
  const pushTimer = useRef(null)
  const lastPushedFingerprint = useRef(null)
  const justPulled = useRef(false)
  const entriesRef = useRef(entries)

  useEffect(() => { entriesRef.current = entries }, [entries])

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (!u) {
        initialSyncDone.current = false
        lastPushedFingerprint.current = null
        setPendingServerEntries(null)
        setSyncStatus('idle')
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setSyncStatus('syncing')
    const ref = doc(firestore, COLL, user.uid)

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const cloudEntries = snap.exists() ? (snap.data().savedIds || []) : null

        if (!initialSyncDone.current) {
          if (cloudEntries === null) {
            const current = entriesRef.current
            const fp = fingerprint(current)
            lastPushedFingerprint.current = fp
            setDoc(ref, { savedIds: current, lastEdit: Date.now(), lastModified: serverTimestamp() })
              .then(() => {
                initialSyncDone.current = true
                setLastSyncedAt(Date.now())
                setSyncStatus('synced')
              })
              .catch((e) => {
                console.error('[pumgodaSync] initial push failed:', e)
                setSyncStatus('error')
              })
            return
          }

          const localFp = fingerprint(entriesRef.current)
          const cloudFp = fingerprint(cloudEntries)

          if (localFp === cloudFp) {
            lastPushedFingerprint.current = cloudFp
            initialSyncDone.current = true
            setLastSyncedAt(Date.now())
            setSyncStatus('synced')
            return
          }

          if (localHasData(entriesRef.current)) {
            setPendingServerEntries(cloudEntries)
            setSyncStatus('awaiting-decision')
            return
          }

          justPulled.current = true
          replaceEntries(cloudEntries)
          lastPushedFingerprint.current = cloudFp
          initialSyncDone.current = true
          setLastSyncedAt(Date.now())
          setSyncStatus('synced')
          setTimeout(() => { justPulled.current = false }, 300)
          return
        }

        if (cloudEntries === null) return
        const cloudFp = fingerprint(cloudEntries)
        if (cloudFp === lastPushedFingerprint.current) return

        justPulled.current = true
        replaceEntries(cloudEntries)
        lastPushedFingerprint.current = cloudFp
        setLastSyncedAt(Date.now())
        setSyncStatus('synced')
        setTimeout(() => { justPulled.current = false }, 300)
      },
      (error) => {
        console.error('[pumgodaSync] snapshot error:', error)
        setSyncStatus('error')
      }
    )

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user || !initialSyncDone.current || justPulled.current) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      const ref = doc(firestore, COLL, user.uid)
      const fp = fingerprint(entries)
      if (fp === lastPushedFingerprint.current) return
      lastPushedFingerprint.current = fp
      setDoc(ref, { savedIds: entries, lastEdit: Date.now(), lastModified: serverTimestamp() })
        .then(() => {
          setLastSyncedAt(Date.now())
          setSyncStatus('synced')
        })
        .catch((e) => {
          console.error('[pumgodaSync] push failed:', e)
          setSyncStatus('error')
        })
    }, DEBOUNCE_MS)
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [entries, user])

  const confirmCloudWins = () => {
    if (!pendingServerEntries || !user) return
    justPulled.current = true
    replaceEntries(pendingServerEntries)
    lastPushedFingerprint.current = fingerprint(pendingServerEntries)
    initialSyncDone.current = true
    setPendingServerEntries(null)
    setLastSyncedAt(Date.now())
    setSyncStatus('synced')
    setTimeout(() => { justPulled.current = false }, 300)
  }

  const confirmLocalWins = () => {
    if (!user) return
    const current = entriesRef.current
    const ref = doc(firestore, COLL, user.uid)
    const fp = fingerprint(current)
    lastPushedFingerprint.current = fp
    setSyncStatus('syncing')
    setDoc(ref, { savedIds: current, lastEdit: Date.now(), lastModified: serverTimestamp() })
      .then(() => {
        initialSyncDone.current = true
        setPendingServerEntries(null)
        setLastSyncedAt(Date.now())
        setSyncStatus('synced')
      })
      .catch((e) => {
        console.error('[pumgodaSync] confirm-local push failed:', e)
        setSyncStatus('error')
      })
  }

  return {
    user,
    syncStatus,
    lastSyncedAt,
    pendingServerEntries,
    confirmCloudWins,
    confirmLocalWins,
  }
}
