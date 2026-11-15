# village-77

Village community board: marketplace shops and local handymen, EN/TH, LINE-first. Live: `/village-77/`.
`worker/README.md` has the Worker and LINE-login setup.

## Layout

- `src/config.js` — constants incl. LINE channel ID and `OWNER_UID`. `src/liff.js` — LINE LIFF.
- `src/hooks/` — `useAuth` (Google + LINE), `usePosts`, `useCategories`, `useFavorites`, `useRatings`, `useBans`, `useStats`.
- `src/deals.js`, `freshness.js` (post age), `photo.js` (client-side image prep), `share.js`, `errorReport.js`,
  `adminLog.js`, `toast.js`.
- `worker/` (`village-77`, no package.json — run wrangler directly): `POST /line-auth` (LINE code → Firebase custom
  token, uid `line:<id>`), `POST /upload` (photo → R2 `village-77-photos`, needs Firebase ID token), `GET /p/<key>`,
  and `GET /s/<postId>` (share link with `og:` tags, routed at `pumbafluffycorgi.com/village-77/s/*`).

## Data & auth

- Firestore block "Village 77 — marketplace shops & handymen" in `firestore.rules`. Village keeps its **own member
  list** (`villageMembers`) and does not write `userProfiles`.
- Admins: Google sign-in from the link at the bottom of the home page; owner uid is built in, others are docs at
  `admins/{uid}`.
- LINE users sign in via the Worker; if `/line-auth` answers 503 the LINE secrets aren't set (see worker README).

## Gotchas

- Secrets (`LINE_CHANNEL_SECRET`, `FIREBASE_SERVICE_ACCOUNT`) are Worker secrets set with `wrangler secret put`;
  never commit a service-account key.
- The LINE channel must be **Published** (not Developing) or only its developer can sign in.
- Worker deploy is manual: `npx wrangler deploy` from `worker/`.
- Run the repo ESLint gate after edits (see root `CLAUDE.md`).
