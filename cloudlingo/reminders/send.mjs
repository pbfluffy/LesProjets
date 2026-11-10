// Cloudlingo daily reminders. Runs every hour as an extra step of the site's
// hourly "Price alerts check" job (.github/workflows/price-alerts-cron.yml),
// which the stock-ranges Worker starts reliably every hour.
//
// For every learner who turned reminders on (Firestore cloudlingoPush/{uid}):
// if it's now their chosen hour in their own time zone, they haven't been
// reminded today, and they haven't reached today's XP goal (from their synced
// progress in userCloudlingo/{uid}), send one push to each of their devices.
//
// Needs FIREBASE_SERVICE_ACCOUNT (the pumgoda service-account JSON) and the
// site's VAPID keys. Without the service account it does nothing.
import admin from 'firebase-admin';
import webpush from 'web-push';

const SA = process.env.FIREBASE_SERVICE_ACCOUNT;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (!SA) { console.log('Cloudlingo reminders: FIREBASE_SERVICE_ACCOUNT is not set yet, skipping.'); process.exit(0); }
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) { console.log('Cloudlingo reminders: VAPID keys missing, skipping.'); process.exit(0); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) });
const db = admin.firestore();
webpush.setVapidDetails('mailto:pbfluffygaming@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const TEXT = {
  en: {
    streak: (n, left) => ({ title: `Keep your ${n}-day streak!`, body: `${left} XP to go today. A quick lesson takes about 2 minutes.` }),
    start: left => ({ title: 'Time for a quick lesson', body: `${left} XP to reach today's goal. Nimbus is waiting!` })
  },
  th: {
    streak: (n, left) => ({ title: `รักษาสถิติ ${n} วันไว้!`, body: `อีก ${left} XP ก็ถึงเป้าวันนี้ เรียนสั้น ๆ ใช้เวลาแค่ 2 นาที` }),
    start: left => ({ title: 'ได้เวลาเรียนสั้น ๆ แล้ว', body: `อีก ${left} XP ก็ถึงเป้าวันนี้ นิมบัสรออยู่!` })
  }
};

// The local date (YYYY-MM-DD) and hour in a time zone.
function localNow(tz, offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  let parts;
  try { parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(d); }
  catch { parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(d); }
  const get = t => parts.find(p => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: +get('hour') };
}

const snap = await db.collection('cloudlingoPush').where('on', '==', true).get();
let sent = 0, skipped = 0, pruned = 0;
for (const doc of snap.docs) {
  const p = doc.data();
  const tz = p.tz || 'UTC';
  const now = localNow(tz);
  if (now.hour !== (p.hour ?? 19) || p.lastSent === now.date || !Array.isArray(p.subs) || !p.subs.length) { skipped++; continue; }

  let state = {};
  try { const prog = await db.doc(`userCloudlingo/${doc.id}`).get(); state = JSON.parse(prog.exists ? prog.data().state || '{}' : '{}'); } catch { state = {}; }
  const goal = state.dailyGoal || 20;
  const today = (state.xpByDay || {})[now.date] || 0;
  if (today >= goal) { await doc.ref.update({ lastSent: now.date }); skipped++; continue; } // goal already met: no reminder
  const yesterday = localNow(tz, -1).date;
  const streak = state.lastStreakDay === yesterday ? state.streak || 0 : 0;
  const t = TEXT[p.lang === 'th' ? 'th' : 'en'];
  const msg = streak > 0 ? t.streak(streak, goal - today) : t.start(goal - today);
  const payload = JSON.stringify({ ...msg, url: './' });

  const keep = [];
  for (const sub of p.subs) {
    try { await webpush.sendNotification(sub, payload, { TTL: 3 * 3600, urgency: 'normal' }); keep.push(sub); sent++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) pruned++; // subscription is gone
      else { keep.push(sub); console.warn('push failed', e.statusCode || e.message); }
    }
  }
  await doc.ref.update({ lastSent: now.date, subs: keep });
}
console.log(`Cloudlingo reminders: ${snap.size} on, ${sent} sent, ${skipped} skipped, ${pruned} expired subscriptions removed.`);
process.exit(0);
