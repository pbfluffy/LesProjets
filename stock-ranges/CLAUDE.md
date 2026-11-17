# stock-ranges

Watchlist + portfolio "wallet": where each stock sits in a 10-band range over a lookback window, with a
Buy (1–3) / Hold (4–7) / Sell (8–10) label, price alerts, holdings, sales log, targets. Live: `/stock-ranges/`.
`README.md` covers setup.

## Layout

- `src/deciles.js` — band maths. `src/stockApi.js` — Worker client. `src/fx.js`, `format.js`, `marketHours.js`.
- `src/wallet.js` + `components/WalletView.jsx`, `HoldingCard`, `RecordSaleForm`, `SalesLog`, `TargetsEditor`,
  `AllocationChart`, `PortfolioHistoryChart` — the portfolio side. `src/portfolioHistory.js` — history snapshots.
- `src/pdfImport.js` — statement import (pdfjs → Worker's Workers-AI import route).
- `src/hooks/useCloudSync.js` (+ `usePortfolioHistorySync`, `usePriceAlerts`) — sync to Firestore `userStockRanges/{uid}`.
- `src/sw.js` — custom service worker (`injectManifest`) hosting the Web Push `push` listener. Precaching and the
  one runtime-cache rule are hand-rolled there.
- `worker/` (`stock-ranges-quotes`): Yahoo Finance chart proxy (5-min edge cache), rate-limited AI import route,
  `/alerts` (KV `ALERTS`), Web Push (VAPID), and an **hourly Cron Trigger (`7 * * * *`)** whose `trigger.js` starts
  the GitHub Actions workflow `price-alerts-cron.yml` via `workflow_dispatch` (GitHub's own `schedule:` is unreliable).
  `scripts/check-alerts.mjs` (`npm run check-alerts`) is what that job runs; `portfolio-checks.mjs` and
  `earnings.mjs` are sibling scripts.

## Gotchas

- **New synced fields need a rule change.** `userStockRanges/{uid}` in `firestore.rules` bounds each field
  (`watchlist`, `holdings`, `alerts`, `sells`, `targets`, `portfolioHistory`, …). Add the field + a size bound there
  and deploy the rules, or the write is rejected live.
- The "not investment advice" disclaimer is permanent in the UI — keep it. Signals are a position-in-range
  heuristic, nothing more.
- **Do not suggest or add CSV export for the wallet** — the owner rejected it as useless.
- Build env: `VITE_STOCK_WORKER_URL`, `VITE_PUSH_VAPID_PUBLIC_KEY`. Local: copy `.env.example` → `.env.local`.
  `.env.local` is untracked; never commit it.
- Worker is a manual `npx wrangler deploy` in `worker/`; secrets (`VAPID_PRIVATE_KEY`, `GITHUB_DISPATCH_TOKEN` used by the cron trigger) are Worker secrets. The
  alert-check GitHub Actions job has its own repo secrets.
- Run the repo ESLint gate after edits (see root `CLAUDE.md`).
- **Tests:** `npm test` here (Node's built-in `node --test`, zero dependencies, files in `test/`) covers the wallet,
  benchmark and earnings logic. It is part of the deploy gate in `deploy.yml`, so a failing test blocks the Pages
  deploy. Write the test first for a bug fix; the earnings checker is tested end to end with a fake KV and clock.
