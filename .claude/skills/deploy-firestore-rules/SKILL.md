---
name: deploy-firestore-rules
description: Deploy firestore.rules to the live pumgoda Firebase project safely. Use whenever a rules change must go live, or a new collection/synced field fails with permission-denied.
---

Rules are **not** deployed by the GitHub Pages workflow. This changes production data access for every app, so only
do it when the user asked for it (or approved it) in this conversation.

1. `git fetch origin` and decide what to deploy. Normally that is the rules on `origin/main`.
2. Check for unrelated uncommitted rule edits: `git diff firestore.rules`. The CLI deploys the **file on disk**,
   so a dirty working tree would publish someone's unfinished rules. If the tree is dirty, deploy from a clean copy:

   ```bash
   D=<scratchpad>/rules-deploy && mkdir -p "$D" && cd "$D"
   git -C <repo> show origin/main:firestore.rules > firestore.rules
   cp <repo>/firebase.json .
   npx --yes firebase-tools deploy --only firestore:rules --project pumgoda
   ```
   If the tree is clean and on the intended commit, run the last command from the repo root.
3. The CLI must already be logged in (`npx firebase-tools projects:list` should show `pumgoda`). If not, the user
   must run `firebase login` themselves.
4. Confirm the output says the rules compiled and were released, and tell the user exactly which rule blocks changed.
5. After deploying, note anything still undeployed (e.g. uncommitted rule edits on a feature branch) so it is redeployed
   when that work merges.
