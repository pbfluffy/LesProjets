// cloudlingo-invites — emails a Cloudlingo beta tester their invitation.
//
// POST /invite { name, email, username }   (Authorization: Bearer <Firebase ID token>, admins only)
//   -> 200 { ok:true }
//   -> err { ok:false, error: unauthorized | bad_input | send_failed }
//
// Same model as TalentMatch's invitations: Azure Communication Services Email, from the
// verified domain mail.pumbafluffycorgi.com. The tester's Microsoft account
// (name@pumbafluffycorgi.com) is created beforehand in the Entra admin center; the email
// says how to sign in. It never contains a password (that is given separately).
//
// The ACS access key lives only in the ACS_KEY secret (npx wrangler secret put ACS_KEY).
// Admin check mirrors pumgoda-places-lookup: a Firebase ID token for the owner or a
// member of the Firestore /admins collection.

const ALLOW = ['https://pumbafluffycorgi.com', 'https://pbfluffy.github.io'];
const PROJECT_ID = 'pumgoda';
const OWNER_UID = 'HfksT06CgFUkZ9s4vrzEGs85O562';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const ACS_HOST = 'talentmatch-comms.asiapacific.communication.azure.com';
const ACS_PATH = '/emails:send?api-version=2023-03-31';
const SENDER = 'cloudlingo@mail.pumbafluffycorgi.com';
const TENANT_DOMAIN = '@pumbafluffycorgi.com'; // testers' Microsoft accounts
const APP_URL = 'https://pumbafluffycorgi.com/cloudlingo/';

function corsFor(req) {
  const o = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ALLOW.includes(o) ? o : ALLOW[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  };
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...h } });

// ---------------------------------------------------------------------------
// auth — verify a Firebase ID token; owner OR a member of /admins
// ---------------------------------------------------------------------------
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlToString = (s) => new TextDecoder().decode(b64urlToBytes(s));

async function verifyIdToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64urlToString(parts[0]));
  const payload = JSON.parse(b64urlToString(parts[1]));
  const jwks = await (await fetch(JWKS_URL)).json();
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('signing key not found');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad signature');
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== PROJECT_ID) throw new Error('bad aud');
  if (payload.iss !== 'https://securetoken.google.com/' + PROJECT_ID) throw new Error('bad iss');
  if (payload.exp <= now) throw new Error('expired');
  if (payload.iat > now + 300) throw new Error('iat in future');
  if (!payload.sub) throw new Error('no sub');
  return payload;
}
async function isAdmin(uid, idToken) {
  if (uid === OWNER_UID) return true;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + idToken } });
  return res.status === 200;
}
async function requireAdmin(request) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('missing token');
  const payload = await verifyIdToken(m[1]);
  if (!(await isAdmin(payload.sub, m[1]))) throw new Error('not admin');
  return payload;
}

// ---------------------------------------------------------------------------
// the invitation
// ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const oneLine = (s, max) => String(s || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export function invitation({ name, email, username, invitedBy }) {
  const first = name.split(' ')[0] || name;
  const by = invitedBy || 'The Cloudlingo team';
  const subject = 'You’re invited to test Cloudlingo';
  const text = [
    `Hi ${first},`,
    '',
    `${by} invited you to try Cloudlingo, bite-sized lessons for AWS certifications, as a beta tester.`,
    '',
    `Your sign-in: ${username}`,
    'Your temporary password: sent to you separately',
    '',
    `1. Open ${APP_URL}`,
    '2. Tap Sign in, then Continue with Microsoft',
    '3. Sign in and choose your own password',
    '',
    'Thanks for helping us test!',
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f9fc;font-family:Segoe UI,Arial,sans-serif;color:#1d2b3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:2px solid #dbe4ee;border-radius:18px;padding:28px">
<tr><td style="font-size:22px;font-weight:800;color:#1f8ef1;padding-bottom:6px">Cloudlingo</td></tr>
<tr><td style="font-size:20px;font-weight:800;padding-bottom:14px">You’re invited to test Cloudlingo</td></tr>
<tr><td style="font-size:15px;line-height:1.55;padding-bottom:16px">Hi ${esc(first)},<br><br>${esc(by)} invited you to try Cloudlingo, bite-sized lessons for AWS certifications, as a <b>beta tester</b>.</td></tr>
<tr><td style="background:#f6f9fc;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6">
<div style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Your sign-in</div>
<div style="font-size:16px;font-weight:700">${esc(username)}</div>
<div style="color:#64748b;margin-top:6px">Your temporary password: sent to you separately</div></td></tr>
<tr><td style="font-size:15px;line-height:1.7;padding:16px 0">1. Open Cloudlingo<br>2. Tap <b>Sign in</b>, then <b>Continue with Microsoft</b><br>3. Sign in and choose your own password</td></tr>
<tr><td align="center" style="padding:4px 0 8px"><a href="${APP_URL}" style="display:inline-block;background:#1f8ef1;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 28px;border-radius:14px">Start learning</a></td></tr>
<tr><td style="font-size:13px;color:#64748b;padding-top:14px">Thanks for helping us test!</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

// Azure Communication Services: HMAC-SHA256 signed request with the resource's access key.
async function sha256b64(data) {
  const d = await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data);
  return btoa(String.fromCharCode(...new Uint8Array(d)));
}
export async function signAcs(method, host, pathAndQuery, body, accessKey, date = new Date().toUTCString()) {
  const contentHash = await sha256b64(body);
  const toSign = `${method}\n${pathAndQuery}\n${date};${host};${contentHash}`;
  const keyBytes = Uint8Array.from(atob(accessKey), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
  return {
    'x-ms-date': date,
    'x-ms-content-sha256': contentHash,
    Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${btoa(String.fromCharCode(...new Uint8Array(sig)))}`,
  };
}
async function sendMail(env, to, toName, mail, replyTo) {
  const body = JSON.stringify({
    senderAddress: SENDER,
    recipients: { to: [{ address: to, displayName: toName }] },
    content: { subject: mail.subject, plainText: mail.text, html: mail.html },
    replyTo: replyTo ? [{ address: replyTo }] : undefined,
    userEngagementTrackingDisabled: true, // no tracking pixels or rewritten links
  });
  const headers = await signAcs('POST', ACS_HOST, ACS_PATH, body, env.ACS_KEY);
  const res = await fetch(`https://${ACS_HOST}${ACS_PATH}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  if (res.status !== 202) {
    const detail = ((await res.json().catch(() => ({}))).error || {}).message;
    throw new Error(`email service ${res.status}${detail ? ': ' + detail : ''}`);
  }
}

export default {
  async fetch(request, env) {
    const cors = corsFor(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/invite') return json({ ok: false, error: 'not_found' }, 404, cors);

    let admin;
    try { admin = await requireAdmin(request); } catch { return json({ ok: false, error: 'unauthorized' }, 401, cors); }

    let input;
    try { input = await request.json(); } catch { return json({ ok: false, error: 'bad_input' }, 400, cors); }
    const name = oneLine(input.name, 80);
    const email = oneLine(input.email, 200).toLowerCase();
    const username = oneLine(input.username, 120).toLowerCase();
    if (!name || !EMAIL_RE.test(email) || !EMAIL_RE.test(username) || !username.endsWith(TENANT_DOMAIN)) {
      return json({ ok: false, error: 'bad_input' }, 400, cors);
    }
    if (!env.ACS_KEY) return json({ ok: false, error: 'send_failed', detail: 'ACS_KEY secret is not set' }, 500, cors);

    const invitedBy = oneLine(admin.name, 60);
    const replyTo = admin.email && admin.email_verified ? admin.email : null;
    try {
      await sendMail(env, email, name, invitation({ name, email, username, invitedBy }), replyTo);
      return json({ ok: true }, 200, cors);
    } catch (e) {
      return json({ ok: false, error: 'send_failed', detail: String(e.message || e).slice(0, 300) }, 502, cors);
    }
  },
};
