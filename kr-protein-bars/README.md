# Protein Bar Deals · Korea Convenience Stores

Tracker for protein bar promotions at South Korean convenience stores (CU, GS25, 7-Eleven, emart24, ministop). Not linked from the main landing page — reachable directly at its own URL.

Live: https://pumbafluffycorgi.com/kr-protein-bars/

## Status

Data in `src/data/promos.js` is real (researched July 31, 2026), not placeholder — but with two confidence levels per entry, via the `confirmed` flag:

- `confirmed: true` — pulled straight from a store's own official event page with explicit promo dates.
- `confirmed: false` — a real product with a real historical price/promo from a third-party price-tracking site, but not confirmed as *currently* running. The app labels these "Not confirmed active this month" and links to the source.

No ministop entry yet — nothing turned up in that research pass. `proteinG` is `null` on a couple of entries where only calorie data was findable, not an exact protein-gram figure; the app handles that gracefully (skips it from the value-sort ranking rather than guessing).

Re-research and refresh this file periodically — promos rotate monthly and the `confirmed: true` entries especially will go stale.

## Stack

React 18 + Vite, `vite-plugin-pwa` for install support — same as every other app on this site. No backend, no auth: it's a static build over a local data file.

## Local development

```bash
cd kr-protein-bars
npm install
npm run dev
```

## Deploy

Built and copied to `_site/kr-protein-bars/` by the root `.github/workflows/deploy.yml` on every push to `main` — no separate setup needed.
