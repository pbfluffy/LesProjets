// Pumgoda config — single source of truth for environment-level constants.

// Firestore collection holding the venue catalog (read by fetchFromFirestore).
export const PLACES_COLLECTION = 'places'

// Firebase Realtime Database base URL — community vote storage.
export const VOTES_DB_URL =
  'https://pumgoda-default-rtdb.asia-southeast1.firebasedatabase.app'

// How long to trust the localStorage cache before re-fetching the catalog.
export const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// Google Form URL for community place submissions — leave empty to hide the
// "+" button in the header. Set this once you've created the Form and copy
// the live URL here (File → Share → publish URL of the form, not the editor).
export const SUGGEST_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSd0tng6ie4WK7OtOj9x3C0aCD2agjHT3p0-MVgArjRrHOOZkA/viewform'

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
