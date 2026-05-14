# Pumgoda v2 — Map view integration

Drop-in `MapView` component for the Map tab. Self-contained: plain Leaflet, no react-leaflet.

## Files added

- `pumgoda/src/components/MapView.jsx`
- `pumgoda/src/components/MapView.module.css`

## Changes needed

### 1. Add Leaflet to `pumgoda/package.json`

In `dependencies`:

```json
"leaflet": "^1.9.4"
```

Then:

```bash
cd pumgoda && npm install
```

### 2. Wire into `pumgoda/src/App.jsx`

Replace the existing Map tab placeholder. The exact shape depends on how the
tab routing is structured, but the pattern is:

```jsx
import MapView from './components/MapView'

// inside the component, where the tabs render:
{activeTab === 'map' && (
  <MapView
    places={filteredPlaces}
    onPlaceClick={(place) => setSelectedPlace(place)}
    theme={theme}
    lang={lang}
  />
)}
```

`filteredPlaces` should be the same array the List view consumes — the map
should reflect the same region/venue/policy filters with no extra logic.

`setSelectedPlace` is presumably what PlaceCard already calls to open the
detail overlay. Reuse it.

### 3. Verify the data shape

`MapView` expects each place to have:

| Field            | Type    | Required | Notes                                            |
|------------------|---------|----------|--------------------------------------------------|
| `lat`            | number  | yes      | Skipped silently if missing                      |
| `lng`            | number  | yes      | Skipped silently if missing                      |
| `tier`           | 1–4     | no       | Defaults to 1 if missing                         |
| `pumbaWasHere`   | boolean | no       | Adds the verified ring                           |
| `name`           | `{th, en}` or string | no | Used as marker hover tooltip            |
| `id`             | string  | yes      | For React keys (read elsewhere in the app)       |

If the existing place objects use different field names (e.g. `name_th`/`name_en`
instead of `name.th`/`name.en`, or `tier` is computed on demand rather than
stored on the object), there are two lines in `MapView.jsx` to adjust:

- Line in `buildMarkerHtml`: `const tier = Math.max(1, Math.min(4, place.tier || 1))`
- Line in markers render: `title: place.name?.[lang] || place.name?.en || place.id`

## What this gives you

- Pins for every filtered place that has coords
- Pins are warm-orange paw badges, darker for higher tiers
- "Pumba was here" venues get an accent ring around the badge
- Click a pin → calls `onPlaceClick(place)` (open PlaceDetail)
- Auto-fits bounds when the filtered set changes
- Light/dark tile layer swap when `theme` prop changes (CARTO Voyager / DarkMatter)
- Bilingual "skipped places" note when sheet rows lack coords

## What this deliberately doesn't do (yet)

- **Marker clustering.** Adding `leaflet.markercluster` is ~20KB more. Defer
  until the sheet has 50+ places and pins start visually overlapping.
- **User-location "Nearest" button.** Geolocation + a recenter button is the
  next v2 unit — separate task.
- **Trip-builder integration.** When trips ship, the map can render a polyline
  through trip stops. Wire it in then.

## Sheet schema reminder

If the sheet doesn't already have `lat`/`lng` columns, add them. Easiest way:
right-click a place on Google Maps → coords go to clipboard → paste into
the sheet. Places without coords stay visible in List view, just not on the map.
