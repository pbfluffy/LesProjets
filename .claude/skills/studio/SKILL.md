---
name: studio
description: Run, verify and ship changes to the static "Pum's Office" studio page and its work-log Worker. Use when editing anything under studio/.
---

Read `studio/CLAUDE.md` first. Static page — no build.

## Run
`preview_start` with name `admin-static` (port 5178) → `http://localhost:5178/studio/`.

## Verify
- Scene: sprites still line up with the background (no halo/offset), day/night window cycle runs, Pause/Resume works.
- Music: needs a tap to start (autoplay rule); cycle all four styles.
- Work-log button: with the Worker unreachable the page must fall back to built-in tasks, not error.
- The page must never read or write `localStorage["theme"]`.

## Ship
Merge to `main` — `deploy.yml` copies the folder. Changes to `worklog-worker.js` need a manual Worker deploy
(skill `deploy-worker`); its `ANTHROPIC_API_KEY` is a Worker secret, never in the page or repo.
