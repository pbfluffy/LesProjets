// Pumgoda config — single source of truth for environment-level constants.

// Firestore collection holding the venue catalog (read by fetchFromFirestore).
export const PLACES_COLLECTION = 'places'

// Firebase Realtime Database base URL — community vote storage.
export const VOTES_DB_URL =
  'https://pumgoda-default-rtdb.asia-southeast1.firebasedatabase.app'

// How long to trust the localStorage cache before re-fetching the catalog.
export const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// Admin photo-upload Worker — POST /suggest (signed-in, non-admin) is used by
// the public suggest-a-place form; admindepum.html uses the admin-gated root route.
export const PHOTO_WORKER_URL = 'https://pumgoda-photo.pbfluffygaming.workers.dev'

// Storage keys
export const LS_KEYS = {
  PLACES: 'pumgoda_places_v2',
  THEME: 'theme',
  LANG: 'pumgoda_lang',
  SAVED: 'pumgoda_saved_v1',
  VISITED: 'pumgoda_visited_v1',
  TRIPS: 'pumgoda_trips_v1',
  VOTES: 'pumgoda_votes_v1',
}
