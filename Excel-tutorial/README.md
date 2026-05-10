# Excel Tutorial — Pumba's Coffee Shop

A gamified Thai/EN Excel formula trainer. Phase 1 is a port of the original
single-file `excel-tutorial.html` into a Vite + React project, plus the
scaffolding for the gamification layer (skill tree screen, story chapter
intros, mission flow).

> **Status:** Phase 1 of 4 — foundation only. No XP, hearts, streaks, quizzes,
> or bosses yet. Those land in Phase 2 and 3 per the design doc.

## Quickstart

```bash
cd excel-tutorial
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/
npm run preview  # serve the production build locally
```

The build is configured to live at `/excel-tutorial/` once deployed (matches
`vite.config.js → base`). Override at build time with `VITE_BASE_PATH=/foo/`.

## Live URL (after deploy)

`https://pumbafluffycorgi.com/excel-tutorial/`

## What's in Phase 1

- **Vite + React** project (mirrors `bill-splitter/` conventions)
- **Bilingual content** — every formula, chapter, UI string has `{th, en}`
- **LangContext** + **ThemeContext** with localStorage persistence
- **Cafe palette** — light/dark themes with Mali display font (handwritten
  feel) for chapter titles, Sarabun body, IBM Plex Mono for formulas
- **Skill tree** — vertical tier-based layout, all 6 formulas + 2 boss
  placeholders. Phase 1 has everything unlocked; Phase 2 adds real gating.
- **Mission flow** — Chapter intro → Lesson → Practice → Quiz placeholder.
  Lesson and Practice are full ports of the original 6-formula content.
- **Hash-based deep linking** — `#vlookup` opens directly into that mission
- **Home button** — links back to landing page (matches existing style)

## What's NOT in Phase 1

Per the design doc, these arrive later:

- **Phase 2:** GameContext (XP, hearts, streak, level), quiz engine + 5
  question types, badges, profile screen, persistence model
- **Phase 3:** Real character art, story dialog beats between missions,
  Boss 1 (Auntie Noi), Boss 2 (Inspector), all badges live, daily quiz tile
- **Phase 4:** PWA manifest + service worker, sound effects, easter eggs,
  cheatsheet/print view

## Project structure

```
excel-tutorial/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx                  shell with header + screen router
    ├── App.module.css
    ├── styles/tokens.css        design tokens, light/dark, animations
    ├── contexts/
    │   ├── LangContext.jsx      TH/EN, English default
    │   └── ThemeContext.jsx     dark/light, system-aware
    ├── data/
    │   ├── formulas/            one bilingual file per formula
    │   │   └── index.js
    │   ├── story/
    │   │   ├── chapters.js      6 chapter intros (bilingual)
    │   │   └── characters.js    Pumba, Auntie Noi, Mike, Inspector
    │   └── skill-tree.js        node topology, prereqs (Phase 2 wires gating)
    ├── lib/
    │   └── tr.js                tiny {th,en} → string helper
    ├── components/
    │   ├── tree/                SkillTree, NodeCard
    │   ├── lesson/              FormulaAnatomy, Steps, Mistakes, Card
    │   ├── practice/            6 demos + shared utilities
    │   ├── story/               Avatar, CharacterDialog, ChapterIntro
    │   └── shared/              HomeButton
    └── screens/
        ├── HomeScreen.jsx       skill tree
        └── MissionScreen.jsx    chapter → lesson → practice → quiz
```

## Deployment notes

The current GitHub Actions workflow at `.github/workflows/deploy.yml` builds
`bill-splitter/` and copies static files. To deploy this project, the workflow
needs to also build `excel-tutorial/` and copy `excel-tutorial/dist/` into
`_site/excel-tutorial/`.

A proposed update is provided as **`deploy.proposed.yml`** at the repo root —
review and merge into `.github/workflows/deploy.yml` when you're ready to flip
the switch. The legacy `excel-tutorial.html` can stay in place; the new app
lives at a different URL path (`/excel-tutorial/` with trailing slash) so they
don't collide.

## Adding a new formula (Phase 1 reference)

1. Create `src/data/formulas/<id>.js` with the bilingual data shape
2. Add it to `src/data/formulas/index.js`
3. Add a node to `src/data/skill-tree.js` (set `tier`, `col`, `prereqs`)
4. Add a chapter to `src/data/story/chapters.js`
5. Build a demo at `src/components/practice/<Id>Demo.jsx`
6. Wire it in `src/components/practice/Demo.jsx`

That's it — no other files need touching.

## Design doc

See `excel-tutorial-design.md` (in the chat) for the full Phase 1–4 plan,
character bible, quiz mechanics, badge list, persistence schema, and open
decisions.
