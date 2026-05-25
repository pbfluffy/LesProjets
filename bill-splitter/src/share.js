// URL-based sharing for read-only bill views.
// Encodes state as URL-safe base64 in a query param (?d=...) so recipients can view
// the same bill by opening the link. No backend required.
//
// Note: older links use a URL hash (#...). The reader supports both formats for
// backward compatibility; the writer always uses ?d= now (messaging apps strip
// hash fragments from auto-linkified URLs, breaking shares in LINE/WhatsApp/etc.)

const VERSION = 1

function utf8ToB64Url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64UrlToUtf8(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeShare(tab, state) {
  return utf8ToB64Url(JSON.stringify({ v: VERSION, t: tab, s: state }))
}

export function decodeShare(payload) {
  try {
    const obj = JSON.parse(b64UrlToUtf8(payload))
    if (obj && (obj.t === 'split' || obj.t === 'sushi') && obj.s) return obj
  } catch {}
  return null
}

export function buildShareUrl(tab, state) {
  const u = new URL(window.location.href)
  u.hash = ''
  u.searchParams.set('d', encodeShare(tab, state))
  return u.toString()
}

// Reads a shared bill from the current URL.
// Preferred: ?d=<payload> (new format, survives auto-linkifiers in messaging apps)
// Fallback: #<payload>  (legacy format, links shared before the ?d= switch)
export function readShareFromHash() {
  const url = new URL(window.location.href)
  const fromQuery = url.searchParams.get('d')
  if (fromQuery) {
    const decoded = decodeShare(fromQuery)
    if (decoded) return decoded
  }
  const fromHash = window.location.hash.replace(/^#/, '')
  return fromHash ? decodeShare(fromHash) : null
}

export function clearShareHash() {
  const url = new URL(window.location.href)
  url.searchParams.delete('d')
  url.hash = ''
  history.replaceState(null, '', url.pathname + url.search)
}

export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
