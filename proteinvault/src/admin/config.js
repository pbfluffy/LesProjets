// Single source of truth for who's allowed into the admin panel. The real
// enforcement is the Firestore security rules (see SEEDING.md) — this
// constant only drives the client-side UI (which screen to show after
// login). Anyone could edit this in a forked bundle; that changes nothing
// about what Firestore actually accepts.
export const ADMIN_EMAIL = 'YOUR_ADMIN_EMAIL'
