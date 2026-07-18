// Deep-linkable single-dog sharing. Mirrors pumgoda's sharePlace.js — the
// currently open DogDetail is mirrored into ?dog=<id> so the Share button
// (and a plain copy-paste of the address bar) produces a link that reopens
// that exact dog, instead of always collapsing to the bare map URL.

// Read ?dog= from the current URL. Firestore auto-ids are alphanumeric;
// an unmatched id is just ignored by the caller once dogs have loaded.
export function readDogId() {
  const id = new URL(window.location.href).searchParams.get('dog')
  return id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null
}

// Write ?dog=<id> into the URL without a reload or new history entry.
export function setDogParam(id) {
  const url = new URL(window.location.href)
  url.searchParams.set('dog', id)
  url.hash = ''
  history.replaceState(null, '', url.pathname + url.search)
}

// Strip ?dog= (detail closed, or the id didn't resolve to anything).
export function clearDogParam() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('dog')) return
  url.searchParams.delete('dog')
  url.hash = ''
  history.replaceState(null, '', url.pathname + url.search)
}

// Current URL as a shareable string — used once a dog is already reflected
// in the address bar via setDogParam.
export function currentShareUrl() {
  return window.location.href.split('#')[0]
}
