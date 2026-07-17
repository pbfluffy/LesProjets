# MaJon (มาจร)

Community stray-dog ID map for Thailand. Spot a soi dog, snap a photo — MaJon
checks nearby previously-reported dogs (by location + AI-described features)
so you can confirm "yes, that's [name]" or add a new dog to the map. Part of
[pbfluffy/LesProjets](https://github.com/pbfluffy/LesProjets), live at
[pumbafluffycorgi.com/majon/](https://pumbafluffycorgi.com/majon/).

## How it works

1. **Report** — take/choose a photo of a dog. MaJon gets your GPS location,
   uploads the photo to the `majon-photo` Worker, which stores it in R2 and
   asks Gemini to describe the dog (color, size, ear/tail type, marks).
2. **Match** — dogs previously reported within ~500m are shown as candidates,
   ranked by how many described features overlap. Pick "same dog" to add a
   sighting, or "none of these" to register a new dog (and name it).
3. **Map** — every reported dog shows up as a pin; tap one to see its photo
   history, sighting timeline, and who reported it.

There's no ML re-identification model here — matching is location + simple
tag-overlap scoring, with a human confirming the final match. See the repo's
plan file for the reasoning behind that scope.

## Stack

- React 18, Vite 5, vite-plugin-pwa
- Leaflet + `leaflet.markercluster` (forked from `pumgoda`'s `MapView`), free CARTO tiles
- Firebase Auth (Google sign-in) + Firestore — same `pumgoda` Firebase project as the other apps, new `strayDogs` collection
- `worker/` — a standalone Cloudflare Worker (R2 + KV bindings) that verifies the caller's Firebase ID token, stores the photo in R2, and proxies a Gemini vision call for descriptive tags

## Local development

```bash
cd majon
npm install
cp .env.example .env.local   # set VITE_MAJON_WORKER_URL to your local worker
npm run dev
```

```bash
cd majon/worker
npm install
cp .dev.vars.example .dev.vars   # set your own GOOGLE_API_KEY
npm run dev
```

## One-time setup (do these before the report flow will work)

1. **Create the R2 bucket**: `cd majon/worker && npx wrangler r2 bucket create majon-photos`.
   Enable public access on it (dashboard → bucket → Settings → Public access),
   then copy the `pub-....r2.dev` URL into `PUBLIC_BASE` in `worker/src/index.js`.
2. **Create the KV namespace**: `npx wrangler kv namespace create MAJON_RATE_LIMITER`,
   then paste the returned `id` into `worker/wrangler.toml`.
3. **Set the Gemini key**: `npx wrangler secret put GOOGLE_API_KEY` (same key used by the other photo workers).
4. **Bind BUCKET in the wrangler.toml** — already declared; just make sure the bucket name matches.
5. **Firestore rules** (this repo has no Firestore IaC — paste into the Firebase console → Firestore → Rules):
   ```
   match /strayDogs/{dogId} {
     allow read: if true;
     allow create: if request.auth != null;
     allow update: if request.auth != null;
     allow delete: if request.auth != null;
     match /sightings/{sightingId} {
       allow read: if true;
       allow create: if request.auth != null;
       allow delete: if request.auth != null && request.auth.uid == resource.data.reportedBy;
     }
   }
   ```
   (Updated to add `delete` rules — re-paste this into the Firebase console if you set the rules up before the delete-your-own-report feature shipped.)
6. **Deploy the worker**: `cd majon/worker && npm run deploy`, then set
   `VITE_MAJON_WORKER_URL` (as a GitHub Actions secret, for the deploy
   workflow) to the deployed Worker URL.

## What's out of scope for v1

- No ML embedding/re-identification — tag-overlap + location is the whole matching story
- No name-change voting/moderation — name is a plain editable field for any signed-in user
- No NGO/government dashboard or data export (the eventual monetization layer)
