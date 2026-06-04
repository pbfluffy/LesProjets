# Pumgoda

Pet-friendly places in Thailand. Find cafés, restaurants, hotels, parks, vets, and pet shops — with a paw-tier ladder that tells you exactly how dog-friendly each venue actually is. Part of [pbfluffy/LesProjets](https://github.com/pbfluffy/LesProjets), live at [pumbafluffycorgi.com/pumgoda/](https://pumbafluffycorgi.com/pumgoda/).

## What's in the app

### List view
- Region selector (all / Bangkok metro / weekend escape)
- Venue type chips (cafe, restaurant, hotel, park, mall, beach, vet, pet shop, grooming)
- Policy chips (`no_stroller_needed`, `indoor_allowed`, `no_size_limit`, `pet_menu`, `off_leash_zone`, `no_fee`)
- **Free-text search** across name, area, notes
- **`minPaws` tier filter** — show only venues at or above a given tier
- "Pumba was here" filter (`pumba_verified` venues)
- Cover thumbnail from the venue's first photo, when present

### Map view
- Full-height Leaflet map
- **Floating overlay filter** (`MapFilterBar`) — same filters as list view, floats over the map
- **Marker clustering** (`leaflet.markercluster`) — handles dense city blocks
- Custom marker icons coloured by tier; the `pet_hotel` icon placed to clear the locate button
- **Live location** — locate, then a `watchPosition` follow mode (tap again to stop)
- Tap a pin → place detail overlay

### Place detail
- Full policy block, contact, Google Maps link
- **Photo gallery** (`PhotoStrip`) with lightbox, reading the place's `photos[]`
- Pumba "was here" badge (with optional photo)
- Paw tier badge (1–4) + optional ♥ favourite
- **Community votes** — Firestore-backed and sign-in-gated (`useVotesFs`); one vote per user/place, enforced by a composite-key rule
- Save to your local "Trips" list

### Persistence
- Filter state persists to `localStorage` with **schema validation** — corrupted/old shapes are discarded rather than crashing the app
- Theme + language persist across sessions
- When signed in, saved places sync to Firestore (`userPlaces`) and trips to `userTrips`; collaborative trips live in `sharedTrips`
- User-pet info persists locally

## Paw-tier system

4-rung access ladder plus a decoupled ♥ heart. The full reference lives in the
project handoff. Quick version:

| Paws | Label | Rule (first match wins) |
|------|-------|-------------------------|
| 🐾 | Stroller required | `stroller_required = TRUE` |
| 🐾🐾 | Outdoor only | not stroller, `indoor_allowed = FALSE` |
| 🐾🐾🐾 | Indoor welcome | not stroller, indoor OK, `pet_menu = FALSE` |
| 🐾🐾🐾🐾 | Indoor + pet menu | not stroller, indoor OK, `pet_menu = TRUE` |

Logic lives in `src/data/computeTier.js` — plain `if` ladder, no rubric/weights.

## Stack

- React 18, Vite 5
- Leaflet 1.9 + `leaflet.markercluster`
- Firebase **Firestore** (venue catalog, per-user sync, community votes) + Auth; legacy Realtime DB retained only for old vote data
- Cloudflare **R2** + a `pumgoda-photo` Worker (place photos)
- CSS modules + a shared `theme.css`
- `localStorage` for filter state, trips, user-pet, theme, language

## Data source

Venues live in **Firestore** at `places/{placeId}`. Each doc stores the already-normalized place object the app consumes directly (no client-side transform on the read path). The catalog is cached 6h in `localStorage["pumgoda_places_v2"]`, and a bundled `src/data/places.fallback.json` backs the app when offline. The active source is selected by `PLACES_SOURCE` in `src/config.js` (`'firestore'` in production).

Editing happens in the admin editor (`admindepum.html`): search the catalog, add / edit / delete places, and upload photos. Uploaded photos go to Cloudflare R2 via the `pumgoda-photo` Worker, and their URLs are pushed into the place's `photos[]`. Catalog writes are gated to the admin uid by the `places` Firestore rule (public read, admin write).

> **Legacy fallback (bake-in):** the original published [Google Sheet](https://docs.google.com/spreadsheets/d/1Ckf0fZ0EM9xXYrJipTXCO-TfaL910QzIbl1C0y9V4n0/edit) (`SHEET_CSV_URL`) stays wired as a tertiary fallback while Firestore proves stable, and will be removed in a later cleanup. While it's live: a row's `type` is normalized to lowercase (`type.toLowerCase().replace(/[\s-]+/g, '_')`), so capitalization is fine but a misspelled `type` makes that category filter return nothing — that's a data fix, not a code fix.

## Storage keys

Centralized in the `LS_KEYS` object in `src/config.js`:

- `pumgoda_places_v2` — catalog cache (6h TTL)
- `pumgoda_filters` — filter state (with schema validation)
- `pumgoda_trips` — saved venue lists
- `pumgoda_user_pet` — user's pet profile
- `pumgoda_theme` — local theme override (the shared `theme` key on the origin still applies)
- `pumgoda_lang` — `"en"` | `"th"`

## Dev

```bash
cd pumgoda
npm install
npm run dev       # http://localhost:5173/LesProjets/pumgoda/
npm run build
npm run preview
```

To build for the root of a custom domain instead of the GitHub Pages sub-path:

```bash
VITE_BASE=/ npm run build
```

## Structure

```
src/
  main.jsx, App.jsx, App.css
  config.js                     # PLACES_SOURCE, SHEET_CSV_URL, LS_KEYS, VOTES_DB_URL
  firebase.js                   # Firebase init — Firestore (catalog/sync/votes) + Auth + RTDB (legacy)
  components/
    Header, Hero,
    FilterBar, MapFilterBar,
    PlaceCard, PawTierBadge, PumbaBadge, PolicyChips,
    PhotoStrip, PlaceDetail, MapView, TripBuilder,
    BottomNav, EmptyState
  data/
    computeTier.js              # paw-tier rubric (single source of truth)
    fetchPlaces.js              # Firestore / Sheet → cache → fallback pipeline
    places.fallback.json
  hooks/
    useLocalStorage.js, useThemeLang.js,
    useFilters.js, useTrips.js, useUserPet.js,
    useVotesFs.js, useCloudSync.js, useSharedTrip.js
  i18n/strings.js               # TH/EN
  styles/theme.css              # CSS vars matching portfolio palette
```

## Deploy

Pushes to `main` trigger the monorepo workflow at `.github/workflows/deploy.yml`.
GitHub Pages serializes deploys — space related commits ~60s apart.
