---
name: new-app
description: Add a new app to the LesProjets monorepo (scaffold, deploy wiring, rules, launch config, docs). Use when the user asks for a new app/page on pumbafluffycorgi.com.
---

Model new Vite apps on an existing one (`village-77/` for a small app, `stock-ranges/` for PWA + Worker). Static pages follow
`studio/`. Confirm with the user before publishing anything outward-facing (landing-page card, merge to `main`).

1. **Scaffold** `<app>/` with `package.json`, `vite.config.js` (`base: process.env.VITE_BASE_PATH || '/<app>/'`,
   `buildInfoDefine()` from `../shared/viteBuildInfo.js`), `index.html` (theme bootstrap script, `noindex` if private),
   `src/main.jsx` importing `../../shared/theme-tokens.css` first.
2. **Firebase**: copy a sibling `src/firebase.js` (project `pumgoda`). Per-user data goes in a `user<Thing>/{uid}` doc.
   Never store secrets/PII beyond what's needed (e.g. no card numbers).
3. **Firestore rule** in root `firestore.rules`: owner-only unless there's a reason; bound field shapes and sizes.
4. **`.github/workflows/deploy.yml`**: (a) add `<app>/src` to the ESLint command, (b) add a "Build <app>" step,
   (c) add `_site/<app>` to the `mkdir -p` line, (d) add `cp -r <app>/dist/. _site/<app>/`. Static apps: copy the folder.
5. **`.claude/launch.json`**: add an entry with `cwd`, a free port (taken: 5173–5185 except 5175, 5179) and
   `runtimeArgs: ["run","dev","--","--port","<port>"]`.
6. **Docs**: add `<app>/CLAUDE.md`, `.claude/skills/<app>/SKILL.md`, and a row in the root `CLAUDE.md` table.
7. **Verify**: `npm install && npm run build`, unit-test pure logic, run the ESLint gate, `preview_start` the app.
8. **Ship order**: deploy rules first (skill `deploy-firestore-rules`), then merge to `main`, then check
   `https://pumbafluffycorgi.com/<app>/` returns 200 (use the trailing slash). Landing-page card is optional and
   needs the user's go-ahead.
