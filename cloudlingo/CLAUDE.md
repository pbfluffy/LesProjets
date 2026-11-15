# cloudlingo

Bite-sized lessons for AWS certifications (CLF-C02, AIF-C01, SAA-C03, DVA-C02, SOA-C03, DEA-C01) and ITIL 4
Foundation. Live: `/cloudlingo/`. **Plain static HTML/CSS/JS — no npm, no bundler, no build step.** `README.md`
has the full feature list.

## Layout

- `index.html`, `css/`, `js/app.js` (the app), `js/data.js` (original questions + the question-format docs at the
  top), `js/bank/<cert>.js` (extra question banks), `js/th/*.js` (Thai text, loaded only in Thai),
  `js/glossary.js` (word hints), `js/i18n.js`, `js/diagrams.js`, `js/why/`, `sw.js`, `manifest.webmanifest`.
- `reminders/send.mjs` — daily push reminders, run as a step of the hourly GitHub Actions job
  (`price-alerts-cron.yml`); needs `FIREBASE_SERVICE_ACCOUNT` + VAPID keys, otherwise it skips quietly.
- `art-src/` — source art, not deployed.

## Rules that are easy to break

- **Questions are append-only.** Add with `addQuestions('<unit id>', [...])` at the **end** of a bank file. Never
  insert, delete or reorder: question ids come from position and learners' saved stats/spaced-review use them.
- **Deploy-time placeholders** are substituted by `deploy.yml`: `?v=dev` (index.html), `const VERSION = 'dev'`
  (sw.js), `__VAPID_PUBLIC__` and `__BUILD_DATE__` (js/app.js). Leave them literally as-is in source.
- Only `index.html sw.js manifest.webmanifest css js img sounds` are published; anything else won't be live.
- `.github/lint/cloudlingo-check.cjs cloudlingo` is a deploy gate (and has its own workflow on PRs touching
  `cloudlingo/**`). Run it after content edits: `node .github/lint/cloudlingo-check.cjs cloudlingo`.
- ITIL® is a PeopleCert trademark; keep the non-affiliation notice.

## Data & auth

- Progress is always in localStorage; signed-in learners (Google, LINE or Microsoft) also sync to
  `userCloudlingo/{uid}` (newest wins; first sign-in with data on both sides asks which to keep).
- Uses a **named Firebase app**, so signing in/out here doesn't touch other apps' sessions.
- Collections: `cloudlingoWeeks/{monday}/scores/{uid}`, `cloudlingoReports`, `cloudlingoPush/{uid}`, question
  fixes, `userCloudlingo`. Rules are in the Cloudlingo blocks of `firestore.rules`.
- The README says `node server.js`, but no such file is in this folder — serve the folder with any static server
  (launch config `admin-static`, then `/cloudlingo/`).
