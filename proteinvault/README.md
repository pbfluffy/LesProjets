# ProteinVault

A directory of shops selling protein bars in Bangkok — online and physical —
sorted by ฿ per gram of protein. **This is not a storefront.** There's no
cart, no checkout, no inventory. Every listing links out to the actual shop
(a "Visit shop" link for online stores, a "Directions" link for physical
ones). Built React + Vite, wired for Firebase (Firestore) and deployable to
Cloudflare Workers/Pages — same pattern as the LesProjets apps.

Visual design follows the shared LesProjets theme: warm paper background,
Noto Sans Thai + IBM Plex Mono, soft rounded surface cards, pill badges,
600px mobile-first shell, light/dark toggle via `data-theme` + plain-string
`localStorage["theme"]`. Accent color is a chili red (`#b8432f` light /
`#e0876a` dark) — distinct from Pumgoda's orange and Nutritions' teal.

**Not yet linked from the landing page** — standalone until you're ready.

## Status

Real Shopee listings are now in, fetched directly from Pumba's own
affiliate links (2026-07-12) — these already carry real affiliate tracking
params (`utm_medium=affiliates`, `mmp_pid=an_15377540429`), so they're
usable as-is, not placeholders:

- **FitWin** — new brand, 5 flavors, one Shopee listing. Country of
  origin, FDA registration numbers, and protein content all pulled
  directly from Shopee's own product-spec fields.
- **Musashi** — 8 new Shopee-sourced flavors added alongside the 3
  Tops-sourced ones already there. The "High Protein" line (45g protein)
  cross-confirms what Tops showed independently — good sign the data's
  solid. The "Deluxe" line's ฿890 price is an explicit near-expiry
  clearance price on Shopee, not a stable everyday price — don't treat it
  as one when this goes live.

Shop link resolution changed: each flavor's `shops` array can carry a
`url` per shop (a specific Shopee product page), which takes priority over
that shop's general `affiliateUrl`/`url`. Shopee's affiliate program is
per-product, not one link for the whole storefront, so this matches
reality. Shopee's button renders filled/accent ("Buy on Shopee ↗");
Tops/Villa Market render as plain outlined buttons ("Visit [shop] ↗").

Nutrend, FURI, and Kauai are still out — not confirmed at any of the three
scoped shops.

Two open items:
- Most non-Shopee pricing is still illustrative (Tops product pages don't
  show a figure; "price may vary by branch").
- Go On Protein's origin is still flagged as unconfirmed.

## Setup

```bash
npm install
npm run dev
```

## Going live, roughly in order

1. **Confirm shop/listing accuracy.** Verify prices, protein content, and
   which shop actually carries which bar — `listings.js` flags the one
   unconfirmed assignment (Musashi → Nutrition Depot) explicitly.
2. **Add more shops.** iHerb Thailand, Shopee, Gourmet Market, and
   independent gyms/health stores are all worth adding to `shops.js` — the
   model already supports online, physical, or both per shop.
3. **Wire up Firestore.** Fill in `src/firebase.js` with your project
   config, then create `listings` and `shops` collections matching the
   shapes documented there. `useListings.js` picks up Firestore data
   automatically — the fallback data disappears once `listings` has
   entries. (`shops.js` stays local/static for now since it's a much
   smaller, slower-changing dataset — move it to Firestore too if that
   changes.)
4. **Consider affiliate/referral links** if any of these shops run an
   affiliate program — a directory that also earns a small commission on
   click-through is a very different (and more sustainable) business than
   one that doesn't monetize at all.
5. **Link from the landing page + deploy.** Add the tile to the portfolio
   index when it's ready to be public; deploy the same way as the other
   Vite apps via `deploy.yml`.

## Structure

```
src/
  components/     UI pieces (Header, Hero, FilterBar, ListingTable)
  data/
    listings.js    products grouped by brand, each with a flavors[] array;
                    each flavor carries its own priceThb, proteinG, and
                    shops[] ({shopId, url?} — url is a specific listing
                    link, e.g. a real Shopee affiliate product page)
    shops.js       verified shop directory (online/physical/both), maps-link helper
    useListings.js Firestore fetch with local fallback
  firebase.js     Firebase config — fill in before going live
  hooks.js        useTheme() — same localStorage["theme"] pattern as the rest of the suite
  App.jsx         wiring: filter state, theme toggle, derived stats
  styles.css      theme tokens + components, matching shared/theme-tokens.css
```
