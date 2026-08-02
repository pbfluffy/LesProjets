# Protein Bar Deals · Korea Convenience Stores

Tracker for protein bar promotions at South Korean convenience stores (CU, GS25, 7-Eleven, emart24). Not linked from the main landing page — reachable directly at its own URL.

Live: https://pumbafluffycorgi.com/kr-protein-bars/

## Status

Data in `src/data/promos.js` is real (researched/verified July 31 – Aug 1, 2026), not placeholder — with two confidence levels per entry, via the `confirmed` flag:

- `confirmed: true` — checked directly against the store's own site. CU and GS25 don't publish explicit promo end dates on their own listings, so those show "Ongoing" rather than a countdown; emart24 does publish explicit date ranges, used as-is.
- `confirmed: false` — real (not fabricated), but not re-verifiable as *currently* active against an official source. Shown as "Not confirmed active this month."

CU and GS25 were checked exhaustively (CU: all ~720 items across its 1+1/2+1 tabs; GS25: its own product-search box for both "단백질" and "프로틴", all result pages) — anything that didn't turn up in that direct check and had no other corroboration was left out rather than kept as an unverified guess. That's also why some products (e.g. the Dongsuh Post protein bar) appear as separate entries for CU, GS25, *and* emart24 — same product, same price, genuinely available at all three.

**7-Eleven's own site (7-eleven.co.kr) blocks automated access entirely** — browser navigation and direct fetch were both refused, across the main domain, mobile subdomain, a direct subpage, and a Wayback Machine snapshot route — so nothing there can be verified as `confirmed: true` from this environment. Its one entry (the Dr.You PRO 24g bar) is `confirmed: false` for that reason, sourced from a direct in-store sighting rather than a third-party tracker.

The Dr.You PRO 24g-protein bar is a case worth noting: it doesn't turn up in CU or GS25's own catalog search either, yet it's real and was seen in stock (on a 1+1 promo) at CU, GS25, and 7-Eleven in July 2026. A direct first-hand sighting outweighs an incomplete website catalog, so it's listed (as `confirmed: false`, with `priceKrw: null` since no one recalled the exact shelf price) rather than excluded.

ministop was dropped from the store list — not enough real presence/coverage to be worth tracking here, based on both research and in-store experience. `proteinG` is `null` on several entries where only calorie data (or no data at all) was findable, not an exact protein-gram figure; the app handles that gracefully (skips it from the value-sort ranking rather than guessing).

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
