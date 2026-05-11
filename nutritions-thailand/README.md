# Nutritions · Thailand

Thai cut/recomp nutrition tracker — TDEE, macros, water, custom foods, per-day logging.

Migrated from the single-file `NutritionsInThailand.html` to a Vite + React app
following the same conventions as `bill-splitter`.

## Stack

- React 18, Vite 5
- CSS Modules
- `LangContext` for EN/TH toggle (default: EN)
- localStorage for persistence — no backend

## Dev

```bash
npm install
npm run dev       # http://localhost:5173/LesProjets/nutritions-thailand/
npm run build
npm run preview
```

To build for the root of a custom domain instead of the GitHub Pages sub-path:

```bash
VITE_BASE=/ npm run build
```

## Layout

```
src/
  main.jsx                 # entry
  App.jsx                  # tab switcher
  index.css                # CSS vars, theme, body
  LangContext.jsx          # EN/TH provider + useLang() hook
  data/
    meals.js               # Thai food database (categorized by food type)
    constants.js           # ACTIVITY, BMI bands, BMR/TDEE math
  i18n/
    strings.js             # EN + TH dictionaries, makeTranslator()
  hooks/
    useNutritionStore.js   # state + localStorage + per-day log + export/import
  components/
    Header, TabBar, DateSwitcher,
    StatCard, CaloriesCard, WaterTracker, FoodLog,
    FoodItem, FoodTab,
    AdjustTab, CustomTab,
    DataPanel,
    OverviewTab
```

## What's new vs the original HTML

- **Food-type categories** — items are grouped by what they are (rice dishes,
  noodles & congee, eggs & dairy, salads & grills, snacks & extras, 7-11)
  rather than what meal you "should" eat them at. Eat ส้มตำ for breakfast if
  you want.
- **localStorage persistence** — stats, log, water, custom foods, theme, and
  language all survive a refresh.
- **Per-day log** — every day stored under its own `YYYY-MM-DD` key; prev/next
  buttons in the Overview tab let you scroll through history.
- **EN/TH toggle** — wired through `LangContext`. Default is EN, matching
  Bill Splitter. Toggle from the header.
- **Export / Import / Clear** — JSON backup (Adjust tab → Data panel).
- **Modular** — each tab is a component, ready for further features (e.g.
  weekly trends, weight log, macro targets, barcode lookup).

## Deploy

The workflow under `.github/workflows/deploy.yml` assumes this project lives
at `nutritions-thailand/` in the `LesProjets` monorepo and publishes the
build to `gh-pages/nutritions-thailand/`. `keep_files: true` is used so the
existing `bill-splitter/` deploy stays intact.

If `LesProjets` already has a different deploy workflow, just point its build
matrix at this folder and use `vite.config.js`'s base path.

## Roadmap

- Weight & body-fat trend chart
- Configurable macro targets (e.g. 1g protein per lb lean mass)
- Mealtime tagging on individual log entries (opt-in, per-meal — never on
  the food itself)
- PWA / offline install
- Optional sync (Gist / Drive)
