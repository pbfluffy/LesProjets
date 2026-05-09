// URL-hash sharing for read-only bill views.
// Encodes state as URL-safe base64 in the URL hash so recipients can view
// the same bill by opening the link. No backend required.

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

export function decodeShare(hash) {
  try {
    const obj = JSON.parse(b64UrlToUtf8(hash))
    if (obj && (obj.t === 'split' || obj.t === 'sushi') && obj.s) return obj
  } catch {}
  return null
}

export function buildShareUrl(tab, state) {
  const u = new URL(window.location.href)
  u.hash = encodeShare(tab, state)
  return u.toString()
}

export function readShareFromHash() {
  const h = window.location.hash.replace(/^#/, '')
  return h ? decodeShare(h) : null
}

export function clearShareHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search)
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
