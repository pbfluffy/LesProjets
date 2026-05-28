# Pum's Office — `/studio/`

A static ambient page: Corgi (Project Manager) and Floof (Systems Analyst) working
at their desks in a cozy late-night studio. Breathing / head-tilt / typing motion,
pulsing desk lamps, flickering screen-glow, a slow day/night window cycle, a small
procedural-music jukebox (Cafe Jazz / Lo-fi / Bossa / Late Night), and an optional
live Claude work-log. Part of pbfluffy/LesProjets, live at
pumbafluffycorgi.com/studio/.

## Shape

Plain static HTML/CSS/JS — NOT a Vite app. The deploy workflow just copies the
folder into `_site/studio/` (same treatment as the legacy NutritionsInThailand.html).
No npm build.

```
studio/
  index.html          # page (~29 KB)
  assets/
    office.jpg        # background art
    corgi.png         # extracted sprite
    floof.png         # extracted sprite
  worklog-worker.js   # Cloudflare Worker (deployed separately, NOT served)
  README.md
```

The two dogs are cut out of the background and laid back over it pixel-perfect, so
the art looks untouched at rest and only the subtle motion gives them life.

## Theme

Intentionally always-dark — the art is a night scene. The page never reads or
writes `localStorage["theme"]`, so it can't affect the shared cross-app theme key.

## Live work-log (Cloudflare Worker)

GitHub Pages is static, so the Node `server.js` (local-dev only) can't run there.
The live work-log uses a Cloudflare Worker instead (same pattern as the Nutritions
Gemini proxy). The key stays a Worker secret; the page only talks to the Worker.

1. `wrangler init pums-office-worklog` (or paste worklog-worker.js into a Worker)
2. `wrangler secret put ANTHROPIC_API_KEY`
3. optional: set `ALLOWED_ORIGIN` var to `https://pumbafluffycorgi.com`
4. `wrangler deploy`
5. set `WORKLOG_ENDPOINT` in `index.html` to the deployed Worker URL

If the Worker is unreachable, the page falls back to built-in task writing — no
breakage. The button label flips to "live - claude" when the Worker responds.

## Controls

- Pause / Resume — freeze or resume the scene
- Music: off/on — toggle the procedural music (needs a tap; browser autoplay rule)
- Style — cycle Cafe Jazz / Lo-fi / Bossa / Late Night (changes live)
- Generate live log — ask Claude for fresh tasks (needs the Worker)

## Deploy

Add to the assemble step in `.github/workflows/deploy.yml`:

    mkdir -p _site/studio
    cp -r studio/. _site/studio/

Static — no build job. Pushes to `main` publish via the monorepo workflow.
