import { useEffect, useRef, useState } from 'react'

// Feature #75 — shared cloud-sync core.
//
// Unifies the three previously-duplicated useCloudSync hooks (Bill Splitter,
// Pumgoda, Nutritions). Every app-specific concern is INJECTED via config, so
// this control flow is identical for all apps and preserves the #81
// failed-push hardening (pushInFlight + lastConfirmedFingerprint + revert
// guard). Firebase deps are injected (not imported) because each app wires
// Firebase differently — npm vs gstatic CDN, db vs firestore instance.
//
// config:
//   Firebase (injected): auth, db, onAuthStateChanged, doc, setDoc,
//                        serverTimestamp, onSnapshot
//   collection           Firestore collection, e.g. 'userBills'
//   logPrefix            e.g. '[billSync]'
//   localData            current local data (entries array | state object)
//   applyRemote(remote)  apply pulled data into the app (replaceEntries/State)
//   hasData(localData)   -> boolean (is there local content worth a conflict?)
//   serialize(localData) -> doc fields (lastModified is added here)
//   readRemote(snap)     -> remote localData | null  (deserialize the doc)
//   stashPending(snap)   -> value exposed as pendingServer (app-specific shape)
//   applyPending(p)      -> remote localData (applies pending + returns it)
//   conflictFp(localData)-> string  (initial identical-state comparison)
//   echoFp(localData)    -> string  (echo suppression / lastPushed tracking)
//   syncingOnChange      flip to 'syncing' immediately on local edit (Nutritions)
//
// Returns { user, syncStatus, lastSyncedAt, pendingServer,
//           confirmCloudWins, confirmLocalWins }.
// syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'awaiting-decision'
const DEBOUNCE_MS = 1500

export function useCloudSyncCore(config) {
  const {
    auth, db, onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
    collection, logPrefix,
    localData, applyRemote,
    hasData, serialize, readRemote, stashPending, applyPending,
    conflictFp, echoFp,
    syncingOnChange = false,
    guardRedundantPush = true,
  } = config

  const [user, setUser] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [pendingServer, setPendingServer] = useState(null)

  const initialSyncDone = useRef(false)
  const pushTimer = useRef(null)
  const lastPushedFingerprint = useRef(null)
  const justPulled = useRef(false)
  const dataRef = useRef(localData)
  // #81: pushInFlight = fingerprint of the write awaiting the server;
  // lastConfirmedFingerprint = last state the SERVER actually accepted.
  const pushInFlight = useRef(null)
  const lastConfirmedFingerprint = useRef(null)

  useEffect(() => { dataRef.current = localData }, [localData])

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (!u) {
        initialSyncDone.current = false
        lastPushedFingerprint.current = null
        pushInFlight.current = null
        lastConfirmedFingerprint.current = null
        setPendingServer(null)
        setSyncStatus('idle')
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setSyncStatus('syncing')
    const ref = doc(db, collection, user.uid)

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!initialSyncDone.current) {
          const remote = readRemote(snap)

          if (remote === null) {
            if (pushInFlight.current !== null) return
            const current = dataRef.current
            const fp = echoFp(current)
            lastPushedFingerprint.current = fp
            pushInFlight.current = fp
            setDoc(ref, { ...serialize(current), lastModified: serverTimestamp() })
              .then(() => {
                pushInFlight.current = null
                lastConfirmedFingerprint.current = fp
                initialSyncDone.current = true
                setLastSyncedAt(Date.now())
                setSyncStatus('synced')
              })
              .catch((e) => {
                pushInFlight.current = null
                lastPushedFingerprint.current = lastConfirmedFingerprint.current
                console.error(logPrefix + ' initial push failed:', e)
                setSyncStatus('error')
              })
            return
          }

          const localCfp = conflictFp(dataRef.current)
          const remoteCfp = conflictFp(remote)

          if (localCfp === remoteCfp) {
            const rfp = echoFp(remote)
            lastPushedFingerprint.current = rfp
            lastConfirmedFingerprint.current = rfp
            initialSyncDone.current = true
            setLastSyncedAt(Date.now())
            setSyncStatus('synced')
            return
          }

          if (hasData(dataRef.current)) {
            setPendingServer(stashPending(snap))
            setSyncStatus('awaiting-decision')
            return
          }

          justPulled.current = true
          applyRemote(remote)
          const rfp = echoFp(remote)
          lastPushedFingerprint.current = rfp
          lastConfirmedFingerprint.current = rfp
          initialSyncDone.current = true
          setLastSyncedAt(Date.now())
          setSyncStatus('synced')
          setTimeout(() => { justPulled.current = false }, 300)
          return
        }

        // ----- Live update path (after initial sync) -----
        const remote = readRemote(snap)
        if (remote === null) return
        const rfp = echoFp(remote)
        if (rfp === lastPushedFingerprint.current) return
        // #81: ignore the revert snapshot from a rejected push while one is in
        // flight, so it can't wipe the unsaved local change.
        if (pushInFlight.current !== null && rfp === lastConfirmedFingerprint.current) return

        justPulled.current = true
        applyRemote(remote)
        lastPushedFingerprint.current = rfp
        lastConfirmedFingerprint.current = rfp
        setLastSyncedAt(Date.now())
        setSyncStatus('synced')
        setTimeout(() => { justPulled.current = false }, 300)
      },
      (error) => {
        console.error(logPrefix + ' snapshot error:', error)
        setSyncStatus('error')
      }
    )

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user || !initialSyncDone.current || justPulled.current) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    if (syncingOnChange) setSyncStatus('syncing')
    pushTimer.current = setTimeout(() => {
      const ref = doc(db, collection, user.uid)
      const fp = echoFp(localData)
      if (guardRedundantPush && fp === lastPushedFingerprint.current) return
      lastPushedFingerprint.current = fp
      pushInFlight.current = fp
      setDoc(ref, { ...serialize(localData), lastModified: serverTimestamp() })
        .then(() => {
          pushInFlight.current = null
          lastConfirmedFingerprint.current = fp
          setLastSyncedAt(Date.now())
          setSyncStatus('synced')
        })
        .catch((e) => {
          pushInFlight.current = null
          lastPushedFingerprint.current = lastConfirmedFingerprint.current
          console.error(logPrefix + ' push failed:', e)
          setSyncStatus('error')
        })
    }, DEBOUNCE_MS)
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localData, user])

  const confirmCloudWins = () => {
    if (!pendingServer || !user) return
    justPulled.current = true
    const remote = applyPending(pendingServer)
    const rfp = echoFp(remote)
    lastPushedFingerprint.current = rfp
    lastConfirmedFingerprint.current = rfp
    initialSyncDone.current = true
    setPendingServer(null)
    setLastSyncedAt(Date.now())
    setSyncStatus('synced')
    setTimeout(() => { justPulled.current = false }, 300)
  }

  const confirmLocalWins = () => {
    if (!user) return
    const current = dataRef.current
    const ref = doc(db, collection, user.uid)
    const fp = echoFp(current)
    lastPushedFingerprint.current = fp
    pushInFlight.current = fp
    setSyncStatus('syncing')
    setDoc(ref, { ...serialize(current), lastModified: serverTimestamp() })
      .then(() => {
        pushInFlight.current = null
        lastConfirmedFingerprint.current = fp
        initialSyncDone.current = true
        setPendingServer(null)
        setLastSyncedAt(Date.now())
        setSyncStatus('synced')
      })
      .catch((e) => {
        pushInFlight.current = null
        lastPushedFingerprint.current = lastConfirmedFingerprint.current
        console.error(logPrefix + ' confirm-local push failed:', e)
        setSyncStatus('error')
      })
  }

  return { user, syncStatus, lastSyncedAt, pendingServer, confirmCloudWins, confirmLocalWins }
}
