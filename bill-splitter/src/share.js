// URL-based sharing for read-only bill views.
// Encodes state as URL-safe base64 in a query param (?d=...) so recipients can view
// the same bill by opening the link. No backend required for ?d= links.
//
// Optional short links (?s=<id>) require Firestore: payload is stored under
// shareLinks/<shortId> with a 7-day TTL. Signed-in users only.
//
// Reader supports three URL formats in priority order:
//   ?s=<8charId>  short link (Firestore-backed, requires async resolve)
//   ?d=<base64>   direct (new default since #60)
//   #<base64>     direct (legacy, pre-#60 shares)

import { db, doc, getDoc, setDoc, serverTimestamp } from './firebase'

const VERSION = 1
const SHORT_ID_LEN = 8
const SHORT_ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const MAX_PAYLOAD_SIZE = 95000

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

function generateShortId() {
  let id = ''
  for (let i = 0; i < SHORT_ID_LEN; i++) {
    id += SHORT_ID_CHARS[Math.floor(Math.random() * SHORT_ID_CHARS.length)]
  }
  return id
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
  u.searchParams.delete('s')
  u.searchParams.set('d', encodeShare(tab, state))
  return u.toString()
}

// Creates a Firestore short-link doc and returns a URL like '?s=<shortId>'.
// Requires signed-in user. Throws on auth/size/network failure.
export async function createShortLink(tab, state, uid = null) {
  const payload = encodeShare(tab, state)
  if (payload.length > MAX_PAYLOAD_SIZE) throw new Error('payload too large')
  const shortId = generateShortId()
  await setDoc(doc(db, 'shareLinks', shortId), {
    payload,
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // TTL: auto-delete after 7 days
    createdBy: uid || null,
  })
  const u = new URL(window.location.href)
  u.hash = ''
  u.searchParams.delete('d')
  u.searchParams.set('s', shortId)
  return u.toString()
}

// Resolves a short-link ID to a decoded share.
// Returns:
//   { ok: <data> }     - success
//   { expired: true }  - doc missing (TTL expired or never existed)
//   null               - network/decode error
export async function resolveShortLink(shortId) {
  try {
    const snap = await getDoc(doc(db, 'shareLinks', shortId))
    if (!snap.exists()) return { expired: true }
    const decoded = decodeShare(snap.data().payload)
    return decoded ? { ok: decoded } : null
  } catch (e) {
    console.error('[shortLink] resolve failed:', e)
    return null
  }
}

// Reads a shared bill from the current URL (synchronous).
// Handles ?d= (post-#60) and # (legacy). Does NOT handle ?s= short links
// (those need resolveShortLink async). Returns null if no direct link found.
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

// Returns the short-link ID if URL has ?s=, else null.
// Use with resolveShortLink to fetch the actual bill data.
export function getShortLinkId() {
  return new URL(window.location.href).searchParams.get('s')
}

export function clearShareHash() {
  const url = new URL(window.location.href)
  url.searchParams.delete('d')
  url.searchParams.delete('s')
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
