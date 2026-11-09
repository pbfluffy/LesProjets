# Cloudlingo

Bite-sized daily lessons for AWS certifications:

- **Foundational:** CLF-C02 (Cloud Practitioner) and AIF-C01 (AI Practitioner)
- **Associate:** SAA-C03 (Solutions Architect), DVA-C02 (Developer), SOA-C03 (CloudOps Engineer), and DEA-C01 (Data Engineer)

## Run

```bash
node server.js
```

Then open http://localhost:5173. No dependencies or build step are needed.

## Online version

Live at **https://pumbafluffycorgi.com/cloudlingo/**. It's hosted with your other apps in the `pbfluffy/LesProjets` repo, in the `cloudlingo/` folder, and deployed by that repo's GitHub Pages workflow.

To update it, copy `index.html`, `css/` and `js/` into `LesProjets/cloudlingo/`, open a PR, and merge it to `main`. The deploy runs on every push to `main`.

A claude.ai Artifact copy also exists at https://claude.ai/artifact/SsWb1a26DY5ivzP5212ydZ (built with `node build.js`, which writes `dist/cloudlingo.html`).

## Features

- **Learning path**: each exam domain is a unit with 3 lessons and a 🏆 review. Every unit is open, so you can start with any domain; lessons inside a unit go in order.
- **No limits**: there are no hearts or lives. Mistakes come back at the end of the lesson until you get them right.
- **Continue anytime**: progress is saved after every answer. Close the lesson or the tab, and the Learn page shows a "Pick up where you left off" card.
- **Word hints**: AWS terms in a lesson question have a dotted underline; tap one to see a short explanation, like Duolingo's hints. The glossary is `js/glossary.js`. Hints are skipped when they'd give away the answer, and the mock exam has none.
- **Question types**: multiple choice, select-N, true/false, fill-in-the-blank, and tap-to-match pairs. Every answer comes with an explanation.
- **XP, daily goal, and streak**: hit your daily XP goal to extend your streak.
- **Practice**: "Fix mistakes" brings back questions you missed (and keeps them until you get them right), plus quick practice and practice by topic.
- **Mock exam**: a quick 20-question exam, or a full-length one with 65 questions and the real time limit (90 minutes for CLF/AIF, 130 for the associate exams). Both have a question palette, flags, a pass/fail result, a domain breakdown, and a review of your misses.
- **Weekly leaderboard**: signed-in learners are ranked by XP earned since Monday (first name only). You can hide yourself. Scores are stored in `cloudlingoWeeks/{monday}/scores/{uid}`.
- **Streak freezes**: earn one for every 7 days in a row (hold up to 2). Each one covers a missed day automatically.
- **English and Thai**: the interface follows the site's shared `lang` setting, with a switch on Profile and the first screen (`js/i18n.js`). Questions stay in English, like the real exams.
- **Profile**: weekly XP chart, accuracy per domain, daily goal, and theme (auto/light/dark).

Progress is always saved in the browser. On the website, learners can **sign in with Google, LINE, or Microsoft**. Cloudlingo uses the same Firebase project as the other apps on pumbafluffycorgi.com but keeps its own sign-in session (a named Firebase app), so signing in or out here doesn't affect the other apps. Their progress is also saved to `userCloudlingo/{uid}` in Firestore, so it follows them across devices. The newest copy wins. If both the account and the device already have progress at the first sign-in, the learner picks which one to keep. The rule for that collection lives in `LesProjets/firestore.rules` and has to be deployed with `firebase deploy --only firestore:rules`. In the claude.ai Artifact copy, signed-in viewers who can save data sync through the artifact's own storage instead.

## Adding questions

The original questions are in `js/data.js`, and the extra banks are in `js/bank/<cert>.js`. Add new questions with `addQuestions('<unit id>', [...])` at the end of a bank file. Always append, never insert or reorder: question ids come from their position, and learners' saved stats use those ids. The supported formats are documented at the top of `js/data.js`.
