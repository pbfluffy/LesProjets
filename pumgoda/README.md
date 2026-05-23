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

### Map view
- Full-height Leaflet map
- **Floating overlay filter** (`MapFilterBar`) — same filters as list view, floats over the map
- **Marker clustering** (`leaflet.markercluster`) — handles dense city blocks
- Custom marker icons coloured by tier; the `pet_hotel` icon placed to clear the locate button
- Tap a pin → place detail overlay

### Place detail
- Full policy block, contact, Google Maps link
- Pumba "was here" badge (with optional photo)
- Paw tier badge (1–4) + optional ♥ favourite
- **Community votes** via Firebase Realtime DB (`useVotes` + `VotesContext`)
- Save to your local "Trips" list

### Persistence
- Filter state persists to `localStorage` with **schema validation** — corrupted/old shapes are discarded rather than crashing the app
- Theme + language persist across sessions
- Trips and user-pet info persist locally

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
- Firebase Realtime DB (community votes only)
- CSS modules + a shared `theme.css`
- `localStorage` for filter state, trips, user-pet, theme, language

## Data source

Venues live in a published [Google Sheet](https://docs.google.com/spreadsheets/d/1Ckf0fZ0EM9xXYrJipTXCO-TfaL910QzIbl1C0y9V4n0/edit). The app fetches the published CSV URL (`SHEET_CSV_URL` in `src/config.js`) on first load, caches it 6h in `localStorage["pumgoda_places_v2"]`, and falls back to a bundled `src/data/places.fallback.json` when offline.

The sheet has 39 columns; 36 are consumed by the app. `tags` and `source` are unused by the app — feel free to repurpose or delete.

To add a place: open the sheet, add a row, save. The next app load (or 6h later, with a cached version) picks it up.

⚠️ Category filters normalize `type` to lowercase (`type.toLowerCase().replace(/[\s-]+/g, '_')`) because sheet values are capitalized. A misspelled `type` cell makes that category filter return nothing — that's a sheet fix, not a code fix.

## Storage keys

Centralized in the `LS_KEYS` object in `src/config.js`:

- `pumgoda_places_v2` — CSV cache (6h TTL)
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
  config.js                     # SHEET_CSV_URL, LS_KEYS, VOTES_DB_URL
  firebase.js                   # Firebase Realtime DB init (votes only)
  components/
    Header, Hero,
    FilterBar, MapFilterBar,
    PlaceCard, PawTierBadge, PumbaBadge, PolicyChips,
    PlaceDetail, MapView,
    BottomNav, EmptyState
  data/
    computeTier.js              # paw-tier rubric (single source of truth)
    fetchPlaces.js              # CSV → cache → fallback pipeline
    places.fallback.json
  hooks/
    useLocalStorage.js, useThemeLang.js,
    useFilters.js, useTrips.js, useUserPet.js, useVotes.js
  i18n/strings.js               # TH/EN
  styles/theme.css              # CSS vars matching portfolio palette
```

## Deploy

Pushes to `main` trigger the monorepo workflow at `.github/workflows/deploy.yml`.
GitHub Pages serializes deploys — space related commits ~60s apart.
