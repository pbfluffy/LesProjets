# backyard-rampage

"Pumba's Backyard Rampage" — a browser game. Live: `/backyard-rampage/`. Published as-is (`deploy.yml` copies the folder).

- Files: `index.html` (the game), `balance.json` (tuning values), `assets/`, `thumb.jpg` (landing-page thumbnail).
- `index.html` contains loader markup named `__bundler_*`, i.e. it looks like **generated/bundled output**. Before
  hand-editing it, check whether a source exists elsewhere; otherwise make small, surgical edits and test in a browser.
- Prefer tuning gameplay through `balance.json` when a value lives there.
- Cross-device save sync and the all-time/challenge leaderboards are Firestore collections (`userGame`,
  `leaderboard`, `challengeBoard` in `firestore.rules`) — changing what the game writes can require a rule change,
  and leaderboard rules are intentionally strict against tampering.
- Preview with launch config `admin-static` → `http://localhost:5178/backyard-rampage/`.
