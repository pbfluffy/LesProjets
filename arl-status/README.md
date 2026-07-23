# ARL Status · แอร์พอร์ต เรล ลิงก์

Best-effort service status for Bangkok's Airport Rail Link (Suvarnabhumi Airport Rail Link). There is **no official real-time API** for ARL — Asia Era One (the operator) only publishes updates via their Facebook page, station staff, or the call centre. This app instead watches recent news coverage and flags likely disruptions, so it's a heads-up, not a guarantee — always confirm with the official sources linked in the app before a time-sensitive trip.

Live: https://pumbafluffycorgi.com/arl-status/

## How it works

1. The worker fetches Google News RSS for "Airport Rail Link" (English) and "แอร์พอร์ตเรลลิงก์" (Thai) — one feed that already aggregates Bangkok Post, Nation Thailand, Thaiger, etc., so no scraping or per-outlet integration is needed.
2. It keeps only articles from the last 36 hours and scans the most recent one for disruption keywords (derail, delay, suspend, ตกราง, ขัดข้อง, ...) vs resume keywords (resume, full service, กลับมาให้บริการปกติ, ...).
3. Result is cached in KV for 5 minutes (so repeat page loads don't re-hit Google News), and the last classified status is kept in KV indefinitely so the worker can report `statusChanged` — this is what a scheduled check uses to know when to alert.
4. The frontend shows a status badge, the matched headlines, and links to the real sources (Facebook page, call centre) for confirmation.

## Stack

- React 18 + Vite, `vite-plugin-pwa` for install support — same as every other app on this site.
- No auth, no database — the app is entirely driven by the worker's single GET endpoint.
- Worker: Cloudflare Workers + one KV namespace (cache + last-known-status), no secrets required (Google News RSS needs no API key).

## Local development

Frontend:
```bash
cd arl-status
npm install
cp .env.example .env.local   # points at the local worker by default
npm run dev
```

Worker:
```bash
cd arl-status/worker
npm install
npm run dev   # wrangler dev, http://localhost:8787
```

## One-time setup (deploy)

1. `cd arl-status/worker && wrangler kv namespace create ARL_STATUS_KV`, paste the returned id into `wrangler.toml`.
2. `npm run deploy` (from `arl-status/worker`) to publish the worker; note its `*.workers.dev` URL.
3. Set the `VITE_ARL_STATUS_WORKER_URL` GitHub Actions secret to that URL, so the built frontend bakes it in.
4. Push to `main` — the existing `deploy.yml` workflow builds and publishes the frontend.
5. Optionally, set up a recurring scheduled check (e.g. via Claude Code's `schedule` skill) that calls the worker's GET endpoint periodically and sends a push notification when the response's `statusChanged` is `true`.

## What's out of scope for v1

- Anything finer-grained than "a real incident made the news" — minor delays that never get reported won't show up here.
- Train positions / live map — no such feed exists publicly.
- A guarantee of correctness — the keyword classifier is a heuristic, not a parser of an authoritative feed.
