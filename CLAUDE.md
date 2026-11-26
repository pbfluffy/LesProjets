# LesProjets

Monorepo for **pumbafluffycorgi.com** — a set of small apps that share one origin, one Firebase project
(`pumgoda`) and one GitHub Pages deploy. Per-app detail is in each app's own `CLAUDE.md`; per-app
playbooks (run / verify / ship) are project skills in `.claude/skills/`.

## Apps

| Dir | What | Stack | Dev (launch.json name → port) | Live path |
|---|---|---|---|---|
| `bill-splitter/` | Thai bill splitter, PromptPay QR, Sushiro plate counter | Vite + React, PWA, Worker | `bill-splitter` → 5174 | `/bill-splitter/` |
| `nutritions-thailand/` | Cut/recomp nutrition tracker, photo dish ID | Vite + React, PWA | `nutritions-thailand` → 5182 | `/nutritions-thailand/` |
| `pumgoda/` | Pet-friendly places map with paw tiers | Vite + React, Leaflet, PWA | `pumgoda` → 5176 | `/pumgoda/` |
| `stock-ranges/` | Watchlist + portfolio wallet, 10-band price range | Vite + React, PWA, Worker, cron | `stock-ranges` → 5180 (worker 8787) | `/stock-ranges/` |
| `village-77/` | Village marketplace + handymen board, LINE login | Vite + React, PWA, Worker | `village-77` → 5184 | `/village-77/` |
| `cloudlingo/` | AWS/ITIL exam practice, Duolingo-style | **Static JS, no build** | `admin-static` → 5178 | `/cloudlingo/` |
| `studio/` | Ambient "Pum's Office" page | Static HTML | `admin-static` → 5178 | `/studio/` |
| `backyard-rampage/` | Browser game | Static HTML | `admin-static` → 5178 | `/backyard-rampage/` |
| `wildlight-expedition/` | Semi-idle fantasy RPG (3 heroes, boss barrier timing, offline farming) | Static JS, no build | any static server | `/wildlight-expedition/` |

Other root files: `index.html` (landing page with one card per app), `admindepum.html` (admin console: Pumgoda
catalog editor, Cloudlingo reports…), `montreal-autumn-2026.html` + `montreal-manifest.json` (static trip page),
`temp.html`. `workers/` holds legacy stand-alone Cloudflare Workers (`nutritions-photo`, `pumgoda-photo`,
`bill-splitter-receipt`, `pumgoda-places-lookup`).

## Conventions

- **Vite base path** is `/<app>/` (override `VITE_BASE_PATH`; nutritions uses `VITE_BASE`; pumgoda uses `./`).
  Open the dev server at `http://localhost:<port>/<app>/` — older READMEs mention `/LesProjets/...`, which is stale.
- **`shared/`** is imported by relative path from each app: `theme-tokens.css` (import first in `main.jsx`),
  `sharedLang.js`, `useCloudSyncCore.js`, `appRecovery.js`, `appVersion.js`, `viteBuildInfo.js`, `tour.js`.
  Changing a shared file affects every app — build each consumer.
- **Theme** is `localStorage["theme"]` = plain string `"dark"`/`"light"` — **never JSON-encode it**. Language is
  `localStorage["lang"]` = `"th"`/`"en"`. Both are shared across every app on the origin. Apps are EN/TH via a
  `LangContext`.
- **Firebase**: one project, `pumgoda`. Each app has its own `src/firebase.js` (npm package or gstatic CDN —
  copy the pattern of the app you're editing). Per-user data lives in `user<Thing>/{uid}` docs.
- **Styling**: CSS Modules per component + `theme-tokens.css` variables. Don't hard-code colors that break dark mode.
- **Comments**: this codebase explains *why* in comments (past outages, platform quirks). Keep that habit.

## What deploys automatically, and what does not

Pushing to `main` runs `.github/workflows/deploy.yml` → builds every app → publishes `_site` to GitHub Pages.
**Only the static frontends deploy that way.** These are manual, separate steps:

- **Firestore rules** (`firestore.rules`): `firebase deploy --only firestore:rules --project pumgoda`. A new
  collection or new synced field is rejected live until this is done. See skill `deploy-firestore-rules`.
- **Cloudflare Workers**: `npx wrangler deploy` from the worker folder; secrets via `npx wrangler secret put`.
  See skill `deploy-worker`.
- **Cloudflare cache**: `sw.js` must not be edge-cached (Cache Rule, see `bill-splitter/README.md`), or phones
  keep the old app after a deploy.

Pre-deploy gate: ESLint `no-undef` over every app's `src/` + `shared/` (config in `.github/lint/`), and
`.github/lint/cloudlingo-check.cjs` for Cloudlingo, and `npm test` in `stock-ranges/` (Node's built-in runner,
no install needed). A failing check blocks the deploy. Run the lint locally:

```bash
npm ci --prefix .github/lint
npx --prefix .github/lint eslint -c .github/lint/eslint.config.mjs <app>/src shared
```

`vite build` does **not** catch undefined variables — they crash at runtime — so run this after edits.
A new app must be added to that command in `deploy.yml` (skill `new-app`).

GitHub Pages serializes deploys; when pushing several commits to `main`, space them ~60 s apart.

## Working in this repo

- The user often has **uncommitted work on a feature branch**. Run `git status` first; commit only what the task
  needs, and use a new branch or `git worktree` off `origin/main` rather than sweeping unrelated changes in.
  `main` moves fast — `git fetch` before reasoning about what exists.
- **Secrets never go in tracked files** (service-account JSON, API keys, tokens). They are Worker secrets or
  GitHub Actions secrets. `VITE_*` values are public once built — only put public values there.
- Before changing repo/hosting settings (Pages, branches, domains), check the impact on the live site.
- When asked whether something is safe/secret-free, actually scan (`git grep`), don't answer from memory.
- Deploying rules from a working tree publishes uncommitted rule edits too — check `git diff firestore.rules`
  first, or deploy from a clean copy of `origin/main`.
