// Deep-linkable single-dog sharing. Mirrors pumgoda's sharePlace.js — the
// currently open DogDetail is mirrored into ?dog=<id> so the address bar
// (and a plain copy-paste of it) produces a link that reopens that exact
// dog, instead of always collapsing to the bare map URL.

import { WORKER_URL } from './photoUpload'

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

// URL the Share button actually shares. Points at the worker's /card route,
// NOT straight at the app: dog-near-me is a client-rendered SPA on static
// hosting, so a chat app's link-preview crawler would never see the real
// photo/location if we shared the app URL directly — crawlers don't run JS,
// they only read the static index.html's og:* tags, which are identical for
// every dog. /card returns a tiny server-rendered page with THAT dog's real
// og:image/description, then bounces a real visitor into the app.
export function shareCardUrl(dogId) {
  const url = new URL('card', WORKER_URL)
  url.searchParams.set('dog', dogId)
  return url.toString()
}
