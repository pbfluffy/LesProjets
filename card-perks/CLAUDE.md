# card-perks

Login-gated credit-card privilege checker. Users add cards; privileges come from a catalog the app collects itself
from banks' public websites (currently KTC), plus any the user types in. Users filter across all of them by
category, points required or not, minimum spend, card, search and expiry. Live: `/card-perks/`.

## Layout

- `src/perks.js` — **pure** filter/normalise logic (`filterPerks`, `cleanPerk`, `isExpired`, `resolveCards`,
  `autoPerksFor`). Put rules here so they stay unit-testable: `npm test` (src tests only).
- `src/banks.js` — static bank/card lists for the Add card form (a convenience fallback) and `bankOptions(catalog)`,
  which lets a scanned bank's catalog replace its static card list. `src/useCatalog.js` reads `cardCatalog`.
- `src/categories.js`, `templates.js` — category list; generic **example** privilege sets (not real issuer data —
  keep them labelled "(example)").
- `scanner/` — **the automatic collection.** Node package (own `package.json`, not part of the Vite build) with one
  adapter per bank (`ktc.mjs`), keyword classification (`classify.mjs`) and `scan.mjs`. Run weekly by
  `.github/workflows/card-perks-scan.yml`; it publishes to Firestore `cardCatalog/{bankId}`. See below.
- `src/useCards.js` — loads/saves one Firestore doc, `userCards/{uid}` = `{ cards: [...], lastModified }`.
- `src/components/` — `LoginGate` (Google sign-in; nothing renders without it), `CheckerView` (filters + results),
  `CardsView` (cards CRUD), `PerkForm`.
- Plain CSS in `src/index.css` on top of `shared/theme-tokens.css`. English only. No PWA, no Worker.

## Data & privacy rules

- **Never store card numbers, expiry dates or CVVs** — only name, nickname, network and perks. The UI says so; keep it so.
- Firestore rule `userCards/{uid}` is owner-only (not even admins) and caps `cards` at 30. `MAX_CARDS`/`MAX_PERKS`
  in `CardsView.jsx` must stay within the rule/doc size limits.
- The whole card list is rewritten on each change (`persist`); fine at this size, revisit if perks grow large.

## The scanner (automatic privileges)

- A user's card stores only a reference, `catalogRef: { bank, card }`, never a copy of the privileges. The app merges
  catalog privileges in at render time (`resolveCards`), so when the scanner republishes, everyone sees the update.
  Auto privileges have ids prefixed `auto:`, are read-only, and carry `sourceUrl` + `checkedAt` shown in the UI.
- `cardCatalog/{bankId}` = `{ bank, source, cards:[{ id, name, url, perks:[{ id, title, category, requiresPoints,
  conditions }] }], scannedAt, contentHash }`. Rule: signed-in read, no client write (the scanner uses the service
  account). Needs the `FIREBASE_SERVICE_ACCOUNT` repo secret to publish; without it the job is a dry run.
- Dry run locally: `cd card-perks/scanner && npm install && node scan.mjs --out result.json` (about 15 requests,
  one per second). Tests: `npm test` in `scanner/` (parser fixtures are trimmed real markup).
- **Safety valve:** `validate()` in `scan.mjs` refuses to publish a scan that looks broken (too few cards or cards
  with almost no privileges), so a site redesign leaves the last good catalog in place. Keep that check.
- **Adding a bank** = one adapter exporting `BANK`, `scan(fetchText)`, returning `{ bank, source, cards }`, then add
  it to `SCANNERS` in `scan.mjs`. Before writing it: read the site's `robots.txt` and only fetch allowed paths
  (KTC allows `/en/credit-card/…`, disallows `/th/`, so the scanner is English-only), keep one request per second,
  and check the page is server-rendered (view source, not the browser inspector). Never scrape behind a login.
- Categories are keyword guesses (`classify.mjs`); the bank's own wording is always kept as `conditions`. `requiresPoints`
  is true only when using a privilege *costs* points ("earns points" does not count) and is rare on card pages.
- Collected text is a bank's marketing copy; the UI labels it "from the bank's website, confirm with the bank".
- The static list in `banks.js` is only a fallback for the Add card form; the catalog wins when present.

### Restaurant promotions (`scanner/ktc-promos.mjs`)

- KTC's dining promotions are ~1,900 individual pages found through its sitemaps (about 40% are live; the rest are
  expired and skipped). `node scan.mjs --promos` fetches them at one request per second (~35 min), so the workflow runs
  it as its own job (`promos`, 90 min timeout). `--limit 50` is a quick trial that refuses to `--publish`.
- robots.txt blocks promotion URLs **with a query string** (`?page=`, `?filter=`), so never crawl the paginated list
  pages — only the plain page URLs the sitemaps list (`isDiningPromoUrl`).
- Output is sharded into `cardPromos/{bank}-dining-{n}` (600 promotions each, far under the 1 MB doc limit); leftover
  higher-numbered shards are deleted after a publish. Rule: signed-in read, no client write.
- Each promo: `{ id, path, group, title, summary, start, end, brands, requiresPoints, minSpend }`. Dates come from the
  page's "Period 1 Feb 26 - 31 Jan 27" line; a page without a readable end date is skipped, not guessed.
  `brands: []` means all KTC cards; otherwise only cards of that brand get it (`promosFor` uses `cardBrand`).
- `requiresPoints` is true only for offers that *open with* a redemption ("Redeem points for …") with no plain route;
  mixed offers count as no-points. It's a heuristic — the UI links to the source and says to confirm with the bank.
- The app loads promotions only when the user has a catalog-linked card (`usePromos`), merges them at render time like
  catalog privileges, and pages the results (40 at a time) because there can be hundreds.
- `validatePromos()` is the safety valve for this scan (enough pages, few download failures, enough live promotions).

## Gotchas

- Deploy order: **deploy the Firestore rules before the app is usable** (see root `CLAUDE.md`).
- Dev server needs a real Google sign-in to see anything past the gate.
- Run the repo ESLint gate after edits (see root `CLAUDE.md`).
