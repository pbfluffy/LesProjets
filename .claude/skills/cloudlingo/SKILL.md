---
name: cloudlingo
description: Run, verify and ship changes to cloudlingo (static AWS/ITIL exam-practice app) including adding questions. Use when editing anything under cloudlingo/ or its reminders job.
---

Read `cloudlingo/CLAUDE.md` first. This app has **no build step and no npm at the app level**.

## Run
`preview_start` with name `admin-static` (port 5178, serves the repo root) → `http://localhost:5178/cloudlingo/`.

## Adding / changing questions
- Append with `addQuestions('<unit id>', [...])` at the **end** of the right `js/bank/<cert>.js`. Never insert, delete
  or reorder existing questions (ids are positional; learner stats depend on them).
- Follow the format documented at the top of `js/data.js`. Thai text goes in `js/th/*.js`; word hints in `js/glossary.js`.
- Run the checker: `node .github/lint/cloudlingo-check.cjs cloudlingo` — it must pass (it also gates the deploy).

## Verify
- Play one lesson per changed unit: question renders, correct answer accepted, explanation shows, wrong answers come back.
- Switch to Thai if you touched `js/th/` or `i18n.js`. Check both light and dark theme.
- Service worker/caching changes: remember published files are only `index.html sw.js manifest.webmanifest css js img sounds`.

## Ship
1. Leave deploy-time placeholders (`?v=dev`, `VERSION = 'dev'`, `__VAPID_PUBLIC__`, `__BUILD_DATE__`) untouched.
2. Merge to `main` (Pages substitutes them). Rules for `userCloudlingo`, reports and leaderboard changes need
   skill `deploy-firestore-rules`. The reminders job runs inside the hourly `price-alerts-cron.yml` workflow.
