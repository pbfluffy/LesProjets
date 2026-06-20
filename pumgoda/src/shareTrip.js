// Read-only trip sharing for Pumgoda (#97 Phase 2).
// Encodes a trip as URL-safe base64 in a ?trip= query param so a recipient can
// open the same itinerary and clone it into their own trips. No backend — the
// payload is tiny ({ name, placeIds }); the recipient resolves place details
// from their own Sheet fetch (a place since removed shows as unavailable).
// Mirrors bill-splitter/src/share.js (the ?d= direct-link path), URL-only.

const VERSION = 1
const MAX_STOPS = 8

function utf8ToB64Url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  let b64 = btoa(bin).split('+').join('-').split('/').join('_')
  while (b64.endsWith('=')) b64 = b64.slice(0, -1)
  return b64
}

function b64UrlToUtf8(s) {
  s = s.split('-').join('+').split('_').join('/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Serialize just the portable bits of a trip: name + ordered place IDs.
export function encodeTrip(trip) {
  const name = (trip && trip.name ? trip.name : '').trim().slice(0, 50)
  const placeIds = Array.isArray(trip && trip.placeIds) ? trip.placeIds.slice(0, MAX_STOPS) : []
  return utf8ToB64Url(JSON.stringify({ v: VERSION, n: name, p: placeIds }))
}

export function decodeTrip(payload) {
  try {
    const obj = JSON.parse(b64UrlToUtf8(payload))
    if (!obj || typeof obj !== 'object') return null
    const placeIds = Array.isArray(obj.p)
      ? obj.p.filter((x) => typeof x === 'string').slice(0, MAX_STOPS)
      : []
    const name = typeof obj.n === 'string' ? obj.n.trim().slice(0, 50) : ''
    return { name, placeIds }
  } catch {
    return null
  }
}

// Build a shareable URL that deep-links the trip via ?trip=<payload>.
// Fix P2: also strip ?ctrip= so a snapshot share made while inside a collab
// trip doesn't carry the join code — recipient would see the join overlay
// after dismissing the snapshot view.
export function buildTripShareUrl(trip) {
  const u = new URL(window.location.href)
  u.hash = ''
  u.searchParams.delete('ctrip')
  u.searchParams.set('trip', encodeTrip(trip))
  return u.toString()
}

// Read a shared trip from the current URL (?trip=). Returns { name, placeIds } or null.
export function readSharedTrip() {
  const payload = new URL(window.location.href).searchParams.get('trip')
  return payload ? decodeTrip(payload) : null
}

// ── #97 Phase 3: collaborative trips share only the trip CODE (?ctrip=<id>),
// not a snapshot — both people open the same live sharedTrips/<id> doc.

export function buildCollabTripUrl(remoteId) {
  const u = new URL(window.location.href)
  u.hash = ''
  u.searchParams.delete('trip')
  u.searchParams.set('ctrip', remoteId)
  return u.toString()
}

export function readCollabTripId() {
  const id = new URL(window.location.href).searchParams.get('ctrip')
  return id && /^[A-Za-z0-9_-]{4,64}$/.test(id) ? id : null
}

export function clearCollabTripParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('ctrip')
  url.hash = ''
  history.replaceState(null, '', url.pathname + url.search)
}

// Strip the ?trip= param without reloading (after clone or dismiss).
export function clearSharedTripParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('trip')
  url.hash = ''
  history.replaceState(null, '', url.pathname + url.search)
}
