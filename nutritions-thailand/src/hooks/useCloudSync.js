import { useEffect, useRef, useState } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, serverTimestamp } from '../firebase.js';

const DEBOUNCE_MS = 1500;

/**
 * Cloud sync for Nutritions.
 *
 * On sign-in:
 *   - If server doc exists, pull it into local state (overwrites local).
 *   - If not, push local state to server.
 *
 * After initial sync, every local state change is debounced and pushed.
 * Sign-out stops syncing; local data continues to work via localStorage.
 *
 * Returns { user, syncStatus, lastSyncedAt }.
 *   syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
 */
export function useCloudSync({ state, replaceState }) {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const initialSyncDone = useRef(false);
  const pushTimer = useRef(null);
  const justPulled = useRef(false);

  // Listen to auth state
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        initialSyncDone.current = false;
        setSyncStatus('idle');
      }
    });
  }, []);

  // On sign-in: do initial pull or push
  useEffect(() => {
    if (!user) return;
    setSyncStatus('syncing');
    const userDocRef = doc(db, 'users', user.uid);

    (async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          // Server has data — pull and overwrite local
          const serverData = snap.data();
          const { lastModified, ...stateOnly } = serverData;
          justPulled.current = true;
          replaceState(stateOnly);
          // Clear the flag on the next macrotask; the post-pull state-change
          // effect runs and we want to skip the push.
          setTimeout(() => { justPulled.current = false; }, 200);
        } else {
          // First device — push local to server
          await setDoc(userDocRef, {
            ...state,
            lastModified: serverTimestamp(),
          });
        }
        initialSyncDone.current = true;
        setLastSyncedAt(Date.now());
        setSyncStatus('synced');
      } catch (e) {
        console.error('[cloudSync] initial sync failed:', e);
        setSyncStatus('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // After initial sync, debounce-push on every state change
  useEffect(() => {
    if (!user || !initialSyncDone.current) return;
    if (justPulled.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    setSyncStatus('syncing');

    pushTimer.current = setTimeout(() => {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        ...state,
        lastModified: serverTimestamp(),
      }).then(() => {
        setLastSyncedAt(Date.now());
        setSyncStatus('synced');
      }).catch((e) => {
        console.error('[cloudSync] push failed:', e);
        setSyncStatus('error');
      });
    }, DEBOUNCE_MS);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, user]);

  return { user, syncStatus, lastSyncedAt };
}
