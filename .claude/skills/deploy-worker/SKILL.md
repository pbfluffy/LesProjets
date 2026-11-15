---
name: deploy-worker
description: Deploy or update a Cloudflare Worker used by an app in this repo (bill-splitter, dog-near-me, stock-ranges, village-77, studio, workers/*). Use when Worker code or secrets change.
---

Workers are **not** deployed by the Pages workflow, and a deploy changes live behaviour — do it only when the user
asked or approved it.

| Worker | Folder | Name |
|---|---|---|
| Bill splitter og-meta | `bill-splitter/worker` | `bill-splitter-og-meta` |
| Dog near me | `dog-near-me/worker` | `majon-photo` |
| Stock ranges quotes/alerts/cron | `stock-ranges/worker` | `stock-ranges-quotes` |
| Village 77 | `village-77/worker` (no package.json) | `village-77` |
| Pumgoda places lookup | `workers/pumgoda-places-lookup` | `pumgoda-places-lookup` |
| Single-file legacy Workers | `workers/*.js`, `studio/worklog-worker.js` | paste/deploy per its header comments |

1. `cd` into the folder; `npm install` if it has a `package.json`.
2. Local test: `npm run dev` (or `npx wrangler dev`). Stock-ranges also has `npm run check-alerts`.
3. Deploy: `npm run deploy` or `npx wrangler deploy`. Zone routes (e.g. `pumbafluffycorgi.com/<app>/*`) and
   cron triggers come from `wrangler.toml`.
4. Secrets: `npx wrangler secret put NAME` (prompts for the value). **Never** put secret values in `wrangler.toml`,
   code, docs or commits; `[vars]` is for public values only. Don't paste secret values into chat either — have the
   user enter them at the prompt.
5. After deploy, hit one route to confirm it responds, and remember frontend `VITE_*_WORKER_URL` values are
   GitHub Actions secrets, changed in the repo settings (ask the user).
