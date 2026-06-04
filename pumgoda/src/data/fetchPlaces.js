// fetchPlaces — venue catalog from Firestore → place objects with
// localStorage caching.
//
// Flow:
//   1. localStorage cache hit & fresh? → return cached
//   2. Firestore getDocs on the places collection (docs stored already-normalized,
//      see scripts/import-places.mjs — no client-side transform on the read path)
//   3. Cache → return
//   4. Failure → stale cache if any; else the bundled fallback JSON

import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js'
import { CACHE_TTL_MS, LS_KEYS, PLACES_COLLECTION } from '../config'
import { firestore } from '../firebase'
import fallbackPlaces from './places.fallback.json'

function readCache({ allowStale = false } = {}) {
  try {
    const raw = localStorage.getItem(LS_KEYS.PLACES)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    const stale = Date.now() - ts > CACHE_TTL_MS
    if (stale && !allowStale) return null
    return { data, stale }
  } catch {
    return null
  }
}

function writeCache(places) {
  try {
    localStorage.setItem(
      LS_KEYS.PLACES,
      JSON.stringify({ ts: Date.now(), data: places })
    )
  } catch {
    // Cache failures are non-fatal; localStorage may be full or disabled
  }
}

// Firestore path — read the places collection. Docs are stored already-normalized
// (see scripts/import-places.mjs), so no normalize() pass is needed here.
async function fetchFromFirestore() {
  const snap = await getDocs(collection(firestore, PLACES_COLLECTION))
  const places = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (!places.length) throw new Error('places collection empty')
  return places
}

export async function fetchPlaces({ force = false } = {}) {
  if (!force) {
    const cached = readCache()
    if (cached) {
      return { places: cached.data, source: 'cache' }
    }
  }

  try {
    const places = await fetchFromFirestore()
    writeCache(places)
    return { places, source: 'firestore' }
  } catch (err) {
    // Prefer a (possibly stale) cache over the bundled snapshot — closest to truth.
    const stale = readCache({ allowStale: true })
    if (stale) {
      console.warn('Pumgoda: Firestore read failed, serving stale cache.', err)
      return { places: stale.data, source: 'stale-cache' }
    }

    // Last resort — bundled JSON shipped in the build.
    console.warn('Pumgoda: Firestore read failed and no cache; using bundled JSON.', err)
    return { places: fallbackPlaces, source: 'fallback' }
  }
}
