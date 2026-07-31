# Protein Bar Deals · Korea Convenience Stores

Placeholder tracker for protein bar promotions at South Korean convenience stores (CU, GS25, 7-Eleven, emart24, ministop). Not linked from the main landing page — reachable directly at its own URL.

Live: https://pumbafluffycorgi.com/kr-protein-bars/

## Status

All data in `src/data/promos.js` is **sample placeholder content**, not real promos. Edit that file with actual entries you find in-store — see the shape comments at the top of the file.

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
