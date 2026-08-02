# Dog near me — Architecture & Tech Stack

A community stray-dog identification app. Users photograph a stray dog and
its location; the app helps determine whether it's a dog someone already
reported, or a new one, so sightings accumulate into a shared history per
dog rather than duplicate one-off reports.

## Tech Stack

**Frontend**
- React 18
- Vite 5 (build tooling)
- `vite-plugin-pwa` (built on Workbox) — installable, offline-capable
  Progressive Web App
- Leaflet + `leaflet.markercluster` for the map view
- CARTO's free tile layer for map imagery
- OpenStreetMap's Nominatim API for reverse geocoding (coordinates →
  place name), called directly from the client — free, no API key
- A small custom i18n context (English / Thai toggle)

**Auth & Data**
- Firebase Authentication (Google sign-in)
- Cloud Firestore — NoSQL document database, read live via real-time
  listeners so the map and match candidates update without a manual
  refresh

**Backend / API**
- Cloudflare Workers — serverless edge functions acting as the backend
  API: verify auth tokens, enforce per-user rate limits, and proxy
  calls to external AI providers so no API keys are ever exposed to
  the client
- Cloudflare R2 — S3-compatible object storage for uploaded photos
- Cloudflare KV — key-value store for lightweight per-user rate-limit
  counters

**AI / ML**
- **Google Gemini** (Gemini Flash-Lite tier, vision-language model),
  used two ways:
  - Generating a structured description of a reported dog (coat color,
    pattern, size, ear/tail type, etc.)
  - Direct visual comparison — shown the new photo plus each nearby
    candidate's photo in a single request, judging same-dog-or-not with
    a confidence level, rather than comparing independently-generated
    text descriptions
- **Amazon Bedrock** — Titan Multimodal Embeddings G1, used to generate
  a numeric vector per photo; cosine similarity between vectors
  produces a supplementary "% similar" score shown alongside the
  Gemini verdict

**Hosting / CI-CD**
- GitHub Pages — static hosting for the built frontend
- GitHub Actions — builds the app and deploys it automatically on
  every push to the main branch
- The Cloudflare Worker deploys independently via Wrangler (Cloudflare's
  CLI)
- All provider API keys (Google, AWS) are stored as platform-managed
  secrets — Cloudflare Worker secrets and AWS IAM-scoped credentials —
  never committed to source control

## Workflow

### Reporting a sighting

1. User takes/picks a photo. The app reads GPS from the photo's EXIF
   data if present, otherwise falls back to requesting the device's
   current location.
2. The photo is uploaded to the backend Worker, which:
   - Verifies the caller's identity token
   - Applies a daily per-user upload cap
   - Stores the photo in object storage
   - Requests a structured tag description from Gemini and a photo
     embedding vector from Bedrock, in parallel
   - Returns the photo's public URL, tags, and embedding to the client
3. Previously-reported dogs within a set radius of the new sighting are
   shortlisted by distance.
4. The new photo is compared directly against each nearby candidate's
   photo via a Gemini compare call, producing a same-dog verdict and
   confidence per candidate.
5. The embedding's cosine similarity to each candidate's stored
   embedding is computed client-side and shown as a supplementary
   percentage — folded into the same badge as the AI verdict when both
   are available, or shown on its own otherwise.
6. If the AI compare call fails entirely (network/provider error), the
   candidate list falls back to a simple ranking: distance, then
   overlap between the new report's tags and each candidate's
   most-recent tags.
7. The user confirms whether it's one of the listed dogs or a new one.
   A human always makes the final call — there is no automatic
   merging or matching.
8. The dog's coordinates are reverse-geocoded (OpenStreetMap's free
   Nominatim API, client-side, no key) into a short place name — this
   is best-effort and never blocks the save; a failed lookup just
   leaves the location name blank.
9. The confirmed sighting is written to the database, both as its own
   record and as an update to the parent dog's denormalized "latest"
   summary fields (used for map display and future matching without
   needing to read every historical sighting).

### Data model (conceptual)

- **Dogs** — one record per identified dog: name, last-known location
  and time (raw lat/lng plus a reverse-geocoded place name), and
  denormalized "latest" photo/tags/embedding for fast display and
  matching.
- **Sightings** — a per-dog history of individual reports: photo, tags,
  embedding, lat/lng, a reverse-geocoded place name, reporter,
  timestamp, an optional note, and a crowd-sourced temperament rating
  (friendly / neutral / cautious).
- **Flags** — a per-dog moderation queue for community-reported issues
  (e.g. incorrect info), visible only to designated moderator accounts.

### Matching strategy, in priority order

1. **Direct AI visual comparison (Gemini)** — the primary signal; the
   model reasons over the actual photos side by side.
2. **Embedding similarity percentage (Bedrock)** — a supplementary,
   display-only number; never changes candidate ranking on its own.
3. **Text-tag overlap** — a deterministic fallback used only when the
   Gemini comparison call fails outright.

At every step, a human reviews the candidates and makes the final
decision — nothing merges or auto-matches without explicit confirmation.

### Moderation

Community members can flag a dog's entry for review. Designated
moderator accounts can dismiss flags, delete entries, merge duplicate
dog records into one, or split a sighting off into its own new dog
record if it was attached to the wrong one.

### Offline / update behavior

As an installable PWA, the app precaches its assets for offline use.
Rather than silently auto-updating (which could interrupt an
in-progress report), it polls for new deployments in the background and
shows a "new version available" prompt, letting the user choose when to
reload.
