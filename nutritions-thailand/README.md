# Nutritions · Thailand

Thai cut/recomp nutrition tracker — TDEE, macros, water, custom foods, per-day logging, photo-based dish identification. Part of [pbfluffy/LesProjets](https://github.com/pbfluffy/LesProjets), live at [pumbafluffycorgi.com/nutritions-thailand/](https://pumbafluffycorgi.com/nutritions-thailand/).

## Tabs

| Tab | What it does |
|---|---|
| 📊 **Overview** | TDEE / target / BMR / BMI / lean mass cards, calorie-and-macro card, protein card, water tracker, today's food log, **7-day TrendChart**, prev/next date switcher |
| 🍱 **Food** | Categorized Thai food database (rice dishes, noodles & congee, eggs & dairy, salads & grills, snacks, 7-11) with search + category chips; tap any item to log |
| 📷 **Photo** | Identify a Thai dish from a photo via Gemini (proxied through a Cloudflare Worker); returns macros + portion estimate; log or save to your custom foods |
| ⚙️ **Adjust** | Body stats (weight / height / age / gender), activity level, calorie-delta slider with safety warnings, macro-target config, **WaterReminderCard** (browser notifications), data backup panel |
| ➕ **Custom** | Manual add-custom-food form (name + kcal + macros + note) and your custom-food list with one-tap log / remove |

## Stack

- React 18, Vite 5
- CSS Modules
- `LangContext` for EN/TH (default: EN)
- `recharts` for the TrendChart
- `localStorage` for everything — no backend (Gemini calls go through a Worker)

## Storage

Everything lives under one key:

- `nutritions.store.v1` — stats, custom foods, per-day logs (`YYYY-MM-DD` keyed), theme, language, water amount, macro targets, water-reminder config
- `theme` — shared across all apps on the origin; **plain string, never JSON-encoded**

Export / Import / Clear lives in **Adjust → Data backup**.

## Dev

```bash
cd nutritions-thailand
npm install
npm run dev       # http://localhost:5173/LesProjets/nutritions-thailand/
npm run build
npm run preview
```

To build for the root of a custom domain instead of the GitHub Pages sub-path:

```bash
VITE_BASE=/ npm run build
```

## Structure

```
src/
  main.jsx, App.jsx, index.css
  LangContext.jsx               # EN/TH provider + useLang() hook
  data/
    meals.js                    # Thai food database (categorized)
    constants.js                # ACTIVITY, BMI bands, BMR/TDEE/macro math
  i18n/
    strings.js                  # EN + TH dictionaries, makeTranslator()
  hooks/
    useNutritionStore.js        # state + localStorage + per-day log + export/import
    useWaterReminder.js         # browser-notification reminder loop
  components/
    Header, TabBar, DateSwitcher,
    StatCard, CaloriesCard, ProteinCard, WaterTracker, FoodLog,
    FoodItem, FoodTab,
    PhotoTab,                   # Gemini dish identifier
    AdjustTab, WaterReminderCard, CustomTab, DataPanel,
    OverviewTab, TrendChart
```

## PWA

Installs as a standalone app via the manifest + apple-touch-icon meta tags.

## Deploy

Pushes to `main` trigger the monorepo workflow at `.github/workflows/deploy.yml`.
GitHub Pages serializes deploys — space related commits ~60s apart.

## Notes

- **No barcode scanner.** A barcode scanner + OpenFoodFacts lookup shipped briefly but was removed 2026-05-23 — wasn't pulling its weight. Use the Photo tab (dish identification) or Custom tab (manual entry) instead.
- The PhotoTab Worker URL is hardcoded in `PhotoTab.jsx`; the Worker forwards to the Gemini API with the model's API key.
