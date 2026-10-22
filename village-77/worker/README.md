# village-77 Worker

Cloudflare Worker for the village app (`../`):

- `POST /line-auth` — Sign in with LINE. Trades a LINE Login code for a Firebase custom token (uid `line:<LINE user id>`).
- `POST /upload` — stores a post photo in R2 (needs a Firebase ID token), returns its URL.
- `GET /p/<key>` — serves a stored photo.
- `GET /s/<postId>` — shared post link: og: tags for the LINE link preview, then forwards to the post in the app (LIFF).

Live at https://village-77.pbfluffygaming.workers.dev. Deploy with `npx wrangler deploy` from this folder.

## One-time setup for LINE sign-in

1. **LINE channel** — at https://developers.line.biz/console create a Provider, then a **LINE Login** channel (app type: Web app).
   - LINE Login tab → **Callback URL**: `https://pumbafluffycorgi.com/village-77/` (add `http://localhost:5184/village-77/` too for local testing).
   - Switch the channel from **Developing** to **Published**, or only you can sign in.
2. **Channel ID** (public) — put it in both `wrangler.toml` (`LINE_CHANNEL_ID`) and `../src/config.js`.
3. **Channel secret** — from this folder:
   ```bash
   npx wrangler secret put LINE_CHANNEL_SECRET
   ```
4. **Firebase service-account key** — Firebase console → Project settings → Service accounts → *Generate new private key*. Then:
   ```bash
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT < path/to/the-key.json
   ```
   and delete the downloaded file. Never commit it (`.gitignore` blocks the usual names).
5. `npx wrangler deploy`, then push the app.

Until steps 1–4 are done, `/line-auth` answers 503 and the app's sign-in sheet says LINE sign-in isn't switched on yet.

## Admins

Admins sign in with Google from the small link at the bottom of the home page. The site owner's uid is built in (`OWNER_UID` in `../src/config.js`); add more by creating a doc at `admins/{uid}` in Firestore.
