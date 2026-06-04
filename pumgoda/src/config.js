// Pumgoda config — single source of truth for environment-level constants.

// Published CSV URL of the Pumgoda Places Google Sheet.
// To rotate: File → Share → Publish to web → CSV → copy URL.
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtGZtLBfINyfeMVQ-SLThpyZ94bse7XmRs9aXIxgt05ujFIbyyJKcWraw-v04rlugl2pGaUUl6ABDH/pub?output=csv'

// Catalog data source: 'sheet' (legacy published CSV) | 'firestore' (primary after the
// #100 migration cutover). Stays 'sheet' until the places collection is imported and
// verified -- flipping this one value is the cutover (and the one-line rollback).
export const PLACES_SOURCE = 'firestore'

// Firestore collection holding the venue catalog (read by fetchFromFirestore).
export const PLACES_COLLECTION = 'places'

// Firebase Realtime Database base URL — community vote storage.
export const VOTES_DB_URL =
  'https://pumgoda-default-rtdb.asia-southeast1.firebasedatabase.app'

// How long to trust the localStorage cache before re-fetching the sheet.
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
