# Pumgoda

Pet-friendly places in Thailand. Part of [pbfluffy/LesProjets](https://github.com/pbfluffy/LesProjets), deployed at `pumbafluffycorgi.com/pumgoda/`.

## Local dev

```bash
cd pumgoda
npm install
npm run dev   # http://localhost:5173
```

Hot-reloads on save. Data is fetched from the published Google Sheet on first load, then cached in `localStorage` for 6 hours.

## Build

```bash
npm run build   # outputs to ./dist
```

The repo's GitHub Actions workflow (`.github/workflows/deploy.yml`) needs a new step for this project — see **Deploy integration** below.

## Data source

The list of places lives in the [Pumgoda Places sheet](https://docs.google.com/spreadsheets/d/1Ckf0fZ0EM9xXYrJipTXCO-TfaL910QzIbl1C0y9V4n0/edit). The app fetches the published CSV URL (stored in `src/config.js`) at runtime.

To add a place: open the sheet, add a row, save. Next app load picks it up (or 6h later if you have a cache).

To rotate the CSV URL: edit `SHEET_CSV_URL` in `src/config.js`.

## Tuning the paw rubric

Weights and thresholds live entirely in `src/data/computeTier.js`. To shift the Pet paradise cutoff from 11 → 10 (so a hotel with overnight + pool + pet beds counts as paradise), edit the first row of `TIERS`:

```js
{ min: 10, paws: 4, key: 'paradise', ... }
```

## Deploy integration

Two changes needed in the repo-root `.github/workflows/deploy.yml`:

**1) Add a build step** (after the `Build nutritions-thailand` step):

```yaml
      - name: Build pumgoda
        working-directory: pumgoda
        run: |
          npm install
          npm run build
```

**2) Add to the Assemble site step**:

```yaml
          mkdir -p _site/bill-splitter _site/nutritions-thailand _site/pumgoda
          ...
          cp -r pumgoda/dist/. _site/pumgoda/
```

That's it — push to `main` and GitHub Actions handles the rest.

## Adding the card to the portfolio index

Drop this into the portfolio `index.html` after the existing two app cards:

```html
<a class="card" href="./pumgoda/">
  <div class="card-header">
    <div class="icon">🐾</div>
    <div>
      <div class="card-name" id="app3-name">Pumgoda</div>
      <div class="card-type">React App</div>
    </div>
    <span class="arrow">→</span>
  </div>
  <p class="card-desc" id="app3-desc">
    ค้นหาคาเฟ่ ร้านอาหาร โรงแรม สวนสาธารณะที่พาน้องไปได้ในกรุงเทพและต่างจังหวัด
    มีระบบจัดระดับเป็นอุ้งเท้า 1–4 และตรา "🐾 Pumba was here"
  </p>
</a>
```

And in the script block, extend `S.th` and `S.en`:

```js
// S.th
n3: 'Pumgoda',
d3: 'ค้นหาคาเฟ่ ร้านอาหาร โรงแรม สวนสาธารณะที่พาน้องไปได้ในกรุงเทพและต่างจังหวัด มีระบบจัดระดับเป็นอุ้งเท้า 1–4 และตรา "Pumba was here"',

// S.en
n3: 'Pumgoda',
d3: 'Find cafés, restaurants, hotels, and parks in Bangkok and nearby provinces that welcome pets. 1–4 paw tier system plus the "Pumba was here" verification stamp.',
```

The existing Excel-tutorial `app3-name` and `d3` should renumber to `app4-name` and `d4`.

## Structure

```
pumgoda/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── config.js               ← SHEET_CSV_URL + storage keys
    ├── components/
    │   ├── Header.{jsx,css}
    │   ├── Hero.{jsx,css}
    │   ├── FilterBar.{jsx,css}
    │   ├── PlaceCard.{jsx,css}
    │   ├── PawTierBadge.{jsx,css}
    │   ├── PumbaBadge.{jsx,css}
    │   ├── PolicyChips.jsx
    │   ├── PlaceDetail.{jsx,css}
    │   ├── BottomNav.{jsx,css}
    │   └── EmptyState.{jsx,css}
    ├── data/
    │   ├── computeTier.js      ← rubric (single source of truth)
    │   ├── fetchPlaces.js      ← CSV → cache → fallback pipeline
    │   └── places.fallback.json
    ├── hooks/
    │   ├── useLocalStorage.js
    │   ├── useThemeLang.js     ← dark mode + TH/EN
    │   └── useFilters.js
    ├── i18n/
    │   └── strings.js          ← TH/EN
    └── styles/
        └── theme.css           ← CSS vars matching the portfolio palette
```

## v1 scope shipped

- List view with region selector + venue-type chips + policy chips
- Place detail screen with full policy block, contact, Google Maps link
- Pumba "was here" badge with optional photo
- Paw tier badge (1–4) computed from the rubric
- TH/EN toggle, dark mode, mobile-first
- Saved places in `localStorage`
- Offline-resilient: caches CSV in `localStorage`, ships bundled fallback JSON
- Bottom-tab nav with `Map` and `Trips` placeholders ("coming soon — v2")

## v2 roadmap

- Map view with Leaflet + OpenStreetMap tiles
- Trip builder (chain 3-5 places, share to Line)
- Geolocation-based "Nearest" sort
- Community voting via Google Apps Script endpoint (👍 / 🐾 / ⚠️)

## v3+ ideas

- Emergency vet locator (separate UX from main app)
- User-submitted places via a Google Form → review queue → sheet append
- Other users earning their own pet's verification stamps
