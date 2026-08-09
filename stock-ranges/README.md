# Stock Ranges (ช่วงราคาหุ้น)

A watchlist dashboard: add tickers, and for each one see where today's price
sits within a 10-band range spanning a chosen lookback window (3mo–5y).
Band 1 = at/near the period low, band 10 = at/near the period high, with a
simple buy/hold/sell label derived from the band. Part of
[pbfluffy/LesProjets](https://github.com/pbfluffy/LesProjets), live at
[pumbafluffycorgi.com/stock-ranges/](https://pumbafluffycorgi.com/stock-ranges/).

This is a plain position-in-range heuristic, not investment advice or a
valuation model — it says nothing about a company's fundamentals, only where
the current price sits relative to its own recent range. The app shows this
disclaimer permanently in the UI.

## How it works

1. **Watchlist** — add ticker symbols (e.g. `AAPL`), stored in `localStorage`.
   No accounts, no sync — this list is local to your browser.
2. **Lookback period** — pick 3 months to 5 years; the low/high band range
   recalculates for every ticker against that window's daily closes.
3. **Band + signal** — the window's `[low, high]` is split into 10 equal
   price bands; today's price falls into one, shown as a highlighted segment
   on a 10-segment gauge plus a Buy zone (bands 1–3) / Hold (4–7) / Sell zone
   (8–10) badge.

## Stack

- React 18, Vite 5, vite-plugin-pwa (same shell as `bill-splitter`)
- `worker/` — a small standalone Cloudflare Worker that proxies Yahoo
  Finance's chart API (which doesn't send CORS headers, so the browser can't
  call it directly) and adds a 5-minute edge cache. No auth, no bindings —
  it only ever forwards public market data.

## Local development

```bash
cd stock-ranges
npm install
cp .env.example .env.local   # set VITE_STOCK_WORKER_URL to your local worker
npm run dev
```

```bash
cd stock-ranges/worker
npm install
npm run dev   # wrangler dev, defaults to http://localhost:8787
```

## One-time setup (before deploying for real)

1. `cd stock-ranges/worker && npx wrangler deploy` — deploys to
   `stock-ranges-quotes.<your-subdomain>.workers.dev`. No R2/KV/secrets
   needed.
2. Set `VITE_STOCK_WORKER_URL` (as a GitHub Actions secret, same pattern as
   `VITE_TRIP_WORKER_URL`/`VITE_MAJON_WORKER_URL`) to that deployed URL, and
   add a build step for `stock-ranges` in `.github/workflows/deploy.yml`
   (already done if you're reading this from a checkout where that step
   exists — otherwise wire it up the same way the other apps' steps are).
