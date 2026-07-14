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

## Full nutrition fields (2026-07-12)

Added `calories`, `carbsG`, `fatG`, `sugarG` as optional per-flavor fields —
price-per-protein is a real differentiator, but people eating protein bars
check the rest of the label too. None of the existing 23 flavors have this
data yet; it backfills gradually as real product links come in, same as
everything else in this catalog. `formatMacros()` only shows whatever
fields actually exist for a given flavor — no blanks, no zeros for data we
don't have.

## UI overhaul (2026-07-12)

Responded to feedback that the UI felt cluttered, especially on mobile:

- **Removed the dev-note footer line** ("not linked from pumbafluffycorgi.com
  yet") — that was an internal note, not something a visitor should see.
- **Mobile now gets a card list, not a squeezed table.** The 7-column table
  was being forced into phone-width screens with horizontal scroll — that
  was very likely the actual root cause of "cluttered" and "mobile view
  specifically." Below 680px width, products render as cards (flag, brand,
  flavor count, price summary, tap to expand); at 680px and up, the table
  layout still applies, but decluttered from 7 columns to 5 (Origin and
  Brand merged into one identity cell — flag + name + flavor count/country
  as a caption underneath, instead of a separate column).
- **Stat row is a proper grid now**, not a horizontal-scroll strip of pills
  — 2 columns on small screens, 4 once there's room.
- Tightened spacing/hierarchy throughout (hero, filters, cards) and removed
  a chunk of dead CSS left over from an earlier design iteration that
  wasn't being used anymore.

Stayed within the shared LesProjets visual system throughout (warm paper,
Noto Sans Thai + IBM Plex Mono, chili red accent) — this was a structural
and spacing pass, not a new aesthetic direction.

**Note on verification**: I checked this by cross-referencing every CSS
class used in the component against the stylesheet (all matched), and
confirmed the build compiles clean with correct relative asset paths. I
could not visually preview it in an actual browser before handing it off —
worth a careful look once deployed, and flag anything that looks off.

## Production-grade pass (2026-07-12)

- **Error boundary** — a JS runtime error anywhere in the app now shows a
  real "something went wrong, reload" screen instead of going blank with
  no explanation. Doesn't fix the vite base-path class of blank-page bug
  from earlier (that was a build config issue, not a runtime error), but
  covers every other way this could go blank in production.
- **Broken images handled gracefully** — flag images (flagcdn.com) and
  shop icons (Google's favicon service) are both fetched from third-party
  services outside our control; if either fails to load, the broken-image
  icon is now hidden instead of showing the browser's default broken-image
  placeholder.
- **Keyboard accessibility** — the expandable product rows and filter
  chips were mouse-only (`<div onClick>`), unreachable by keyboard and
  invisible to screen readers. Filter chips are now real `<button>`s;
  product rows have `role="button"`, `tabIndex`, `aria-expanded`, and
  Enter/Space support; icon-only shop buttons (which had no visible text)
  now have `aria-label`s so screen readers can announce them.
- **Favicon + Open Graph tags** — was using the browser default icon and
  had no link-preview metadata; both added.

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

Correction made this round: **Go On Protein's country was wrong.** It was
flagged as unconfirmed, possibly Thai; Tops' own product page explicitly
lists "Poland" as country of origin, so it's corrected to Poland
(`countryCode: 'PL'`) and the `thai-made` tag removed. Also added a real
confirmed price (Peanut and Chocolate, ฿70/pc at Tops, currently out of
stock there).

One open item remains: most non-Shopee pricing is still illustrative
(Tops product pages mostly don't show a figure; "price may vary by
branch" — Go On's prices are the exception, both now confirmed).

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

## Admin panel

`#/admin` (hash-only, not linked from public nav) is a small in-app admin
tool that replaces hand-editing `listings.js` + running `seed.js` + poking
around the raw Firestore Console. It writes straight to Firestore.

- **Auth**: Firebase Auth with Google as the sign-in provider — no password
  to create or manage, since you're signing in with an existing Google
  account. One-time setup you do yourself in the Firebase Console (no
  service-account key is used anywhere in this project, so nothing here can
  do this for you):
  1. Authentication → Sign-in method → enable **Google** (Firebase
     auto-fills the OAuth config; no separate Google Cloud Console step
     needed for this).
  2. Firestore → Rules → publish the rules block below → Publish.
  3. Sign in at `#/admin` with the Google account whose email matches
     `YOUR_ADMIN_EMAIL` below — there's no separate "add user" step, the
     Firestore rule is what actually grants access.
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isAdmin() {
        return request.auth != null
          && request.auth.token.email == 'YOUR_ADMIN_EMAIL';
      }
      match /products/{productId} {
        allow read: if true;
        allow write: if isAdmin();
      }
      match /shops/{shopId} {
        allow read: if true;
        allow write: if isAdmin();
      }
      match /{document=**} {
        allow read: if false;
        allow write: if false;
      }
    }
  }
  ```
  Set your real admin email in `src/admin/config.js` (replace
  `YOUR_ADMIN_EMAIL`) and keep the Firestore rule above in sync with it —
  client-side email checks are convenience UI only; the rule is the real
  gate. Both are placeholders in this repo on purpose, not filled in with a
  real address, since this repo is public.
- **Brand/flavor CRUD**: list brands, add a brand, add/edit/remove a flavor
  (price, protein, optional macros, shops). Flavors are an array embedded
  on each brand's Firestore doc, so saving a brand writes the whole doc.
- **Shopee import** (optional, inside the flavor form): paste a Shopee
  product or `s.shopee.co.th` link, hit Fetch. Pre-fills name/price/image —
  the fields Shopee's own page exposes as structured data. It does **not**
  auto-fill protein/macros/country; those live in inconsistent freeform
  seller text, and this project's own sourcing notes (see `listings.js`)
  are proof that guessing at them is worse than typing them in. The
  listing's raw attribute text is shown next to those fields instead, for
  glance-and-type. Backed by `functions/api/fetch-shopee.js`, a Cloudflare
  Pages Function that talks to an **unofficial, undocumented** Shopee
  endpoint — it can break without notice; the form degrades to fully
  manual entry on any fetch failure.
- **Re-verification staleness**: every flavor save stamps a timestamp; the
  dashboard surfaces flavors untouched for 90+ days at the top, so
  re-checking prices happens as part of normal admin visits. No scheduled
  job — that'd need a separate Worker + cron trigger, deliberately out of
  scope for now.
- To test the Shopee-import Function locally (it's a Cloudflare Pages
  Function, not part of the Vite dev server): `npx wrangler pages dev` per
  Cloudflare's docs for pairing Pages Functions with an external dev
  server. Not required just to work on the rest of the admin UI.

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
  admin/          admin panel (#/admin) — see "Admin panel" above
  firebase.js     Firebase config — fill in before going live
  hooks.js        useTheme() — same localStorage["theme"] pattern as the rest of the suite
  App.jsx         wiring: filter state, theme toggle, derived stats
  styles.css      theme tokens + components, matching shared/theme-tokens.css
functions/
  api/fetch-shopee.js   Cloudflare Pages Function backing the admin's Shopee import
```
