// Feature #22 — Google Drive AppData sync.
//
// Uses Google Identity Services (GIS) token client flow with the
// drive.appdata scope. Reads/writes a single hidden JSON blob in the
// caller's AppData folder. No backend; no other person can see the file.
//
// Status states: 'signed_out' | 'signed_in' | 'syncing' | 'synced' | 'error'

import { useCallback, useEffect, useRef, useState } from 'react';
import { GOOGLE_OAUTH_CLIENT_ID } from '../config.js';
import { useLang } from '../LangContext.jsx';

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'nutritions-thailand-store.v1.json';
const LS_TOKEN_KEY = 'nutritions.gauth_token_v1';
const LS_EMAIL_KEY = 'nutritions.gauth_email_v1';
const LS_LAST_SYNCED_KEY = 'nutritions.last_synced_v1';

function loadSavedToken() {
  try {
    const raw = localStorage.getItem(LS_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.access_token || !parsed.expires_at) return null;
    if (Date.now() > parsed.expires_at - 60000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToken(t) {
  if (t) localStorage.setItem(LS_TOKEN_KEY, JSON.stringify(t));
  else localStorage.removeItem(LS_TOKEN_KEY);
}

function waitForGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google.accounts.oauth2);
    const start = Date.now();
    const i = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(i); resolve(window.google.accounts.oauth2); }
      else if (Date.now() - start > 10000) { clearInterval(i); reject(new Error('GIS not loaded')); }
    }, 100);
  });
}

/**
 * Drive AppData sync hook.
 * Takes a store-like object with stats/customFoods/days/weights + replaceState.
 */
export function useDriveSync(store) {
  const { t } = useLang();
  const [status, setStatus] = useState(loadSavedToken() ? 'signed_in' : 'signed_out');
  const [email, setEmail] = useState(localStorage.getItem(LS_EMAIL_KEY) || null);
  const [lastSynced, setLastSynced] = useState(localStorage.getItem(LS_LAST_SYNCED_KEY));
  const [error, setError] = useState(null);
  const tokenRef = useRef(loadSavedToken());
  const debounceRef = useRef(null);
  const justPulledRef = useRef(false);

  const serialize = useCallback(() => JSON.stringify({
    stats: store.stats,
    customFoods: store.customFoods,
    days: store.days,
    weights: store.weights,
  }), [store.stats, store.customFoods, store.days, store.weights]);

  const callApi = useCallback(async (path, init = {}) => {
    const tok = tokenRef.current?.access_token;
    if (!tok) throw new Error('not_signed_in');
    const resp = await fetch('https://www.googleapis.com' + path, {
      ...init,
      headers: { Authorization: 'Bearer ' + tok, ...(init.headers || {}) },
    });
    if (resp.status === 401) {
      tokenRef.current = null; saveToken(null); setStatus('signed_out');
      throw new Error('token_expired');
    }
    if (!resp.ok) throw new Error('api_error_' + resp.status);
    return resp;
  }, []);

  const findFileId = useCallback(async () => {
    const resp = await callApi(
      '/drive/v3/files?spaces=appDataFolder&q=' +
      encodeURIComponent("name='" + FILE_NAME + "'") +
      '&fields=files(id,modifiedTime)'
    );
    const data = await resp.json();
    return data.files?.[0] || null;
  }, [callApi]);

  const push = useCallback(async () => {
    setStatus('syncing'); setError(null);
    try {
      const body = serialize();
      const file = await findFileId();
      if (file) {
        await callApi('/upload/drive/v3/files/' + file.id + '?uploadType=media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } else {
        const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };
        const boundary = '---NTSync' + Math.random().toString(36).slice(2);
        const multipart =
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: application/json\r\n\r\n' +
          body + '\r\n' +
          '--' + boundary + '--';
        await callApi('/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
          body: multipart,
        });
      }
      const now = new Date().toISOString();
      setLastSynced(now); localStorage.setItem(LS_LAST_SYNCED_KEY, now);
      setStatus('synced');
    } catch (e) {
      setError(String(e.message || e)); setStatus('error'); throw e;
    }
  }, [serialize, findFileId, callApi]);

  const pull = useCallback(async () => {
    setStatus('syncing'); setError(null);
    try {
      const file = await findFileId();
      if (!file) { await push(); return; }
      const resp = await callApi('/drive/v3/files/' + file.id + '?alt=media');
      const text = await resp.text();
      const parsed = JSON.parse(text);
      justPulledRef.current = true;
      store.replaceState(parsed);
      const now = new Date().toISOString();
      setLastSynced(now); localStorage.setItem(LS_LAST_SYNCED_KEY, now);
      setStatus('synced');
    } catch (e) {
      setError(String(e.message || e)); setStatus('error'); throw e;
    }
  }, [findFileId, callApi, push, store]);

  // Auto-push on store change, debounced 5s, only when signed in.
  useEffect(() => {
    if (!tokenRef.current) return;
    if (justPulledRef.current) { justPulledRef.current = false; return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { push().catch(() => {}); }, 5000);
    return () => clearTimeout(debounceRef.current);
  }, [serialize, push]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const oauth2 = await waitForGis();
      await new Promise((resolve, reject) => {
        const client = oauth2.initTokenClient({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          scope: SCOPE,
          callback: (resp) => {
            if (resp.error) return reject(new Error(resp.error));
            const expiresAt = Date.now() + (resp.expires_in * 1000);
            const tok = { access_token: resp.access_token, expires_at: expiresAt };
            tokenRef.current = tok; saveToken(tok);
            resolve(resp);
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      });

      try {
        const aboutResp = await callApi('/drive/v3/about?fields=user(emailAddress)');
        const about = await aboutResp.json();
        const e = about.user?.emailAddress;
        if (e) { setEmail(e); localStorage.setItem(LS_EMAIL_KEY, e); }
      } catch {}

      const hasLocal = (store.days && Object.keys(store.days).length > 0) ||
                       (store.customFoods && store.customFoods.length > 0) ||
                       (store.weights && Object.keys(store.weights).length > 0);
      const cloudFile = await findFileId();

      if (!cloudFile && hasLocal) {
        await push();
      } else if (cloudFile && !hasLocal) {
        await pull();
      } else if (cloudFile && hasLocal) {
        const useCloud = window.confirm(t('sync.conflict'));
        if (useCloud) await pull();
        else await push();
      } else {
        setStatus('signed_in');
      }
    } catch (e) {
      setError(String(e.message || e)); setStatus('error');
    }
  }, [findFileId, push, pull, callApi, store.days, store.customFoods, store.weights, t]);

  const signOut = useCallback(() => {
    tokenRef.current = null; saveToken(null);
    setEmail(null); localStorage.removeItem(LS_EMAIL_KEY);
    setLastSynced(null); localStorage.removeItem(LS_LAST_SYNCED_KEY);
    setStatus('signed_out'); setError(null);
  }, []);

  return {
    status,
    email,
    lastSynced,
    error,
    isSignedIn: status !== 'signed_out',
    signIn,
    signOut,
    push,
    pull,
  };
}
