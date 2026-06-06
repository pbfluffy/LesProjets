// pumgoda-photo — admin photo upload/delete Worker for Pumgoda (Feature #100, Phase 3)
// REQUIRED BINDING: R2 bucket "pumgoda-photos" bound as env.BUCKET
//   (Worker → Settings → Bindings → Add → R2 bucket → variable name: BUCKET)
// Auth: verifies a Firebase ID token; only the admin UID may upload or delete.
// Serving: handled directly by the public r2.dev URL (this Worker never serves images).

const PROJECT_ID   = 'pumgoda';
const ADMIN_UID    = 'HfksT06CgFUkZ9s4vrzEGs85O562';
const PUBLIC_BASE  = 'https://pub-def11107571946c7943260f18e42bb2d.r2.dev';
const ALLOWED_ORIGINS = ['https://pumbafluffycorgi.com', 'https://pbfluffy.github.io'];
const MAX_BYTES    = 8 * 1024 * 1024; // 8 MB per image
const JWKS_URL     = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}
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
  const header  = JSON.parse(b64urlToString(parts[0]));
  const payload = JSON.parse(b64urlToString(parts[1]));

  const jwks = await (await fetch(JWKS_URL)).json();
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('signing key not found');

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), data);
  if (!ok) throw new Error('bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== PROJECT_ID) throw new Error('bad aud');
  if (payload.iss !== 'https://securetoken.google.com/' + PROJECT_ID) throw new Error('bad iss');
  if (payload.exp <= now) throw new Error('expired');
  if (payload.iat > now + 300) throw new Error('iat in future');
  if (!payload.sub) throw new Error('no sub');
  return payload;
}

// --- Feature #111: owner OR anyone present in the Firestore /admins collection ---
const OWNER_UID = ADMIN_UID; // bootstrap owner — network-free fast path

async function isAdmin(uid, idToken) {
  if (uid === OWNER_UID) return true;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}`
            + `/databases/(default)/documents/admins/${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + idToken } });
  return res.status === 200; // self-read allowed & doc exists -> admin; 404/403 -> not
}

async function requireAdmin(request) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('missing token');
  const token   = m[1];
  const payload = await verifyIdToken(token);
  if (!(await isAdmin(payload.sub, token))) throw new Error('not admin');
  return payload;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method === 'GET')     return new Response('pumgoda-photo OK', { headers: cors(origin) });

    if (request.method === 'POST') {
      try { await requireAdmin(request); }
      catch (e) { return json({ error: 'unauthorized: ' + e.message }, 401, origin); }

      let form;
      try { form = await request.formData(); }
      catch { return json({ error: 'expected multipart form-data' }, 400, origin); }

      const file = form.get('file');
      if (!file || typeof file === 'string') return json({ error: 'no file field' }, 400, origin);
      const type = file.type || '';
      if (!EXT[type]) return json({ error: 'unsupported type: ' + type }, 415, origin);
      if (file.size > MAX_BYTES) return json({ error: 'too large (max 8MB)' }, 413, origin);

      const placeId = (form.get('placeId') || 'misc').toString().replace(/[^A-Za-z0-9_-]/g, '') || 'misc';
      const key = `${placeId}/${crypto.randomUUID()}.${EXT[type]}`;
      const bytes = await file.arrayBuffer();
      await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type } });
      return json({ url: `${PUBLIC_BASE}/${key}`, key }, 200, origin);
    }

    if (request.method === 'DELETE') {
      try { await requireAdmin(request); }
      catch (e) { return json({ error: 'unauthorized: ' + e.message }, 401, origin); }

      const url = new URL(request.url);
      let key = url.searchParams.get('key') || '';
      if (key.startsWith(PUBLIC_BASE + '/')) key = key.slice(PUBLIC_BASE.length + 1);
      if (!key) return json({ error: 'no key' }, 400, origin);
      await env.BUCKET.delete(key);
      return json({ deleted: key }, 200, origin);
    }

    return json({ error: 'method not allowed' }, 405, origin);
  },
};
