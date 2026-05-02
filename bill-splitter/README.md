# หารบิล — Thai Bill Splitter

A mobile-first Thai bill-splitting app with a built-in Sushiro plate calculator.

## Features

### หารบิล tab
- Add / remove members with avatar initials
- Add food items and assign them to specific people (or everyone)
- Optional VAT (7%) and Service Charge (10%)
- Per-person amount breakdown with visual proportion bars
- PromptPay number display + one-tap copy
- Bank account & notes fields
- Share summary (Line-friendly plain text via Web Share API)

### Sushiro tab
- Plate counter for all 5 colour tiers (Silver ฿40 → Blue ฿160)
- Adjustable number of people
- Optional VAT and Service Charge
- Large per-person display

## Tech stack

| Tool | Version |
|---|---|
| React | 18 |
| Vite | 5 |
| CSS Modules | (built-in) |
| uuid | 9 |

No UI library, no state manager — just hooks and CSS Modules.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
# output → dist/
```

## Deploy to GitHub Pages

1. In `vite.config.js`, add your repo name as the base path:

```js
export default defineConfig({
  plugins: [react()],
  base: '/LesProjets/',
})
```

2. `npm install -D gh-pages`

3. Add to `package.json` scripts:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

4. `npm run deploy`

5. GitHub repo → Settings → Pages → source: gh-pages branch.

## License

MIT
