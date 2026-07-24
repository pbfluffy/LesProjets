// pumgoda-places-lookup — resolve a Google Maps link to a normalized place object.
//
// POST { "url": "<google maps link>" }   (Authorization: Bearer <Firebase ID token>, admin only)
//   -> 200 { ok:true, place:{...}, meta:{ placeId, matchName } }
//   -> err { ok:false, error: unauthorized | bad_url | resolve_failed | not_found | places_error }
//
// Key lives only in the GOOGLE_MAPS_KEY secret — never shipped to the browser.
// Auth + CORS pattern mirrors pumgoda-photo: verify a Firebase ID token, owner OR
// anyone in the Firestore /admins or /pumgodaAdmins collection. SSRF guard: only
// Google Maps hosts are ever fetched (both the pasted link and its redirect target).

const ALLOW = ['https://pbfluffy.github.io', 'https://pumbafluffycorgi.com'];
const PROJECT_ID = 'pumgoda';
const OWNER_UID  = 'HfksT06CgFUkZ9s4vrzEGs85O562';
const JWKS_URL   = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
// SSRF guard — the only hosts this Worker is ever allowed to fetch.
const ALLOWED_HOSTS = ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl', 'g.co'];

function corsFor(req) {
  const o = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ALLOW.includes(o) ? o : ALLOW[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  };
}

const json = (o, s, h) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { 'Content-Type': 'application/json', ...h },
  });

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

async function isAdmin(uid, idToken) {
  if (uid === OWNER_UID) return true;
  const docUrl = (col) => `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}`
                         + `/databases/(default)/documents/${col}/${encodeURIComponent(uid)}`;
  const auth = { headers: { Authorization: 'Bearer ' + idToken } };
  const full = await fetch(docUrl('admins'), auth);
  if (full.status === 200) return true;
  // Pumgoda-only admins may also use the Maps-link autofill lookup.
  const pg = await fetch(docUrl('pumgodaAdmins'), auth);
  return pg.status === 200;
}

async function requireAdmin(request) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('missing token');
  const token = m[1];
  const payload = await verifyIdToken(token);
  if (!(await isAdmin(payload.sub, token))) throw new Error('not admin');
  return payload;
}

// SSRF guard — true only for Google Maps hosts (exact or subdomain).
function isAllowedMapsUrl(u) {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((d) => h === d || h.endsWith('.' + d));
  } catch {
    return false;
  }
}

export default {
  async fetch(req, env) {
    const cors = corsFor(req);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'bad_url' }, 405, cors);

    // admin gate
    try { await requireAdmin(req); }
    catch (e) { return json({ ok: false, error: 'unauthorized' }, 401, cors); }

    try {
      const { url } = await req.json();
      if (!url || !/^https?:\/\//.test(url) || !isAllowedMapsUrl(url))
        return json({ ok: false, error: 'bad_url' }, 400, cors);

      // a. resolve short links (maps.app.goo.gl / goo.gl/maps) -> final long URL
      let finalUrl;
      try {
        finalUrl = (await fetch(url, { redirect: 'follow' })).url;
      } catch {
        return json({ ok: false, error: 'resolve_failed' }, 422, cors);
      }
      // SSRF guard — the redirect target must also be a Google Maps host
      if (!isAllowedMapsUrl(finalUrl))
        return json({ ok: false, error: 'bad_url' }, 400, cors);

      // b. parse name + pin coords from the long URL
      const { name, coords } = parseMapsUrl(finalUrl);
      if (!name && !coords)
        return json({ ok: false, error: 'resolve_failed' }, 422, cors);

      const key = env.GOOGLE_MAPS_KEY;

      // c. Text Search (New) -> place_id (name + coords bias)
      let placeId = null;
      if (name) placeId = await textSearch(name, coords, key);

      // coords-only fallback: no confident match, still useful
      if (!placeId)
        return json(
          { ok: true, place: coordsOnly(name, coords, finalUrl), meta: { placeId: null } },
          200,
          cors
        );

      // d. Place Details (New) x2 for bilingual text
      const [en, th] = await Promise.all([
        details(placeId, 'en', key),
        details(placeId, 'th', key),
      ]);

      // e. normalize -> §4 shape
      return json(
        { ok: true, place: normalize(en, th, finalUrl), meta: { placeId, matchName: name } },
        200,
        cors
      );
    } catch (e) {
      return json({ ok: false, error: 'places_error' }, 502, cors);
    }
  },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// §3.3b — heuristic URL parse (fragile by nature: Google can change URL shape)
function parseMapsUrl(u) {
  let name = null,
    coords = null;
  const nameM = u.match(/\/place\/([^/@]+)/);
  if (nameM) name = decodeURIComponent(nameM[1].replace(/\+/g, ' '));
  // preferred: pin coords  !3d<lat>!4d<lng>
  let c = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  // fallback: map center  @lat,lng
  if (!c) c = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (c) coords = [parseFloat(c[1]), parseFloat(c[2])];

  // App share links (Maps mobile "Share" button) resolve to .../maps?q=<name>&ftid=...
  // instead of the /place/...@lat,lng shape above — fall back to the q= param.
  if (!name || !coords) {
    try {
      const q = new URL(u).searchParams.get('q');
      if (q) {
        const qc = q.match(/^(-?\d+\.\d+),(-?\d+\.\d+)$/);
        if (qc && !coords) coords = [parseFloat(qc[1]), parseFloat(qc[2])];
        else if (!qc && !name) name = q;
      }
    } catch {}
  }
  return { name, coords };
}

// §3.3c — Text Search (New). Returns places[0].id or null.
async function textSearch(name, coords, key) {
  const body = { textQuery: name };
  if (coords) {
    body.locationBias = {
      circle: {
        center: { latitude: coords[0], longitude: coords[1] },
        radius: 200,
      },
    };
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('searchText ' + res.status);
  const data = await res.json();
  return data.places && data.places[0] ? data.places[0].id : null;
}

// §3.3d — Place Details (New). Field mask kept tight (drives billing).
async function details(placeId, lang, key) {
  const mask = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',
    'regularOpeningHours.weekdayDescriptions',
    'primaryType',
    'types',
    'priceLevel',
    'googleMapsUri',
    'addressComponents',
  ].join(',');
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?languageCode=${lang}`,
    { headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask } }
  );
  if (!res.ok) throw new Error('details ' + res.status);
  return res.json();
}

// §4.2 — Google primaryType -> Title-Case TYPE_BASE (blank when no confident match)
const TYPE_MAP = {
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  restaurant: 'Restaurant',
  bakery: 'Restaurant',
  bar: 'Restaurant',
  lodging: 'Hotel',
  hotel: 'Hotel',
  park: 'Park',
  dog_park: 'Park',
  shopping_mall: 'Mall',
  veterinary_care: 'Vet',
  pet_store: 'Pet shop',
};
function mapType(en) {
  if (en && en.primaryType && TYPE_MAP[en.primaryType]) return TYPE_MAP[en.primaryType];
  if (en && Array.isArray(en.types)) {
    for (const t of en.types) if (TYPE_MAP[t]) return TYPE_MAP[t];
  }
  return null;
}

// §4.3 — Google priceLevel -> $ / $$ / $$$ ('' when unset)
function mapPrice(en) {
  switch (en && en.priceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '$';
    case 'PRICE_LEVEL_MODERATE':
      return '$$';
    case 'PRICE_LEVEL_EXPENSIVE':
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '$$$';
    default:
      return '';
  }
}

// §4.1 — weekdayDescriptions[] -> single string (collapse uniform week to Daily/24 hours)
function formatHours(en) {
  const wd = en && en.regularOpeningHours && en.regularOpeningHours.weekdayDescriptions;
  if (!Array.isArray(wd) || wd.length === 0) return null;
  const times = wd.map((s) => {
    const i = s.indexOf(': ');
    return i >= 0 ? s.slice(i + 2).trim() : s.trim();
  });
  const uniform = times.every((t) => t === times[0]);
  if (uniform) {
    const t = times[0];
    if (/open 24 hours/i.test(t)) return '24 hours';
    if (/closed/i.test(t)) return null;
    return 'Daily ' + t;
  }
  return wd.join(' · ');
}

// addressComponents -> province / neighborhood (best-effort, editable downstream)
function pickComponent(comps, type) {
  if (!Array.isArray(comps)) return null;
  const c = comps.find((x) => Array.isArray(x.types) && x.types.includes(type));
  return c ? c.longText || c.shortText || null : null;
}

// §4 — normalize the two Details responses into the admin-form shape
function normalize(en, th, finalUrl) {
  const nameEn = en && en.displayName ? en.displayName.text : null;
  const nameTh = th && th.displayName ? th.displayName.text : null;
  const comps = (en && en.addressComponents) || (th && th.addressComponents);
  return {
    name: { en: nameEn, th: nameTh || nameEn },
    coords:
      en && en.location ? [en.location.latitude, en.location.longitude] : null,
    address: {
      en: en ? en.formattedAddress : null,
      th: th ? th.formattedAddress : null,
    },
    phone: (en && (en.nationalPhoneNumber || en.internationalPhoneNumber)) || null,
    website: (en && en.websiteUri) || null,
    googleMapsUrl: (en && en.googleMapsUri) || finalUrl,
    hours: formatHours(en),
    type: mapType(en),
    price: mapPrice(en),
    province: pickComponent(comps, 'administrative_area_level_1'),
    neighborhood:
      pickComponent(comps, 'sublocality') || pickComponent(comps, 'neighborhood'),
  };
}

// §6 — coords-only fallback when no place_id resolved
function coordsOnly(name, coords, finalUrl) {
  return {
    name: { en: name || null, th: name || null },
    coords: coords || null,
    googleMapsUrl: finalUrl,
  };
}
