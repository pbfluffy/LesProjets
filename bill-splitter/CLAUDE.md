# bill-splitter

Mobile-first Thai bill splitter with a Sushiro plate-counter tab. Live: `/bill-splitter/`. Read `README.md` for
the feature list; this file is the working notes.

## Layout

- `src/billMath.js`, `src/money.js`, `src/currencies.js`, `src/fx.js` — all money maths. Change amounts/rounding
  here, not in components, and re-check totals add up to the bill after any change.
- `src/promptpay.js` + `components/QrSvg.jsx` — PromptPay payload/QR. The payee `promptPay` field can also be
  `bank:<code>:<account>[:<qr id>]` (bank-account payee). Don't break that format; saved data uses it.
- `src/hooks/` — `useBillStore`, `useSushiroStore`, `useBillHistory`, `useTripsStore`, `useSavedPayees`,
  `useCloudSync` (built on `shared/useCloudSyncCore.js`).
- `src/liff.js` — LINE LIFF integration. `src/share.js` — text/image share (html2canvas + Web Share).
- `worker/` — `bill-splitter-og-meta` Worker on the zone route `pumbafluffycorgi.com/bill-splitter/*`; rewrites
  `og:` tags (HTMLRewriter) for shared links `?d=<payload>` / `?s=<shortId>`. Not called by the app.
- `../workers/bill-splitter-receipt-worker.js` — separate receipt Worker.

## Data

- localStorage: `bill-splitter.history`, `bill-splitter.lang`, `theme` (plain string).
- Firestore (when signed in): `userBills/{uid}` (+ `trips` subcollection), `userPayees/{uid}`, `shareLinks/{shortId}`
  (must stay **publicly readable** or the Worker's short-link previews fall back to the static tags).
  Rules live in the root `firestore.rules` — a new synced field may need a rule change.

## Gotchas

- Shared bill links carry the whole bill in the URL; keep payload decoding backward compatible.
- The Worker's `og:` rewrite is best-effort; direct `?d=` links work without it.
- Worker changes are a manual `npx wrangler deploy` in `worker/`, not part of the Pages deploy.
