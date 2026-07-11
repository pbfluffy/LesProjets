// Deep-linkable single-place sharing for Pumgoda.
// Mirrors the ?trip=/?ctrip= pattern in shareTrip.js, but for one place: the
// currently open PlaceDetail is mirrored into ?place=<id> so the Share button
// (and a plain copy-paste of the address bar) produces a link that reopens
// that exact place, instead of always collapsing to the bare app URL.

// Read ?place= from the current URL. Loose id format check only (place IDs
// are admin-assigned, e.g. "P001") — an unmatched id is just ignored by the
// caller once places have loaded.
export function readPlaceId() {
  const id = new URL(window.location.href).searchParams.get('place')
  return id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null
}

// Write ?place=<id> into the URL without a reload or new history entry.
export function setPlaceParam(id) {
  const url = new URL(window.location.href)
  url.searchParams.set('place', id)
  url.hash = ''
  history.replaceState(null, '', url.pathname + url.search)
}

// Strip ?place= (place detail closed, or the id didn't resolve to anything).
export function clearPlaceParam() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('place')) return
  url.searchParams.delete('place')
  url.hash = ''
  history.replaceState(null, '', url.pathname + url.search)
}

// Current URL as a shareable string — used once a place is already reflected
// in the address bar via setPlaceParam.
export function currentShareUrl() {
  return window.location.href.split('#')[0]
}
