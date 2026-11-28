---
name: wildlight-expedition
description: Run, verify and ship changes to Wildlight Expedition (static mobile-first semi-idle fantasy RPG). Use when editing anything under wildlight-expedition/ (game.js, sprites.js, skills.js, sfx.js, music.js, style.css, assets).
---

Read `wildlight-expedition/CLAUDE.md` first (save model, roster, armor, battle view, audio, art rules). Static, **no build, no npm**.
Related skills: `wildlight-art` (pictures from Codex), `wildlight-audio` (sound and music), `wildlight-balance` (simulations), `wildlight-add-content` (heroes, weapons, armor, skills, stages).

## Run
- In this repo: `preview_start` with name `admin-static` (port 5178) → `http://localhost:5178/wildlight-expedition/`.
- In the author's separate dev folder (`C:\Temp\Game`, not a git repo) the config `wildlight` (port 8123, `node tools/serve.js 8123`) serves it at `http://localhost:8123/`. Changes are made and tested there, then copied into the repo clone to ship.
- The game exposes `window.__wl = { save, persist, render, actions, startBattle, B }`; battle helpers such as `loop`, `step`, `closeBattle`, `castSkillSlot` are globals.

## Verify (what has caught real bugs)
- Look at it at **390x844 and 360x640 (phone portrait)** and at desktop, not only one size. The battle screen is a different layout on a phone (`B.cam`, see CLAUDE.md "Phone battle view").
- A **hidden Browser pane pauses `requestAnimationFrame`** and throttles timers: a battle never advances and `javascript_tool` scripts with `await sleep` can time out. Show the pane (`show_pane preview`) or drive the loop yourself:
  `let ts=performance.now(); cancelAnimationFrame(__wl.B.raf); setInterval(()=>{ts+=50; loop(ts); cancelAnimationFrame(__wl.B.raf)},50)`.
  `actions.fight(id)` starts the battle asynchronously (art for the region loads first): wait until `__wl.B` exists. Finish with `closeBattle()`.
- Stepped simulations: `B.t = B.intro; B.introDone = true;` then `B.t += 0.05; step(0.05)` until `B.over` (step does not advance `B.t`; skills only run after the intro). More in `wildlight-balance`.
- A stuck page (script never returns, navigation times out) usually means an infinite loop in new code (it happened with a music scheduler that scheduled itself recursively). Close the tab, open a new one with `preview_start` + `url`.
- Console errors: the console buffer keeps old messages across reloads. To check for missing files, run `artUrls()` through `fetch(url, {method:'HEAD'})` and list the non-200 ones, or check `performance.getEntriesByType('resource')` for `responseStatus === 404`.
- Clear test state when done: `localStorage.clear(); sessionStorage.clear()`; reset the viewport with `resize_window` preset `desktop`.
- Audio can only start after a tap; click the page in the pane first. Levels can be measured with an `AnalyserNode` on `sfx.audio().out`; nobody can listen from here, so say that sound was measured, not heard.

## Gotchas
- Saves: `hydrate()` must upgrade every older save (new fields get defaults, unknown values are repaired: see `sanitizeArmor`). Test with an existing save, not only a fresh one.
- `later()` callbacks must not call `later()`. Never schedule audio or timers recursively without a delay.
- The Map tab has intentional test-period tools (Reset game data, unlock areas, add gold): leave them.
- Weapons and armor are drop-only (stage `drops` tables, farming rolls, no shop). Drop and farm text is generated from `DROP`; keep the numbers in one place.
- Hero pictures, armor layers, icons, `assets/meta.json` and `HERO_FILES` / `ARMOR_TIERS` in `sprites.js` must agree (same canvas per hero, feet at x 50% / y 97.46%).
- Sounds: `sfx.js` has synth sounds and recorded clips; a new action needs both (see `wildlight-audio`).
- Files with CRLF in the repo: `git` prints LF/CRLF warnings, ignore them. If a copied file shows only a line-ending diff, `git checkout` it.

## Ship (this is what the author expects, every time)
1. Implement and test (above). Update `wildlight-expedition/CLAUDE.md` in the repo for any change to rules, data or workflow.
2. In the repo clone: `git checkout main && git pull`, new branch, copy the changed files in (code, `style.css`, `index.html`, `assets/...`, `tools/...`; delete removed assets with `git rm`).
3. Commit (message ends with the `Co-Authored-By` line the session gives) and push; `gh pr create --head <branch>`; the PR body explains what changed and what was tested, and says honestly what was not (for example "sound measured, not heard"); end it with the 🤖 Generated with Claude Code line.
4. Bind the PR (`ccd_pr bind_pr`), then **ask "Merge PR N?"**. Merge only after an explicit yes: `gh pr merge N --squash --delete-branch`.
5. Report the version label: **`v <first 8 characters of the merge commit SHA>`** (bottom-left of the game once GitHub Pages has redeployed; `deploy.yml` writes the commit into `sw.js` and the label).
6. Never download files without the user's OK (name, source, size), never work around a site that blocks automated downloads.
