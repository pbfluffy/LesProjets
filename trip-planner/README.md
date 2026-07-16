# Trip Planner

Paste trip notes, drop in PDFs or screenshots, and get a structured day-by-day
itinerary back. Two parts:

- `src/` — the React/Vite site (this directory), deployed as part of the
  shared GitHub Pages build.
- `worker/` — a standalone Cloudflare Worker that calls the Anthropic API to
  turn the pasted input into structured JSON. Deployed separately with
  `wrangler deploy` from inside `worker/`.

## Local development

```
npm install
cp .env.example .env.local   # set VITE_TRIP_WORKER_URL to your local worker
npm run dev
```

```
cd worker
npm install
cp .dev.vars.example .dev.vars   # set your own ANTHROPIC_API_KEY
npm run dev
```

## Deploying the worker

```
cd worker
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key when prompted
npm run deploy
```

Then set `VITE_TRIP_WORKER_URL` (as a GitHub Actions secret, same pattern as
ProteinVault's `VITE_IMPORT_WORKER_URL` used) to the deployed Worker's URL.

## Design

Fixed template, not a per-trip generated design — the Claude call only
extracts structured data (days, food, notes, open questions); the same
polished page renders every trip. See `worker/src/index.js` for the
extraction schema and system prompt, and `src/styles.css` for the template.
