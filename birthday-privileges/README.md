# Birthday Month Privileges — Thailand

Curated checklist of Thai brands' birthday-month member privileges (สิทธิพิเศษเดือนเกิด). Not linked from the main landing page — reachable directly at its own URL.

Live: https://pumbafluffycorgi.com/birthday-privileges/

## What this app does

A single-page checklist: for each brand, what you get, what it costs to be eligible, how to claim it, and how sure we are the info is current. No backend, no accounts, no build-time data fetching — it's a static site rendering a hand-maintained list in `src/data/privileges.js`.

### Features (all in `src/App.jsx`)

- **TH/EN toggle** — top-right button, default language is Thai (`useLang` hook, persisted to `localStorage` under `birthday_privileges_lang`). Every string in the app, including each data entry's text fields, is bilingual.
- **Light/dark theme toggle** — top-right button, shares the site-wide `theme` `localStorage` key with every other app on the origin (`useTheme` hook), so switching theme here carries over to other apps and vice versa.
- **Category filter chips** — "All" plus one chip per category in `CATEGORIES` (see Data model below).
- **Brand search** — plain substring match on `brand`, case-insensitive.
- **Checklist grouped by tier** — entries are grouped under tier headings (SSS → S → A → B, see Tiers below), each a colored pill. Within a filtered/searched view, empty tier groups are hidden entirely.
- **Checkbox per entry** ("claimed it") — click to strike through the row. See "Checklist behavior" below for exactly how this is stored.
- **Expandable detail** — click a row (or its ▼/▲ button) to reveal membership requirement, how to claim, the tier's reasoning for *this* entry, a confidence badge, a link to the source, and the last-verified date. Collapsed by default so the top-level view stays scannable.
- **Brand logo** — a small mark next to each row. Fetched at render time from Google's public favicon service (`google.com/s2/favicons?domain=...`), keyed off the entry's `domain` field. No logo images are stored in this repo — nothing to source or license per brand. Entries without a confirmed `domain` (or where the favicon fails to load) fall back to a plain colored circle with the brand's first letter, rather than guessing a domain or leaving a broken image. See `BrandLogo` in `App.jsx`.

### Checklist behavior (no accounts)

The "claimed it" checkboxes are stored in `localStorage` (key `birthday_privileges_checked`, see `useLocalStorage` in `App.jsx`) — there is no login and no backend, so state is **per-device, per-browser only**. Anyone who opens the page can check items off, but nothing is shared or synced: a box checked on one phone won't show as checked on a laptop or for any other visitor, and there's no way to see or aggregate anyone else's progress. Clearing site data/localStorage resets it. If cross-device sync or a shared/social checklist is ever wanted, that requires adding real accounts + a backend, which this app deliberately doesn't have today.

## Data model

Everything lives in `src/data/privileges.js`, in the `privileges` array. Each entry:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Unique slug, used as React key and the checklist's localStorage identity |
| `brand` | string | Display name |
| `domain` | string, optional | Brand's own official website, used to fetch a favicon-based logo (see Features above). Omitted rather than guessed when no confirmed domain was found |
| `category` | string | One of `CATEGORIES` (see below) |
| `item` | `{th, en}` | What you actually get — the one-line checklist summary |
| `tier` | `'SSS'\|'S'\|'A'\|'B'` | Hand-set, see Tiers below |
| `tierReason` | `{th, en}` | Why this entry got that tier — shown in the expanded detail |
| `gate` | `{th, en}` | Membership requirement / eligibility condition |
| `howToClaim` | `{th, en}` | Redemption mechanics |
| `confidence` | `'official'\|'social'` | See Confidence below |
| `lastVerified` | `'YYYY-MM-DD'` | Date this entry was last hand-checked |
| `sourceUrl` | string | Link to re-verify |
| `sourceLabel` | string | Human-readable source description (e.g. "Starbucks Rewards — official FAQ") |

**Categories** (`CATEGORIES` export): `cafe`, `restaurant`, `buffet`, `fastfood`, `entertainment`, `wellness`. `entertainment` and `wellness` were added later (Major Cineplex, Let's Relax Spa) — this app isn't strictly food/drink, just "birthday privileges in Thailand" generally. Add a new category by appending to `CATEGORIES` and adding a label to both `STRINGS.th.category` and `STRINGS.en.category` in `App.jsx`.

### Tiers (`TIERS` export)

Reflects how free the privilege actually is end-to-end — both whether the item itself costs money, and what it takes to become eligible. This is a **hand-made judgment call per entry**, not a formula computed from other fields — kept explicit so the reasoning is visible and reviewable in the data itself (see each entry's `tierReason`).

| Tier | Color | Meaning |
|---|---|---|
| SSS | green | Actually free, no strings — free item, free membership, no spend threshold |
| S | blue | Free item, but a small paid shortcut exists (e.g. a one-time paid card that skips a spend requirement) |
| A | amber | Free item, but reaching eligibility needs a real spend threshold — no paid shortcut |
| B | red | Not actually free — it's a discounted price or member discount, you still pay |

### Confidence

- `'official'` — a dated, structured page on the brand's own domain states the terms directly (e.g. Starbucks Rewards FAQ, Sizzler's member benefits table).
- `'social'` — confirmed via the brand's own official social account (verified TikTok/Facebook post), but no static webpage states the same terms, so it's less re-checkable.

## Status & research methodology

This is deliberately a **short, hand-checked list**, not an attempt at a comprehensive database. The Lemon8/TrueID-style roundups (`16 ร้านดัง`, `22 ร้านบุฟเฟ่ต์`, etc.) that inspired this app include a lot of stuff that turned out to be dead campaign pages, years-stale "official" posts, or boutique brands whose only documentation is "message us on Facebook for details." Building a comprehensive list means including that noise; this app doesn't.

Every entry was checked by hand, one brand at a time, against the brand's own site/app/social account — no scraping, no aggregator content copied in.

### Research log (as of 2026-08-08)

~105 brands checked across eleven rounds. 14 made the cut:

**Included:** Starbucks Thailand, MK Restaurant, Sizzler, Greyhound Café, Major Cineplex (M GEN), Let's Relax Spa, Dream World (all `official`); Café Amazon, McDonald's Thailand, Oh! Juice, Potato Corner, Suki Teenoi, Burger King Thailand, CHAGEE Thailand (`social`).

Dream World is the strongest SSS-tier find yet: a fully free theme park ticket (worth 800฿) on your actual birthday, with just a free 1-day-advance registration and an ID check — no membership card, no spend threshold anywhere in the pipeline.

Major Cineplex and Let's Relax Spa are the first non-food/drink entries — added new `entertainment` and `wellness` categories. Worth a flag on Major Cineplex: the clearest official terms page for it is dated through 2019, but a separate, undated policy-change notice for the First Class tier confirms the program is still actively maintained, not abandoned — see the entry's `gate` field for the full reasoning.

**Checked and dropped** — worth recording so a future re-check doesn't waste time on the same dead ends:
- **The Pizza Company** — dedicated birthday campaign page (`hbd.1112pizza.com`) no longer resolves.
- **Pizza Hut Thailand** — a search summary claimed a birthday breadstick reward, but the official Hut Rewards page (checked directly, full FAQ read) never mentions birthday anything — that claim doesn't hold up for the Thailand program specifically.
- **S&P** — official promo post exists but is dated Jan 2022 and image-only, no live text terms.
- **Texas Chicken Thailand** — the chain closed all Thailand branches (Sept 2026), moot regardless of any historical privilege.
- **Jones Salad** — checked their own site directly (jonessalad.com/promotion/, full nav); no membership or birthday terms page exists there at all. The 15% birth-month claim traces only to third-party aggregators referencing a LINE-only announcement.
- **Ohkajhu (โอ้กะจู๋)** — Family Card birthday privilege is repeatedly described by third parties, but the parent company site (okjgroup.com) is corporate-only with no consumer terms; benefit appears to live entirely inside their app, unverifiable from here.
- **Au Bon Pain Thailand** — ABP Privilege Card exists (points-based), but no birthday-specific terms found anywhere official; their promotions page was empty.
- **Sukishi (Korean BBQ)** — third-party sources describe a VIP birthday discount, but the brand's own `sukishigroup.com/Sukishi/privilege/` page is dead (404), and their member portal (sukishiclub.com) is login-gated with no public terms.
- **ZEN Japanese Restaurant** — found the exact terms (15% birthday discount) on their own official Facebook post, but it's dated **9 March 2014** — 12 years stale, dropped rather than trust it's still current.
- **Santa Fe' Steak** — a search summary claimed a 15% birthday discount, but the only official promo found (199฿ member card) has no birthday-specific terms and has already expired.
- **Tenya** — the tempura chain closed all Thailand locations after 10 years, moot regardless of any historical privilege.
- **Hachiban Ramen, Bourbon Street, Five Star Chicken (ไก่ห้าดาว), KAMU Tea, AKA Yakiniku, Daniel Thaiger, Cinnabon Thailand, Somboon Seafood, Savoey Seafood, Nana Coffee Roasters** — no birthday-month privilege found on any official page.
- **SF Cinema** — third-party sources consistently describe a birthday free-movie perk (parallel to Major Cineplex's M GEN), but every official page found returned a 404, the app subdomain refused to load, the Facebook photo post is login-walled, and even a direct WebFetch hit an SSL certificate error. Real signal, no primary source I could actually verify — left out despite the strong corroboration.
- **B2S Club** — has a genuine official birthday page, but the specific offer found (10x points) is a one-off expired May–June 2024 campaign, not a standing benefit, and points aren't equivalent to a free item anyway.
- **Watsons Thailand, Boots Thailand** — Boots' own official Twitter/X mentions a 10% birthday discount, but no dated page could be found stating current terms; Watsons had no birthday-specific info found at all.
- **A&W Thailand, Ootoya, Mont Nomsod, EVEANDBOY** — no birthday-month privilege found on any official page (EVEANDBOY's own terms page exists but the birthday section content didn't render/extract; a follow-up direct check may be worth it).
- **Carl's Jr Thailand** — closed all Thailand locations in March 2022, moot.
- **Safari World** — third-party sources exist but the official ticketing site (ticket.safariworld.com) only rendered a near-empty shell; no birthday content could be confirmed this session.
- **Haidilao Thailand** — the widely-shared "free birthday shrimp" claim traces to a single-branch promo (explicitly "เฉพาะที่ Haidilao Central Pinklao เท่านั้น" in the source post), not a Thailand-wide company policy — dropped as too narrow to present as a general Haidilao privilege.
- **Sushiro Thailand, Yenly Yours, TEA65, Fuku Cha/Fuku Matcha** — third-party sources describe birthday coupons (Fuku Matcha specifically: a 100฿ coupon), but no official page or social post could be directly verified for any of them.
- **Dairy Queen (re-checked)** — a Nov 2024 aggregator compilation gives more specific terms (free Quart Blizzard, 259฿ value, with 100฿+ purchase) than what was found before, but still no official DQ page/post directly verified — stays dropped pending that direct confirmation.
- **BOOST, Thank You Cup, Self. Smoothie** — appeared in the same Nov 2024 aggregator compilation with specific birthday-drink claims, not yet individually verified against an official source.
- **KFC Thailand, Oishi Group, After You, Fuji, Black Canyon, Auntie Anne's, Inthanin, Dunkin' Thailand, Chester's, Mister Donut, Din Tai Fung, Yoshinoya, Mo-Mo-Paradise, True Coffee, CoCo Ichibanya, Coffee World, Baskin Robbins, bb.q Chicken Thailand, Cha Tra Mue, Aroi Dee, Lotteria (not in Thailand), Jollibee Thailand, Subway Thailand, Domino's Pizza Thailand, Wingstop Thailand (opened Dec 2025, too new), Coca Suki, Shabushi, Gyu-Kaku, BarBQ Plaza, Peppina, iberry, Kyochon Thailand, Emack & Bolio's, Cold Stone Creamery, Ippudo Thailand, Erawan Tea Room, Kub Kao' Kub Pla, The Coffee Club, Wine Connection** — no birthday-month privilege found on any official page (Dunkin's own member-card page was outright broken).
- **Swensen's, Bonchon, Krispy Kreme** — privilege may exist but only via app-exclusive or boutique/Facebook-only sourcing, not independently verifiable.
- **Dairy Queen, Yayoi** — conflicting claims across sources with no single authoritative page to resolve them.

**Not yet decided — flagged for a scoping call, not dropped:** Lotus's own loyalty page (`my.lotuss.com/articles/birthday-promo-my-lotus-restaurants/th`) lists ~18 partner restaurants with precise, dated, official birthday terms (several fully free items, no spend threshold: e.g. a free 500฿ cake at ภัตตาคาร เลอค็อกดอร์). It's a legitimately citable official source, but the restaurants are mostly small regional chains rather than the recognizable multi-branch national brands this list has focused on so far, and claiming requires *myLotus's* membership — a separate loyalty system from the restaurant itself. Left out of the main list pending a decision on whether that fits this app's scope.

Re-check `lastVerified` dates periodically — every brand here can and does change terms without notice (see MK's own discounted price varying across differently-dated official pages). Also worth flagging: Suki Teenoi's actual terms turned out stricter than third-party summaries suggested — the "free membership" claim was true, but reaching even its lowest qualifying tier requires ~13,800฿ of spend within a calendar year, which only surfaced by reading the brand's own dated Facebook post in full rather than trusting the paraphrase.

## Stack

React 18 + Vite, `vite-plugin-pwa` for install support — same as every other app on this site.

## Local development

```bash
cd birthday-privileges
npm install
npm run dev
```

## Deploy

Built and copied to `_site/birthday-privileges/` by the root `.github/workflows/deploy.yml` on every push to `main` — no separate setup needed.
