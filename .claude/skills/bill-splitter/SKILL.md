---
name: bill-splitter
description: Run, verify and ship changes to the bill-splitter app (Thai bill splitter, PromptPay QR, Sushiro counter). Use when editing anything under bill-splitter/ or its og-meta Worker.
---

Read `bill-splitter/CLAUDE.md` first.

## Run
`preview_start` with name `bill-splitter` (port 5174) → open `http://localhost:5174/bill-splitter/`.
For a production-build check use `bill-splitter-prod-preview` (port 5183) after `npm run build`.

## Verify
- Money changes (`billMath.js`, `money.js`): try a bill with VAT 7% + service 10%, an item split among a subset,
  and confirm per-person shares sum to the total. Check both EN and TH.
- PromptPay changes: confirm the QR still renders for a phone-number payee **and** a `bank:` payee.
- Share/URL changes: open a `?d=` link produced before your change — old links must still decode.
- Check the console and `read_console_messages` for errors; try dark and light theme.

## Ship
1. `npm run build` in `bill-splitter/`, then the ESLint `no-undef` gate from the root `CLAUDE.md`.
2. Frontend: merge to `main` (Pages deploy). Worker (`bill-splitter/worker`): separate manual `npx wrangler deploy`
   (skill `deploy-worker`). New synced Firestore field: update + deploy rules (skill `deploy-firestore-rules`).
