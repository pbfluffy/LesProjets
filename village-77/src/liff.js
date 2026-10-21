import { LIFF_ID } from './config'

// LIFF (LINE Front-end Framework): when the app runs inside the LINE app,
// LINE can hand over the user's ID token directly, so signing in needs no
// trip to LINE's web login page — which on some iPhones shows an email /
// password form and "Unable to log in". Only loaded inside LINE (by user
// agent) so it never touches the normal web sign-in.
const SDK = 'https://static.line-scdn.net/liff/edge/2/sdk.js'

export const liffConfigured = !!LIFF_ID
// LINE's in-app browser and LIFF views both say "Line/<version>".
export const inLineApp = /\bLine\//i.test(navigator.userAgent)
// Opens the app inside LINE (universal link: LINE app if installed).
export const LIFF_URL = LIFF_ID ? 'https://liff.line.me/' + LIFF_ID : null

let ready = null
function initLiff() {
  if (!ready) {
    ready = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SDK
      s.onload = () => window.liff.init({ liffId: LIFF_ID }).then(resolve, reject)
      s.onerror = () => reject(new Error('LIFF SDK failed to load'))
      document.head.appendChild(s)
    })
  }
  return ready
}

// Start loading early inside LINE so the sign-in tap is instant.
if (liffConfigured && inLineApp) initLiff().catch((e) => console.warn('[liff] init failed', e))

// The user's LINE ID token, or null when not usable (outside LINE, not set
// up, or LIFF failed) — callers then fall back to the web sign-in.
export async function liffIdToken() {
  if (!liffConfigured || !inLineApp) return null
  try {
    await initLiff()
    if (!window.liff.isInClient() || !window.liff.isLoggedIn()) return null
    return window.liff.getIDToken()
  } catch (e) {
    console.warn('[liff] no ID token', e)
    return null
  }
}
