import { createContext, useContext, useEffect, useState } from 'react'
import {
  auth, db, doc, getDoc, onAuthStateChanged, signInWithCustomToken, updateProfile,
  GoogleAuthProvider, signInWithPopup, signOut, saveProfile,
} from '../firebase'
import { WORKER_URL, LINE_CHANNEL_ID, OWNER_UID } from '../config'

// LINE Login: the app sends the visitor to LINE, LINE sends them back to
// this page with ?code=…&state=…, and the Worker trades the code for a
// Firebase custom token (see worker/src/index.js).
const REDIRECT_URI = window.location.origin + import.meta.env.BASE_URL
const STATE_KEY = 'village_line_state'

export const lineConfigured = !!LINE_CHANNEL_ID

export function startLineLogin() {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
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
  const expected = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  if (!code || !state || state !== expected) return 'cancelled'

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [finishing, setFinishing] = useState(() => new URLSearchParams(window.location.search).has('code'))

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u)
    if (!u) return setIsAdmin(false)
    if (u.uid === OWNER_UID) return setIsAdmin(true)
    try {
      setIsAdmin((await getDoc(doc(db, 'admins', u.uid))).exists())
    } catch {
      setIsAdmin(false)
    }
  }), [])

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
    isAdmin,
    finishing,
    loginError,
    clearLoginError: () => setLoginError(''),
    startLineLogin,
    adminSignIn,
    signOut: () => signOut(auth),
  }
}

// { user, isAdmin, requireSignIn } for any component (cards, star picker).
// requireSignIn() returns true when signed in, otherwise starts LINE sign-in.
export const AuthContext = createContext(null)
export const useAuthContext = () => useContext(AuthContext)
