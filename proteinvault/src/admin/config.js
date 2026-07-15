// Single source of truth for who's allowed into the admin panel. The real
// enforcement is the Firestore security rules (see SEEDING.md) — this
// constant only drives the client-side UI (which screen to show after
// login). Anyone could edit this in a forked bundle; that changes nothing
// about what Firestore actually accepts.
//
// Read from a build-time env var rather than hardcoded here, since this
// repo is public. Set VITE_ADMIN_EMAIL in .env.local (gitignored) for
// local dev, and in your deploy platform's environment variable settings
// (e.g. Cloudflare Pages → Settings → Environment variables) for
// production — see .env.example. An unset/empty value means no account
// can ever pass the client-side check, which fails closed.
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''

// Base URL of the standalone Cloudflare Worker (see worker/) that backs
// the Shopee/Villa Market import buttons in FlavorForm — deployed
// separately from this site, since GitHub Pages can't run serverless
// functions at all. Not a secret (it only proxies public product data,
// same as the Firebase config above), but the actual URL is tied to your
// Cloudflare account's workers.dev subdomain, so — same reasoning as
// VITE_ADMIN_EMAIL — it's a build-time env var rather than hardcoded here.
// Set VITE_IMPORT_WORKER_URL in .env.local for local dev and in your
// deploy platform's env settings for production, to whatever URL
// `wrangler deploy` prints after deploying worker/ (see README). Empty
// means the import buttons just always fail closed to manual entry.
export const IMPORT_WORKER_URL = import.meta.env.VITE_IMPORT_WORKER_URL || ''
