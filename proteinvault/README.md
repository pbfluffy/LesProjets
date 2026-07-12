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

Concept scaffold with real, sourced shop data (Nutrition Depot, Lazada
Thailand, Thai Sports Supplements, Kauai — all verified via web search, not
invented) but placeholder pricing on most listings. Two listings (Quest,
Nutrend) use real prices pulled from nutritiondepot.co.th at time of
writing; the rest need reconfirming before launch. See the comments at the
top of `src/data/listings.js` for exactly which is which.

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
    listings.js    placeholder+real catalog, ratio() and flagEmoji() helpers
    shops.js       verified shop directory (online/physical/both), maps-link helper
    useListings.js Firestore fetch with local fallback
  firebase.js     Firebase config — fill in before going live
  hooks.js        useTheme() — same localStorage["theme"] pattern as the rest of the suite
  App.jsx         wiring: filter state, theme toggle, derived stats
  styles.css      theme tokens + components, matching shared/theme-tokens.css
```
