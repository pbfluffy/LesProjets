// Feature #20 — protein streak.
// "Met" = the day's logged protein >= proteinTarget.
// Current streak ends at today (if today met) or yesterday (if today still pending).

function todayKeyLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prevDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return todayKeyLocal(dt);
}

function dayProtein(day) {
  if (!day || !day.log) return 0;
  return day.log.reduce((s, x) => s + (x.protein || 0), 0);
}

/**
 * @param {Object} days  Map of YYYY-MM-DD -> { log, water }
 * @param {number} proteinTarget Grams per day
 * @param {string} [today]  Override for tests; defaults to local today
 * @returns {{ current: number, best: number, todayMet: boolean }}
 */
export function computeProteinStreak(days, proteinTarget, today = null) {
  if (!proteinTarget || proteinTarget <= 0 || !days) {
    return { current: 0, best: 0, todayMet: false };
  }
  const todayK = today || todayKeyLocal();
  const todayMet = dayProtein(days[todayK]) >= proteinTarget;

  // Current streak: walk back from today (or yesterday if today not met yet)
  let current = 0;
  let cursor = todayMet ? todayK : prevDayKey(todayK);
  while (dayProtein(days[cursor]) >= proteinTarget) {
    current++;
    cursor = prevDayKey(cursor);
  }

  // Best streak: scan all recorded days for the longest consecutive run.
  const sortedKeys = Object.keys(days).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of sortedKeys) {
    const met = dayProtein(days[k]) >= proteinTarget;
    if (!met) {
      run = 0;
      prev = null;
      continue;
    }
    if (prev !== null && prevDayKey(k) === prev) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = k;
  }
  if (current > best) best = current;

  return { current, best, todayMet };
}
