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

The app is published as a claude.ai Artifact: https://claude.ai/artifact/SsWb1a26DY5ivzP5212ydZ

To update it, rebuild the single-file page and republish `dist/cloudlingo.html` to the same artifact:

```bash
node build.js
```

## Features

- **Learning path**: each exam domain is a unit with 3 lessons and a 🏆 review. Every unit is open, so you can start with any domain; lessons inside a unit go in order.
- **No limits**: there are no hearts or lives. Mistakes come back at the end of the lesson until you get them right.
- **Continue anytime**: progress is saved after every answer. Close the lesson or the tab, and the Learn page shows a "Pick up where you left off" card.
- **Question types**: multiple choice, select-N, true/false, fill-in-the-blank, and tap-to-match pairs. Every answer comes with an explanation.
- **XP, daily goal, and streak**: hit your daily XP goal to extend your streak.
- **Practice**: "Fix mistakes" brings back questions you missed (and keeps them until you get them right), plus quick practice and practice by topic.
- **Mock exam**: a timed set of 20 questions across all domains, with a question palette, flags, a pass/fail result, a domain breakdown, and a review of your misses.
- **Profile**: weekly XP chart, accuracy per domain, daily goal, and theme (auto/light/dark).

Progress is always saved in the browser. In the online version, signed-in viewers whose access lets them save data (you, and people in your organization at Contributor level or above) also get their progress synced across devices. Visitors from outside your organization keep progress in their own browser only.

## Adding questions

Everything lives in `js/data.js`. Add questions to any unit's `questions` array. The supported formats are documented at the top of that file.
