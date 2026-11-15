# studio ("Pum's Office")

Static ambient page: Corgi (Project Manager) and Floof (Systems Analyst) at their desks, procedural music jukebox,
optional live Claude work-log. Live: `/studio/`. `README.md` has the details.

- **Plain static HTML/CSS/JS, not Vite.** `deploy.yml` just copies the folder. No npm build.
- `index.html`, `office.css`, `office.js`, `assets/` (background art + extracted sprites).
- `worklog-worker.js` is a Cloudflare Worker **deployed separately and not served**. The Anthropic key is a Worker
  secret (`ANTHROPIC_API_KEY`); the page only talks to the Worker via `WORKLOG_ENDPOINT` in `index.html`. If the
  Worker is down the page falls back to built-in task text — keep that fallback working.
- Intentionally always dark: never read/write `localStorage["theme"]`.
- The dogs are cut-outs laid back over the background pixel-for-pixel; moving/resizing art needs both layers kept aligned.
- Preview with launch config `admin-static` → `http://localhost:5178/studio/`.
