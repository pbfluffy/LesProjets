import { createContext, useContext, useEffect, useState } from 'react'
import {
  auth, db, doc, onSnapshot, onAuthStateChanged, signInWithCustomToken, updateProfile,
  GoogleAuthProvider, signInWithPopup, signOut, saveProfile,
} from '../firebase'
import { WORKER_URL, LINE_CHANNEL_ID, OWNER_UID } from '../config'

// LINE Login: the app sends the visitor to LINE, LINE sends them back to
// this page with ?code=…&state=…, and the Worker trades the code for a
// Firebase custom token (see worker/src/index.js).
const REDIRECT_URI = window.location.origin + import.meta.env.BASE_URL
// localStorage, not sessionStorage: on phones LINE often hands the login back
// in a new browser tab, which starts with an empty sessionStorage — the
// state check then failed and the sign-in was silently dropped.
const STATE_KEY = 'village_line_state'

export const lineConfigured = !!LINE_CHANNEL_ID

export function startLineLogin() {
  const state = crypto.randomUUID()
  try { localStorage.setItem(STATE_KEY, state) } catch { /* storage blocked — see finishLineLogin */ }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: 'profile openid',
  })
  window.location.assign('https://access.line.me/oauth2/v2.1/authorize?' + params)
}

// Runs once on load: finishes a LINE sign-in if we just came back from LINE.
async function finishLineLogin() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code && !params.get('error')) return null

  // Clean the URL either way so a reload doesn't replay the code.
  window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  let expected = null
  try {
    expected = localStorage.getItem(STATE_KEY)
    localStorage.removeItem(STATE_KEY)
  } catch { /* storage blocked */ }

  // Pressing "cancel" on LINE's page isn't an error worth showing.
  const lineError = params.get('error')
  if (lineError === 'access_denied') return 'cancelled'
  if (lineError) throw new Error('LINE: ' + (params.get('error_description') || lineError))
  // A different state means this code came from someone else's login link
  // (login CSRF) — refuse it. No stored state at all (LINE returned into a
  // browser that never started the login, or storage is blocked) is let
  // through: the Worker still checks the code with LINE.
  if (!state || (expected && state !== expected)) throw new Error('login link did not match — try again')

  const res = await fetch(WORKER_URL + '/line-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'LINE sign-in failed')
  const { customToken, name, picture } = await res.json()
  const { user } = await signInWithCustomToken(auth, customToken)
  if (user.displayName !== name || user.photoURL !== (picture || null)) {
    await updateProfile(user, { displayName: name, photoURL: picture || null })
    saveProfile(user)
  }
  return 'ok'
}

export function useAuth() {
  const [user, setUser] = useState(null)
  // 'owner' (OWNER_UID) | 'admin' (listed in villageAdmins) | null.
  // Watched live, so a newly granted admin gets the tab without reloading.
  const [role, setRole] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [finishing, setFinishing] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    return p.has('code') || p.has('error')
  })

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!user) return setRole(null)
    if (user.uid === OWNER_UID) return setRole('owner')
    return onSnapshot(
      doc(db, 'villageAdmins', user.uid),
      (snap) => setRole(snap.exists() ? 'admin' : null),
      () => setRole(null),
    )
  }, [user])

  useEffect(() => {
    finishLineLogin()
      .catch((e) => {
        console.error('[village] LINE sign-in failed:', e)
        setLoginError(e.message)
      })
      .finally(() => setFinishing(false))
  }, [])

  async function adminSignIn() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        console.error('[village] admin sign-in failed:', e)
      }
    }
  }

  return {
    user,
    role,
    isAdmin: !!role,
    isOwner: role === 'owner',
    finishing,
    loginError,
    clearLoginError: () => setLoginError(''),
    startLineLogin,
    adminSignIn,
    signOut: () => signOut(auth),
  }
}

// { user, isAdmin, isOwner, requireSignIn } for any component.
// requireSignIn() returns true when signed in, otherwise starts LINE sign-in.
export const AuthContext = createContext(null)
export const useAuthContext = () => useContext(AuthContext)
