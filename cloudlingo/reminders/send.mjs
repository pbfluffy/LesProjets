// Cloudlingo daily reminders. Runs every hour as an extra step of the site's
// hourly "Price alerts check" job (.github/workflows/price-alerts-cron.yml),
// which the stock-ranges Worker starts reliably every hour.
//
// For every learner who turned reminders on (Firestore cloudlingoPush/{uid}):
// if it's now their chosen hour in their own time zone, they haven't already been
// reminded for this hour, and they haven't reached today's XP goal (from their synced
// progress in userCloudlingo/{uid}), send one push to each of their devices.
//
// "Already reminded" is remembered per hour slot (`lastSent` = 'YYYY-MM-DDTHH'), not per day: the job runs
// twice in the same hour (the Worker's timer at :03 and the workflow's backup schedule at :41), so the same
// hour must never send twice, but a different hour on the same day may (changing the reminder time after
// today's reminder went out still works). Older values are a plain 'YYYY-MM-DD' and match no slot.
//
// Needs FIREBASE_SERVICE_ACCOUNT (the pumgoda service-account JSON) and the
// site's VAPID keys. Without the service account it does nothing.
//
// Diagnostic: CLOUDLINGO_TEST=path|site (set by the workflow's `cloudlingo_test` input) skips all of the
// above and just sends one test push to every stored device, so a reminder that never shows up can be
// traced. See the block above `const snap`.
import admin from 'firebase-admin';
import webpush from 'web-push';

const SA = process.env.FIREBASE_SERVICE_ACCOUNT;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (!SA) { console.log('Cloudlingo reminders: FIREBASE_SERVICE_ACCOUNT is not set yet, skipping.'); process.exit(0); }
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) { console.log('Cloudlingo reminders: VAPID keys missing, skipping.'); process.exit(0); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) });
const db = admin.firestore();
// Push-service contact (VAPID subject): an https URL is allowed by RFC 8292 and keeps a personal address out of this public repo.
const REMINDER_CONTACT = 'https://pumbafluffycorgi.com/cloudlingo/';
const SITE_CONTACT = 'https://pumbafluffycorgi.com'; // what the Stock Ranges sender uses
webpush.setVapidDetails(REMINDER_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

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

// ---- Manual diagnostic (workflow_dispatch -> cloudlingo_test) ----
// Sends ONE test push to every stored device of every learner who has reminders on, through the same
// code and the same stored subscriptions the real reminders use, ignoring the hour / already-reminded /
// goal rules, and changing nothing in Firestore. "path" signs with the reminder contact, "site" with the
// plain site URL (what Stock Ranges uses): comparing the two tells a contact problem apart from a stale
// subscription. Actions logs of this public repo are public, so only the push host and the HTTP result are
// printed: no ids, no endpoints.
const TEST_TEXT = {
  en: (mode) => ({ title: `Cloudlingo test ${mode === 'site' ? 'B' : 'A'}`, body: `Sent with the ${mode === 'site' ? 'site' : 'reminder'} contact. If you can read this, it reached this device.` }),
  th: (mode) => ({ title: `ทดสอบ Cloudlingo ${mode === 'site' ? 'B' : 'A'}`, body: `ส่งด้วย contact แบบ ${mode === 'site' ? 'site' : 'reminder'} ถ้าเห็นข้อความนี้ แสดงว่าถึงเครื่องนี้แล้ว` })
};
if (process.env.CLOUDLINGO_TEST) {
  const mode = process.env.CLOUDLINGO_TEST === 'site' ? 'site' : 'path';
  const contact = mode === 'site' ? SITE_CONTACT : REMINDER_CONTACT;
  console.log(`Cloudlingo TEST (${mode}): VAPID contact ${contact}`);
  const testSnap = await db.collection('cloudlingoPush').where('on', '==', true).get();
  let devices = 0, accepted = 0;
  for (const doc of testSnap.docs) {
    const p = doc.data();
    const msg = TEST_TEXT[p.lang === 'th' ? 'th' : 'en'](mode);
    const payload = JSON.stringify({ ...msg, url: './' });
    for (const sub of Array.isArray(p.subs) ? p.subs : []) {
      devices++;
      let host = '?'; try { host = new URL(sub.endpoint).host; } catch { /* leave as ? */ }
      try {
        const res = await webpush.sendNotification(sub, payload, { TTL: 3 * 3600, urgency: 'normal', vapidDetails: { subject: contact, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY } });
        accepted++; console.log(`  device ${devices}: ${host} accepted (HTTP ${res.statusCode})`);
      } catch (e) {
        console.log(`  device ${devices}: ${host} REFUSED (HTTP ${e.statusCode || '?'}) ${String(e.body || e.message).slice(0, 120)}`);
      }
    }
  }
  console.log(`Cloudlingo TEST: ${testSnap.size} learner(s), ${devices} device(s), ${accepted} accepted by the push service.`);
  process.exit(0);
}

const snap = await db.collection('cloudlingoPush').where('on', '==', true).get();
let sent = 0, skipped = 0, pruned = 0;
for (const doc of snap.docs) {
  const p = doc.data();
  const tz = p.tz || 'UTC';
  const now = localNow(tz);
  const slot = `${now.date}T${String(now.hour).padStart(2, '0')}`; // this reminder hour, in the learner's time zone
  if (now.hour !== (p.hour ?? 19) || p.lastSent === slot || !Array.isArray(p.subs) || !p.subs.length) { skipped++; continue; }

  let state = {};
  try { const prog = await db.doc(`userCloudlingo/${doc.id}`).get(); state = JSON.parse(prog.exists ? prog.data().state || '{}' : '{}'); } catch { state = {}; }
  const goal = state.dailyGoal || 20;
  const today = (state.xpByDay || {})[now.date] || 0;
  if (today >= goal) { await doc.ref.update({ lastSent: slot }); skipped++; continue; } // goal already met: no reminder
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
  await doc.ref.update({ lastSent: slot, subs: keep });
}
console.log(`Cloudlingo reminders: ${snap.size} on, ${sent} sent, ${skipped} skipped, ${pruned} expired subscriptions removed.`);
process.exit(0);
