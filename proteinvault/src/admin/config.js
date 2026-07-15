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
