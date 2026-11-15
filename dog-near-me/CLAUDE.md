# dog-near-me (package name `majon`)

Community stray-dog ID map for Thailand: photograph a soi dog, see whether someone already named it.
Live: `/dog-near-me/`. **`ARCHITECTURE.md` is the authoritative tech/workflow description — read it first.**

## Layout

- `src/hooks/useDogs.js` — live Firestore listeners for dogs/sightings. `src/searchDogs.js`, `haversine.js` — nearby candidates.
- `src/photoUpload.js` + `exifGps.js` — upload to the Worker; GPS from EXIF, else device location.
- `src/reverseGeocode.js` — Nominatim (client-side, free; be gentle with request volume).
- `src/admin.js` — admin helpers; `shareDog.js` / `shareLine.js` — sharing.
- `worker/` (`majon-photo`, route `pumbafluffycorgi.com/dog-near-me/*`): verifies Firebase ID token, per-user daily
  upload cap (KV `RATE_LIMITER`), stores photos in R2 (`majon-photos`), calls Gemini (tags + same-dog compare) and
  Bedrock Titan embeddings. **All provider keys are Worker secrets — never in the client or in git.**

## Build env (GitHub Actions secrets → `VITE_*`)

`VITE_MAJON_WORKER_URL`, `VITE_CARTO_KEY` (CARTO key's referer list must include bare `pumbafluffycorgi.com`).

## Gotchas

- The same-dog judgement is AI-assisted and shown with a confidence level; don't present it as certain.
- Worker changes are a manual `npx wrangler deploy` in `worker/`; frontend deploys with the Pages workflow.
- Run the repo ESLint gate after edits (see root `CLAUDE.md`).
