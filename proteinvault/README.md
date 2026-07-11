# ProteinVault

Multi-brand protein bar storefront for Bangkok, sorted by ฿ per gram of protein
instead of marketing copy. Built React + Vite, wired for Firebase (Firestore)
and deployable to Cloudflare Workers/Pages — same pattern as the LesProjets
apps.

Visual design follows the shared LesProjets theme: warm paper background,
Noto Sans Thai + IBM Plex Mono, soft rounded surface cards, pill badges,
600px mobile-first shell, light/dark toggle via `data-theme` + plain-string
`localStorage["theme"]`. Accent color is a chili red (`#b8432f` light /
`#e0876a` dark) — distinct from Pumgoda's orange and Nutritions' teal, kept
that way on purpose since it's a separate app identity.

**Not yet linked from the landing page** — standalone until you're ready.

## Status

Concept scaffold. Runs immediately with placeholder product data
(`src/data/products.js`). Nothing here is production-ready yet — no real
checkout, no real Firestore data, no real supplier relationships.

## Setup

```bash
npm install
npm run dev
```

## Going live, roughly in order

1. **Source real products.** Contact 2–3 local distributors (or Thai brands
   directly — Go On Protein, FURI) for wholesale pricing. Confirm they hold
   the FDA import paperwork already; you're reselling, not importing, as
   long as you're sourcing already-cleared stock.
2. **Wire up Firestore.** Fill in `src/firebase.js` with your project config,
   create a `products` collection matching the shape documented in that
   file, and `useProducts.js` will pick it up automatically — the fallback
   data disappears once the collection has entries.
3. **Business registration.** Standard Thai commercial registration for
   e-commerce, VAT registration once you cross the revenue threshold. Worth
   a short accountant consult before your first real sale, not before this
   point.
4. **Payments.** PromptPay QR + cash-on-delivery first — these cover the
   large majority of Thai online grocery/specialty purchases. Card
   processing (Omise/2C2P) can come after you've validated demand.
5. **Link from the landing page + deploy.** Add the tile to the portfolio
   index when it's ready to be public; deploy the same way as the other
   Vite apps via `deploy.yml`.

## Structure

```
src/
  components/     UI pieces (Header, Hero, FilterBar, ProductGrid, ProductCard)
  data/
    products.js     placeholder catalog + ratio() helper
    useProducts.js   Firestore fetch with local fallback
  firebase.js     Firebase config — fill in before going live
  hooks.js        useTheme() — same localStorage["theme"] pattern as the rest of the suite
  App.jsx         wiring: filter state, cart state, theme toggle, derived stats
  styles.css      theme tokens + components, matching shared/theme-tokens.css
```
