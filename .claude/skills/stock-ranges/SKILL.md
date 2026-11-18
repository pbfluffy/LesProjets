---
name: stock-ranges
description: Run, verify and ship changes to stock-ranges (watchlist, portfolio wallet, price alerts) and its quotes/alerts Worker + hourly cron. Use when editing anything under stock-ranges/ or the price-alerts workflow.
---

Read `stock-ranges/CLAUDE.md` first.

## Run
- Frontend: `preview_start` name `stock-ranges` (port 5180) → `http://localhost:5180/stock-ranges/`.
- Worker: `preview_start` name `stock-ranges-worker` (port 8787); set `VITE_STOCK_WORKER_URL=http://localhost:8787`
  in `stock-ranges/.env.local` (copy from `.env.example`; never commit it).
- Production-build check: `stock-ranges-prod-preview` (5181).

## Verify
- Band/signal changes: check `deciles.js` edge cases (price = low, = high, flat range).
- Wallet changes: holdings, sale recording, targets, allocation chart; test with a non-USD holding for FX.
- Anything newly synced to Firestore: confirm the field is allowed (and size-bounded) in the `userStockRanges` rule
  — otherwise the live write fails. Update `firestore.rules` and deploy it (skill `deploy-firestore-rules`).
- Alerts: `cd stock-ranges/worker && npm run check-alerts` exercises the job logic locally (needs env); see the
  header of `scripts/check-alerts.mjs`. The workflow's `workflow_dispatch` input `test_push` sends a test notification.
- The not-investment-advice disclaimer must still be visible. No CSV export for the wallet.

## Ship
1. `npm run build`, then the ESLint `no-undef` gate (root `CLAUDE.md`).
2. Frontend via merge to `main`. Worker: manual `npx wrangler deploy` in `stock-ranges/worker` (skill `deploy-worker`);
   the cron trigger (`3 * * * *`) is defined in its `wrangler.toml`. New build env vars are GitHub Actions secrets.
