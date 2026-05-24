import { useEffect, useRef, useState } from 'react';
import {
  auth, db,
  onAuthStateChanged, doc, setDoc, serverTimestamp,
  onSnapshot,
} from '../firebase.js';

const DEBOUNCE_MS = 1500;

/** Does this local state contain user-generated content worth preserving? */
function localHasData(state) {
  if (!state) return false;
  if (state.customFoods && state.customFoods.length > 0) return true;
  if (state.days && Object.keys(state.days).length > 0) return true;
  if (state.weights && Object.keys(state.weights).length > 0) return true;
  return false;
}

/** Deep-canonical stringify with sorted keys. Strips lastEdit from days, since
 *  that field exists only on locally mutated copies — its presence/absence is
 *  not a real data conflict, just metadata drift. */
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

/** Fingerprint of synced fields. Drops day-level lastEdit so old (pre-tracking)
 *  server docs don't always look different from current local data. */
function syncFingerprint(state) {
  if (!state) return canonical(state);
  const days = state.days || {};
  const stripped = {};
  for (const k of Object.keys(days)) {
    const { lastEdit: _le, ...rest } = days[k];
    stripped[k] = rest;
  }
  return canonical({ ...state, days: stripped });
}

/**
 * Cloud sync for Nutritions with live updates and conflict protection.
 *
 * - Subscribes to users/<uid> via onSnapshot for real-time cross-device updates.
 * - On first sign-in:
 *     - server doc doesn't exist -> push local (first device)
 *     - server exists, local empty -> pull (safe)
 *     - server exists AND local has data -> 'awaiting-decision';
 *       UI shows a modal; user calls confirmCloudWins() or confirmLocalWins().
 * - After initial sync: debounced 1.5s pushes on every local change.
 * - Echo suppression via JSON fingerprint so our own pushes don't re-trigger pulls.
 * - Sign-out stops syncing; localStorage continues standalone.
 *
 * Returns { user, syncStatus, lastSyncedAt, pendingServerData,
 *          confirmCloudWins, confirmLocalWins }.
 * syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'awaiting-decision'
 */
export function useCloudSync({ state, replaceState }) {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [pendingServerData, setPendingServerData] = useState(null);

  const initialSyncDone = useRef(false);
  const pushTimer = useRef(null);
  const lastPushedFingerprint = useRef(null);
  const justPulled = useRef(false);
  const stateRef = useRef(state);

  // Keep stateRef fresh so async handlers can read the latest state.
  useEffect(() => { stateRef.current = state; }, [state]);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        initialSyncDone.current = false;
        lastPushedFingerprint.current = null;
        setPendingServerData(null);
        setSyncStatus('idle');
      }
    });
  }, []);

  // Live subscription — handles initial sync AND all subsequent updates
  useEffect(() => {
    if (!user) return;
    setSyncStatus('syncing');
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snap) => {
        if (!initialSyncDone.current) {
          // ----- Initial sync path -----
          if (!snap.exists()) {
            // First device — push local state
            const currentState = stateRef.current;
            const fingerprint = JSON.stringify(currentState);
            lastPushedFingerprint.current = fingerprint;
            setDoc(userDocRef, { ...currentState, lastModified: serverTimestamp() })
              .then(() => {
                initialSyncDone.current = true;
                setLastSyncedAt(Date.now());
                setSyncStatus('synced');
              })
              .catch((e) => {
                console.error('[cloudSync] initial push failed:', e);
                setSyncStatus('error');
              });
            return;
          }

          const serverData = snap.data();
          const { lastModified: _lmCheck, ...serverStateForCheck } = serverData;
          const localFp = syncFingerprint(stateRef.current);
          const serverFp = syncFingerprint(serverStateForCheck);

          if (localFp === serverFp) {
            // Functionally identical — no conflict, no UI prompt.
            lastPushedFingerprint.current = JSON.stringify(serverStateForCheck);
            initialSyncDone.current = true;
            setLastSyncedAt(Date.now());
            setSyncStatus('synced');
            return;
          }

          if (localHasData(stateRef.current)) {
            // Both sides have data AND they genuinely differ — ask the user.
            setPendingServerData(serverData);
            setSyncStatus('awaiting-decision');
            return;
          }

          // Local is empty — safe to pull
          const { lastModified: _lm, ...stateOnly } = serverData;
          justPulled.current = true;
          replaceState(stateOnly);
          lastPushedFingerprint.current = JSON.stringify(stateOnly);
          initialSyncDone.current = true;
          setLastSyncedAt(Date.now());
          setSyncStatus('synced');
          setTimeout(() => { justPulled.current = false; }, 300);
          return;
        }

        // ----- Live update path (after initial sync) -----
        if (!snap.exists()) return;
        const serverData = snap.data();
        const { lastModified: _lm, ...stateOnly } = serverData;
        const serverFingerprint = JSON.stringify(stateOnly);

        // Echo suppression: ignore confirmations of our own recent push
        if (serverFingerprint === lastPushedFingerprint.current) return;

        // Genuine remote change — pull
        justPulled.current = true;
        replaceState(stateOnly);
        lastPushedFingerprint.current = serverFingerprint;
        setLastSyncedAt(Date.now());
        setSyncStatus('synced');
        setTimeout(() => { justPulled.current = false; }, 300);
      },
      (error) => {
        console.error('[cloudSync] snapshot error:', error);
        setSyncStatus('error');
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Push on local state changes, debounced (after initial sync)
  useEffect(() => {
    if (!user || !initialSyncDone.current) return;
    if (justPulled.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    setSyncStatus('syncing');

    pushTimer.current = setTimeout(() => {
      const userDocRef = doc(db, 'users', user.uid);
      const fingerprint = JSON.stringify(state);
      lastPushedFingerprint.current = fingerprint;
      setDoc(userDocRef, { ...state, lastModified: serverTimestamp() })
        .then(() => {
          setLastSyncedAt(Date.now());
          setSyncStatus('synced');
        })
        .catch((e) => {
          console.error('[cloudSync] push failed:', e);
          setSyncStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, user]);

  // ----- Conflict resolution callbacks -----
  const confirmCloudWins = () => {
    if (!pendingServerData || !user) return;
    const { lastModified: _lm, ...stateOnly } = pendingServerData;
    justPulled.current = true;
    replaceState(stateOnly);
    lastPushedFingerprint.current = JSON.stringify(stateOnly);
    initialSyncDone.current = true;
    setPendingServerData(null);
    setLastSyncedAt(Date.now());
    setSyncStatus('synced');
    setTimeout(() => { justPulled.current = false; }, 300);
  };

  const confirmLocalWins = () => {
    if (!user) return;
    const currentState = stateRef.current;
    const userDocRef = doc(db, 'users', user.uid);
    const fingerprint = JSON.stringify(currentState);
    lastPushedFingerprint.current = fingerprint;
    setSyncStatus('syncing');
    setDoc(userDocRef, { ...currentState, lastModified: serverTimestamp() })
      .then(() => {
        initialSyncDone.current = true;
        setPendingServerData(null);
        setLastSyncedAt(Date.now());
        setSyncStatus('synced');
      })
      .catch((e) => {
        console.error('[cloudSync] confirm-local push failed:', e);
        setSyncStatus('error');
      });
  };

  return {
    user,
    syncStatus,
    lastSyncedAt,
    pendingServerData,
    confirmCloudWins,
    confirmLocalWins,
  };
}
