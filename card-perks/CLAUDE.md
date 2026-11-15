# card-perks

Login-gated credit-card privilege checker. Users add cards and the privileges each has, then filter across all
of them by category, points required or not, minimum spend, card, search and expiry. Live: `/card-perks/`.

## Layout

- `src/perks.js` — **pure** filter/normalise logic (`filterPerks`, `cleanPerk`, `isExpired`). Put rules here so
  they stay unit-testable: `npm test` (`node --test src/perks.test.js`).
- `src/categories.js`, `templates.js` — category list; generic **example** starter cards (not real issuer data —
  keep them labelled "(example)").
- `src/useCards.js` — loads/saves one Firestore doc, `userCards/{uid}` = `{ cards: [...], lastModified }`.
- `src/components/` — `LoginGate` (Google sign-in; nothing renders without it), `CheckerView` (filters + results),
  `CardsView` (cards CRUD), `PerkForm`.
- Plain CSS in `src/index.css` on top of `shared/theme-tokens.css`. English only. No PWA, no Worker.

## Data & privacy rules

- **Never store card numbers, expiry dates or CVVs** — only name, nickname, network and perks. The UI says so; keep it so.
- Firestore rule `userCards/{uid}` is owner-only (not even admins) and caps `cards` at 30. `MAX_CARDS`/`MAX_PERKS`
  in `CardsView.jsx` must stay within the rule/doc size limits.
- The whole card list is rewritten on each change (`persist`); fine at this size, revisit if perks grow large.

## Gotchas

- Deploy order: **deploy the Firestore rules before the app is usable** (see root `CLAUDE.md`).
- Dev server needs a real Google sign-in to see anything past the gate.
- Run the repo ESLint gate after edits (see root `CLAUDE.md`).
