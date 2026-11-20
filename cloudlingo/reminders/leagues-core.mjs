// Cloudlingo weekly leagues: the ranking rules, with no Firestore access so they can be tested on their own.
// Used by leagues.mjs. The app (js/app.js, "Leagues") mirrors MOVE and MIN_DROP to colour the board.

export const TIERS = ['bronze', 'silver', 'gold', 'platinum'];
export const MOVE = 3;        // how many move up, and down, in each league every week
export const MIN_DROP = 7;    // a league needs this many active learners before its bottom 3 drop

// The Monday (YYYY-MM-DD, UTC) of the week that `d` is in.
export function mondayOf(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

// The week to settle now, or null if it's too early. Learners file scores under their own local Monday, so a
// week is only over everywhere once it is Monday 12:00 UTC (Sunday midnight in UTC-12). Any later run that
// week (Tuesday, ...) settles the same week, so a missed Monday still gets done.
export function weekToSettle(now = new Date()) {
  const thisMonday = mondayOf(now);
  if (now.getTime() < Date.parse(thisMonday + 'T12:00:00Z')) return null;
  const last = new Date(Date.parse(thisMonday + 'T00:00:00Z') - 7 * 86400000);
  return last.toISOString().slice(0, 10);
}

const up = t => TIERS[Math.min(TIERS.indexOf(t) + 1, TIERS.length - 1)];
const down = t => TIERS[Math.max(TIERS.indexOf(t) - 1, 0)];
const tierOf = t => (TIERS.includes(t) ? t : 'bronze');

// leagues: { uid: { tier } } (everyone who has a league)
// scores:  { uid: { xp, updatedAt } } (the settled week's leaderboard)
// Returns { uid: { tier, prevTier, change: 'up'|'down'|'stay', rank, size } }:
//   - learners with XP are ranked inside their league (a learner without a league starts in Bronze);
//   - the top 3 move up (not from Platinum); the bottom 3 move down if the league has at least 7 (not from Bronze);
//   - learners with a league but no XP that week drop one league (Bronze stays Bronze) and get no rank.
export function settle(leagues, scores) {
  const out = {}, groups = {};
  for (const [uid, s] of Object.entries(scores)) {
    if (!(s && s.xp > 0)) continue;
    const t = tierOf(leagues[uid] && leagues[uid].tier);
    (groups[t] = groups[t] || []).push({ uid, xp: s.xp, at: s.updatedAt || 0 });
  }
  for (const [t, list] of Object.entries(groups)) {
    // Most XP first; on a tie, whoever got there first.
    list.sort((a, b) => b.xp - a.xp || a.at - b.at);
    const n = list.length;
    list.forEach((r, i) => {
      let tier = t;
      if (i < MOVE && t !== 'platinum') tier = up(t);
      else if (n >= MIN_DROP && i >= n - MOVE && t !== 'bronze') tier = down(t);
      out[r.uid] = { tier, prevTier: t, change: tier === t ? 'stay' : TIERS.indexOf(tier) > TIERS.indexOf(t) ? 'up' : 'down', rank: i + 1, size: n };
    });
  }
  for (const [uid, l] of Object.entries(leagues)) {
    if (out[uid]) continue;
    const t = tierOf(l && l.tier), tier = down(t);
    out[uid] = { tier, prevTier: t, change: tier === t ? 'stay' : 'down', rank: null, size: null };
  }
  return out;
}
