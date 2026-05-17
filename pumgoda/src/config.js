// Pumgoda config — single source of truth for environment-level constants.

// Published CSV URL of the Pumgoda Places Google Sheet.
// To rotate: File → Share → Publish to web → CSV → copy URL.
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtGZtLBfINyfeMVQ-SLThpyZ94bse7XmRs9aXIxgt05ujFIbyyJKcWraw-v04rlugl2pGaUUl6ABDH/pub?output=csv'

// Firebase Realtime Database base URL — community vote storage.
export const VOTES_DB_URL =
  'https://pumgoda-default-rtdb.asia-southeast1.firebasedatabase.app'

// How long to trust the localStorage cache before re-fetching the sheet.
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

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
