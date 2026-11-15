---
name: card-perks
description: Run, verify and ship changes to card-perks (login-gated credit-card privilege checker). Use when editing anything under card-perks/.
---

Read `card-perks/CLAUDE.md` first.

## Run
`preview_start` with name `card-perks` (port 5185) → `http://localhost:5185/card-perks/`.
Without a signed-in user you only see the login gate. Signing in needs the user's own Google account — ask them to
do it in the browser pane rather than handling credentials.

## Verify
- Logic: `cd card-perks && npm test` (filters, normalisation, expiry). Add a test for every new filter rule in
  `src/perks.test.js` before touching the UI.
- UI (signed in): add a card from a template, add/edit/delete a privilege, then check each filter in the Check tab:
  category chips, points (any / no points / points required), no-minimum-spend, card, search, hide expired.
- Reload to confirm data persists (Firestore `userCards/{uid}`); sign out/in to confirm the gate returns.
- Privacy: no field may ask for card number, expiry or CVV.

## Ship
1. `npm test` and `npm run build`, then the ESLint `no-undef` gate (root `CLAUDE.md`).
2. Deploy `firestore.rules` **before** relying on the app live (skill `deploy-firestore-rules`); then merge to `main`.
