---
name: backyard-rampage
description: Run, verify and ship changes to the Backyard Rampage browser game (static, leaderboards in Firestore). Use when editing anything under backyard-rampage/.
---

Read `backyard-rampage/CLAUDE.md` first. Static — no build.

## Run
`preview_start` with name `admin-static` (port 5178) → `http://localhost:5178/backyard-rampage/`.

## Verify
- `index.html` looks like bundled output: before editing, search for the real source; otherwise keep edits small.
- Gameplay tuning: prefer `balance.json`; play a few waves to confirm the change feels right.
- Save sync / leaderboards: score and name limits are enforced by Firestore rules (`leaderboard`, `challengeBoard`,
  `userGame`). If you change what is written, update the rule and test the write while signed in.

## Ship
Merge to `main` (the folder is copied as-is). Rule changes: skill `deploy-firestore-rules`.
