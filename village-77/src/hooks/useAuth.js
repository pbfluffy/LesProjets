import { createContext, useContext, useEffect, useState } from 'react'
import {
  auth, db, doc, onSnapshot, onAuthStateChanged, signInWithCustomToken, updateProfile,
  GoogleAuthProvider, signInWithPopup, signOut, saveProfile,
} from '../firebase'
import { WORKER_URL, LINE_CHANNEL_ID, OWNER_UID } from '../config'
import { liffIdToken } from '../liff'

// LINE Login: the app sends the visitor to LINE, LINE sends them back to
// this page with ?code=…&state=…, and the Worker trades the code for a
// Firebase custom token (see worker/src/index.js).
const REDIRECT_URI = window.location.origin + import.meta.env.BASE_URL
// localStorage, not sessionStorage: on phones LINE often hands the login back
// in a new browser tab, which starts with an empty sessionStorage — the
// state check then failed and the sign-in was silently dropped.
const STATE_KEY = 'village_line_state'
// Set when the user signs out, so the automatic sign-in inside LINE leaves
// them signed out for the rest of the visit.
const SIGNED_OUT_KEY = 'village_signed_out'

export const lineConfigured = !!LINE_CHANNEL_ID

// Installed to the home screen (PWA). On an iPhone, LINE's login page opens
// in Safari and LINE sends the user back to Safari, not to the installed
// app — which has its own, separate sign-in. So from the installed app the
// sign-in is handed off: the app makes a one-time id and puts it in the
// LINE `state` ("h" + id); Safari finishes the login and parks it on the
// Worker under that id; the app collects it when the user switches back.
const isHomeScreenApp = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const HANDOFF_KEY = 'village_line_handoff' // { id, started } while waiting
const HANDOFF_MAX_MS = 10 * 60 * 1000 // the Worker drops parked sign-ins after this
const randomHex = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')

function readHandoff() {
  try {
    const h = JSON.parse(localStorage.getItem(HANDOFF_KEY))
    return h && Date.now() - h.started < HANDOFF_MAX_MS ? h : null
  } catch {
    return null
  }
}
function clearHandoff() {
  try { localStorage.removeItem(HANDOFF_KEY) } catch { /* storage blocked */ }
}

// Web sign-in: off to LINE's login page and back (finishLineLogin).
function redirectToLine() {
  let state = crypto.randomUUID()
  if (isHomeScreenApp) {
    const id = randomHex()
    state = 'h' + id
    try { localStorage.setItem(HANDOFF_KEY, JSON.stringify({ id, started: Date.now() })) } catch { /* storage blocked */ }
  }
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
  if (lineError) {
    const reason = 'LINE: ' + (params.get('error_description') || lineError)
    // Log it on the Worker too, so failed sign-ins can be traced later.
    fetch(WORKER_URL + '/line-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineError: reason }),
    }).catch(() => {})
    throw new Error(reason)
  }
  // A different state means this code came from someone else's login link
  // (login CSRF) — refuse it. No stored state at all (LINE returned into a
  // browser that never started the login, or storage is blocked) is let
  // through: the Worker still checks the code with LINE.
  if (!state || (expected && state !== expected)) throw new Error('login link did not match — try again')

  // Started from the home-screen app: park the sign-in for it (see above).
  const handoff = /^h[0-9a-f]{32}$/.test(state) ? state.slice(1) : null
  if (handoff) {
    await postWorker('/line-auth', { code, redirectUri: REDIRECT_URI, handoff })
    return 'handedOff'
  }
  await signInViaWorker({ code, redirectUri: REDIRECT_URI })
  return 'ok'
}

async function postWorker(path, body) {
  const res = await fetch(WORKER_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'LINE sign-in failed')
  return res.json()
}

// Worker trades a LINE code or ID token for a Firebase custom token.
async function signInViaWorker(body) {
  return completeSignIn(await postWorker('/line-auth', body))
}

async function completeSignIn({ customToken, name, picture }) {
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

  const [authReady, setAuthReady] = useState(false)
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u)
    setAuthReady(true)
  }), [])

  // Opened inside the LINE app (LIFF): sign in silently with the LINE
  // account already there, so nobody has to tap "sign in" in LINE — unless
  // they signed out on purpose this session.
  useEffect(() => {
    if (!authReady || user) return
    try { if (sessionStorage.getItem(SIGNED_OUT_KEY)) return } catch { /* storage blocked */ }
    let cancelled = false
    liffIdToken().then((idToken) => {
      if (!idToken || cancelled || auth.currentUser) return
      return signInViaWorker({ idToken })
    }).catch((e) => console.warn('[village] automatic LINE sign-in failed:', e))
    return () => { cancelled = true }
  }, [authReady, user])

  useEffect(() => {
    if (!user) return setRole(null)
    if (user.uid === OWNER_UID) return setRole('owner')
    return onSnapshot(
      doc(db, 'villageAdmins', user.uid),
      (snap) => setRole(snap.exists() ? 'admin' : null),
      () => setRole(null),
    )
  }, [user])

  // Banned by an admin (villageBans/{uid}): the reason, or null. Live, so
  // a ban or unban shows without reloading.
  const [ban, setBan] = useState(null)
  useEffect(() => {
    if (!user) return setBan(null)
    return onSnapshot(
      doc(db, 'villageBans', user.uid),
      (snap) => setBan(snap.exists() ? { reason: snap.data().reason || '' } : null),
      () => setBan(null),
    )
  }, [user])

  // In Safari after a sign-in started from the home-screen app: "go back".
  const [handedOff, setHandedOff] = useState(false)
  // In the home-screen app while Safari finishes the LINE sign-in.
  const [waitingHandoff, setWaitingHandoff] = useState(() => isHomeScreenApp && !!readHandoff())

  // Collect a parked sign-in: now, every few seconds, and whenever the app
  // comes back to the front (the user switching back from Safari).
  useEffect(() => {
    if (!waitingHandoff) return
    let busy = false
    const check = async () => {
      if (busy) return
      const h = readHandoff()
      if (!h) {
        clearHandoff()
        return setWaitingHandoff(false)
      }
      busy = true
      try {
        const res = await fetch(WORKER_URL + '/line-handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handoff: h.id }),
        })
        if (res.status === 404) return // Safari hasn't finished yet
        clearHandoff()
        setWaitingHandoff(false)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'LINE sign-in failed')
        await completeSignIn(await res.json())
      } catch (e) {
        console.error('[village] home-screen sign-in failed:', e)
        setLoginError(e.message)
      } finally {
        busy = false
      }
    }
    check()
    const timer = setInterval(check, 2500)
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [waitingHandoff])

  useEffect(() => {
    finishLineLogin()
      .then((result) => result === 'handedOff' && setHandedOff(true))
      .catch((e) => {
        console.error('[village] LINE sign-in failed:', e)
        setLoginError(e.message)
      })
      .finally(() => setFinishing(false))
  }, [])

  // Inside the LINE app (LIFF), sign in with the ID token LINE already has;
  // anywhere else, go through LINE's login page.
  async function startLineLogin() {
    const idToken = await liffIdToken()
    if (!idToken) {
      if (isHomeScreenApp) setWaitingHandoff(true)
      return redirectToLine()
    }
    setFinishing(true)
    try {
      await signInViaWorker({ idToken })
    } catch (e) {
      console.error('[village] LINE (LIFF) sign-in failed:', e)
      setLoginError(e.message)
    } finally {
      setFinishing(false)
    }
  }

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
    ban,
    finishing,
    handedOff,
    waitingHandoff,
    cancelHandoff: () => { clearHandoff(); setWaitingHandoff(false) },
    loginError,
    clearLoginError: () => setLoginError(''),
    startLineLogin,
    adminSignIn,
    signOut: () => {
      try { sessionStorage.setItem(SIGNED_OUT_KEY, '1') } catch { /* storage blocked */ }
      return signOut(auth)
    },
  }
}

// { user, isAdmin, isOwner, requireSignIn } for any component.
// requireSignIn() returns true when signed in, otherwise starts LINE sign-in.
export const AuthContext = createContext(null)
export const useAuthContext = () => useContext(AuthContext)
