# Bill Splitter

Mobile-first Thai bill-splitting app with a Sushiro plate-counter tab. Part of [pbfluffy/LesProjets](https://github.com/pbfluffy/LesProjets), live at [pumbafluffycorgi.com/bill-splitter/](https://pumbafluffycorgi.com/bill-splitter/).

## Two tabs

### หารบิล (Bill Splitter)

- Add / remove members with avatar initials
- Add food items, assign each item to a subset of members (or everyone)
- Optional VAT 7% and Service Charge 10%
- Per-person breakdown with proportion bars
- **Per-person PromptPay QR** — each person gets their own scan-to-pay QR for their exact share, built from a configurable PromptPay payload (`react-qr-code`)
- **Bill history** — save a bill, browse and reload past bills (`useBillHistory` hook, `BillHistory` panel)
- **Share-as-image** — snapshot the result with `html2canvas` and share via the Web Share API
- Bank account and notes fields, plain-text share to Line

### Sushiro

Plate counter for the actual Sushiro Thailand colour tiers:

| Plate  | Price |
|--------|------:|
| White  | ฿30   |
| Red    | ฿40   |
| Silver | ฿60   |
| Gold   | ฿80   |
| Black  | ฿100  |

- Per-person plate counters
- Per-person snacks (free-text item + price)
- Optional VAT and Service Charge
- Share summary as text or image

## Stack

- React 18, Vite 5
- CSS Modules
- `LangContext` for EN/TH (default: EN) — toggle from the header
- `uuid` for stable list keys
- `react-qr-code` for PromptPay QRs
- `html2canvas` for share-as-image
- `localStorage` for theme, language, and bill history — no backend

## Storage

- `bill-splitter.history` — saved bills
- `theme` — `"dark"` | `"light"` (shared across all apps on the origin; **never JSON-encode**)
- `bill-splitter.lang` — `"en"` | `"th"`

## Dev

```bash
cd bill-splitter
npm install
npm run dev       # http://localhost:5173/LesProjets/bill-splitter/
npm run build
npm run preview
```

To build for the root of a custom domain instead of the GitHub Pages sub-path:

```bash
VITE_BASE=/ npm run build
```

## Deploy

Pushes to `main` trigger the monorepo workflow at `.github/workflows/deploy.yml`,
which builds all three Vite apps and publishes them to GitHub Pages.
GitHub Pages serializes deploys — when committing several related files,
space commits ~60s apart so each build finishes before the next starts.

## PWA

Installs as a standalone app on iOS / Android via the manifest + apple-touch-icon meta tags in `index.html`.
