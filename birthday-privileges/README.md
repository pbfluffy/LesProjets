# Birthday Month Privileges — Thailand

Curated list of Thai brands' birthday-month member privileges (สิทธิพิเศษเดือนเกิด). Not linked from the main landing page — reachable directly at its own URL.

Live: https://pumbafluffycorgi.com/birthday-privileges/

## Status

This is deliberately a **short, hand-checked list**, not an attempt at a comprehensive database. The Lemon8/TrueID-style roundups (`16 ร้านดัง`, `22 ร้านบุฟเฟ่ต์`, etc.) that inspired this app include a lot of stuff that turned out to be dead campaign pages, years-stale "official" posts, or boutique brands whose only documentation is "message us on Facebook for details." Building a comprehensive list means including that noise; this app doesn't.

Every entry in `src/data/privileges.js` was checked by hand, one brand at a time, against the brand's own site/app/social account — no scraping, no aggregator content copied in. Each entry carries:

- `confidence: 'official'` — a dated, structured page on the brand's own domain states the terms directly (e.g. Starbucks Rewards FAQ, Sizzler's member benefits table).
- `confidence: 'social'` — confirmed via the brand's own official social account (verified TikTok/Facebook page), but no static webpage states the same terms, so it's less re-checkable.
- `lastVerified` — the date it was checked. `sourceUrl` — where to re-check it.

Each entry also carries a hand-set `tier` (`SSS`/`S`/`A`/`B`) reflecting how free the privilege actually is end-to-end — both whether the item itself costs money, and what it takes to become eligible (see `TIERS` in `src/data/privileges.js` for the scale, and each entry's `tierReason` for the specific reasoning).

### Research log (as of 2026-08-08)

~35 brands checked across three rounds. Only 6 made the cut:

**Included:** Starbucks Thailand, MK Restaurant, Sizzler, Greyhound Café (all `official`); Café Amazon, McDonald's Thailand (`social`).

**Checked and dropped** — worth recording so a future re-check doesn't waste time on the same dead ends:
- **The Pizza Company** — dedicated birthday campaign page (`hbd.1112pizza.com`) no longer resolves.
- **Pizza Hut Thailand** — a search summary claimed a birthday breadstick reward, but the official Hut Rewards page (checked directly, full FAQ read) never mentions birthday anything — that claim doesn't hold up for the Thailand program specifically.
- **S&P** — official promo post exists but is dated Jan 2022 and image-only, no live text terms.
- **Texas Chicken Thailand** — the chain closed all Thailand branches (Sept 2026), moot regardless of any historical privilege.
- **KFC Thailand, Oishi Group, After You, Fuji, Black Canyon, Auntie Anne's, Inthanin, Dunkin' Thailand, Chester's, Mister Donut, Din Tai Fung, Yoshinoya, Mo-Mo-Paradise, True Coffee, CoCo Ichibanya, Coffee World, Baskin Robbins, bb.q Chicken Thailand, Cha Tra Mue, Aroi Dee** — no birthday-month privilege found on any official page (Dunkin's own member-card page was outright broken).
- **Swensen's, Bonchon, Krispy Kreme** — privilege may exist but only via app-exclusive or boutique/Facebook-only sourcing, not independently verifiable.
- **Dairy Queen, Yayoi** — conflicting claims across sources with no single authoritative page to resolve them.

Re-check `lastVerified` dates periodically — every brand here can and does change terms without notice (see MK's own discounted price varying across differently-dated official pages).

## Stack

React 18 + Vite, `vite-plugin-pwa` for install support — same as every other app on this site. No backend, no auth: it's a static build over a local data file.

## Local development

```bash
cd birthday-privileges
npm install
npm run dev
```

## Deploy

Built and copied to `_site/birthday-privileges/` by the root `.github/workflows/deploy.yml` on every push to `main` — no separate setup needed.
