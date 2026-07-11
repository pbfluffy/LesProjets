// liff.js — Line Front-end Framework wrapper
// Safe to import anywhere; all errors are caught silently so the app
// boots normally when running outside Line or when the SDK fails to load.

const LIFF_ID = '2010463377-Zvx08i7N'

let _ready = false
let _failed = false
let _initPromise = null

// Call once on app mount. Resolves when LIFF is ready (or failed silently).
export async function initLiff() {
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    try {
      // liff is injected by the SDK script tag in index.html
      if (typeof window.liff === 'undefined') {
        _failed = true
        return
      }
      await window.liff.init({ liffId: LIFF_ID })
      _ready = true
    } catch (e) {
      _failed = true
      console.warn('[liff] init failed — running in browser mode', e)
    }
  })()
  return _initPromise
}

// True only when running inside the Line app
export function isInLine() {
  if (!_ready) return false
  try { return window.liff.isInClient() } catch { return false }
}

// True after initLiff() resolves without error
export function isLiffReady() {
  return _ready
}

// Returns { userId, displayName, pictureUrl } or null
export async function getLiffProfile() {
  if (!_ready || !isInLine()) return null
  try {
    return await window.liff.getProfile()
  } catch (e) {
    console.warn('[liff] getProfile failed', e)
    return null
  }
}

// Share text message via Line shareTargetPicker (inside Line only).
// Falls back to window.open share URL when outside Line.
export async function shareToLine(text) {
  if (_ready && isInLine()) {
    try {
      await window.liff.shareTargetPicker([
        { type: 'text', text }
      ])
      return 'shared'
    } catch (e) {
      if (e?.code === 'LIFF_STORE' || e?.message?.includes('cancel')) return 'cancelled'
      console.warn('[liff] shareTargetPicker failed', e)
    }
  }
  // Fallback — navigate to Line's share URL (works in any browser).
  // Previously used window.open(url, '_blank'), which on iOS Safari often
  // left a stray "about:blank" tab open when the hand-off to the Line app
  // didn't complete inside the popup window. Top-level navigation avoids
  // that: on mobile with Line installed this hands off to the app via
  // universal link; the pumgoda tab stays in history (Back returns to it).
  window.location.href = `https://line.me/R/share?text=${encodeURIComponent(text)}`
  return 'opened'
}
