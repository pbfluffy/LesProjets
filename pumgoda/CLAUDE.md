# pumgoda

Pet-friendly places in Thailand with a 1–4 paw tier ladder. Live: `/pumgoda/`. `README.md` has the full feature list.

## Layout

- `src/data/computeTier.js` — the paw-tier `if` ladder (first match wins; no weights). Change tier rules **here only**.
- `src/data/fetchPlaces.js` — reads the venue catalog from Firestore `places/{placeId}`, caches 30 min in
  `localStorage["pumgoda_places_v2"]`, falls back to `places.fallback.json` offline.
- `src/hooks/` — `useFilters` (persisted + schema-validated), `useVotesFs`/`VotesContext` (community votes),
  `useTrips`, `useSharedTrip`, `useCloudSync`, `useTripsCloudSync`, `useUserPet`.
- `src/config.js` — `LS_KEYS` (all localStorage keys) and other app config. Add new keys there.
- `src/sharePlace.js`, `shareTrip.js`, `liff.js` — sharing / LINE.
- Photos: Cloudflare R2 via `../workers/pumgoda-photo-worker.js`. `../workers/pumgoda-places-lookup/` is a Google
  Maps lookup Worker (`GOOGLE_MAPS_KEY` is a Worker secret).
- Catalog **editing happens in `../admindepum.html`**, not in this app.

## Data

- Firestore: `places` (public read, admin write), `placeVotes` (one vote per user/place via composite key),
  `placeSuggestions`, `userPlaces/{uid}`, `userTrips/{uid}`, `sharedTrips/{tripId}`, `userBackups`. Rules in root
  `firestore.rules`. A legacy Realtime DB is kept only for old votes.
- Persisted filter state is schema-validated — when changing filters, keep old stored shapes from crashing the app.

## Gotchas

- `vite.config.js` uses `base: './'` (relative), unlike the other apps, and has hand-tuned PWA/Workbox settings with
  comments explaining why — read them before touching the PWA config.
- Map tiles need `VITE_CARTO_KEY` at build time; the CARTO key's referer allow-list must include the bare
  `pumbafluffycorgi.com` (not only `www`/paths), or tiles go blank.
- Run the repo ESLint gate after edits (see root `CLAUDE.md`).
