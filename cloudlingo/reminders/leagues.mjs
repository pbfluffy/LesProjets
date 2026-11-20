// Cloudlingo weekly leagues. Runs every hour as a step of the site's hourly "Price alerts check" job
// (.github/workflows/price-alerts-cron.yml), but only does work once a week: from Monday 12:00 UTC it
// settles last week (see weekToSettle), unless cloudlingoLeagueRuns/{week} says that week is already done.
//
// Reads cloudlingoWeeks/{week}/scores (the weekly leaderboard) and every cloudlingoLeague/{uid}, moves
// learners up and down (rules in leagues-core.mjs), writes each learner's new cloudlingoLeague/{uid},
// then cloudlingoLeagueRuns/{week}. The app only reads these docs; Firestore rules don't let it write them.
//
// Needs FIREBASE_SERVICE_ACCOUNT (the pumgoda service-account JSON). Without it, it does nothing.
// CLOUDLINGO_LEAGUES=dry (the workflow's `cloudlingo_leagues` input) computes and prints the moves for the
// week to settle, even if it was already settled or it isn't Monday afternoon yet, and writes nothing.
// Actions logs of this public repo are public, so only counts are printed: no names or ids.
import admin from 'firebase-admin';
import { settle, weekToSettle, mondayOf, TIERS } from './leagues-core.mjs';

const SA = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!SA) { console.log('Cloudlingo leagues: FIREBASE_SERVICE_ACCOUNT is not set yet, skipping.'); process.exit(0); }
const DRY = process.env.CLOUDLINGO_LEAGUES === 'dry';

const now = new Date();
// A dry run before Monday 12:00 UTC previews last week anyway.
const lastWeek = new Date(Date.parse(mondayOf(now) + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0, 10);
const week = weekToSettle(now) || (DRY ? lastWeek : null);
if (!week) { console.log('Cloudlingo leagues: not Monday 12:00 UTC yet this week, nothing to do.'); process.exit(0); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) }, 'leagues');
const db = admin.app('leagues').firestore();

const runRef = db.collection('cloudlingoLeagueRuns').doc(week);
if (!DRY && (await runRef.get()).exists) { console.log(`Cloudlingo leagues: week ${week} already settled.`); process.exit(0); }

const [scoreSnap, leagueSnap] = await Promise.all([
  db.collection('cloudlingoWeeks').doc(week).collection('scores').get(),
  db.collection('cloudlingoLeague').get()
]);
const scores = Object.fromEntries(scoreSnap.docs.map(d => [d.id, d.data()]));
const leagues = Object.fromEntries(leagueSnap.docs.map(d => [d.id, d.data()]));
const result = settle(leagues, scores);

// Counts only (public log).
const counts = { learners: Object.keys(result).length, up: 0, down: 0, stay: 0, quiet: 0, tiers: Object.fromEntries(TIERS.map(t => [t, 0])) };
for (const r of Object.values(result)) { counts[r.change]++; if (r.rank == null) counts.quiet++; counts.tiers[r.tier]++; }
console.log(`Cloudlingo leagues ${DRY ? '(dry run) ' : ''}week ${week}: ${JSON.stringify(counts)}`);
if (DRY) process.exit(0);

const entries = Object.entries(result);
for (let i = 0; i < entries.length; i += 400) {
  const batch = db.batch();
  for (const [uid, r] of entries.slice(i, i + 400)) batch.set(db.collection('cloudlingoLeague').doc(uid), { ...r, week, settledAt: Date.now() });
  await batch.commit();
}
await runRef.set({ at: Date.now(), counts });
console.log(`Cloudlingo leagues: week ${week} settled.`);
process.exit(0);
