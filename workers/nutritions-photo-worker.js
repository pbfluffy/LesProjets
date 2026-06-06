// Cloudflare Worker: nutritions-photo proxy for Gemini API
// Restricts access to https://pumbafluffycorgi.com only.
// Retries transient upstream errors (500, 502, 503, 504) up to 3 times.
// #65: caches successful identifications by image hash (Cloudflare Cache API,
// no cost / no setup) so repeat submits of the same image skip the Gemini call.

const ALLOWED_ORIGIN = 'https://pumbafluffycorgi.com';
const GEMINI_MODEL = 'gemini-2.5-flash';
const RETRY_STATUSES = new Set([500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB — base64 image payload ceiling

// #65 photo cache - bump CACHE_VERSION to invalidate ALL cached results
// (e.g. after changing the client prompt or the model).
const CACHE_VERSION = 'v1';

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function photoCacheKey(hash) {
  // Cache API matches GET requests, so use a synthetic GET URL as the key.
  return new Request(`https://photo-cache.internal/${CACHE_VERSION}/${hash}`);
}

async function fetchWithRetry(url, init) {
  let lastResponse;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    lastResponse = await fetch(url, init);
    if (!RETRY_STATUSES.has(lastResponse.status)) {
      return lastResponse;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      // Backoff: 1s, then 2s
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * (attempt + 1)));
    }
  }
  return lastResponse;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const origin = request.headers.get('Origin');
    if (origin !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 });
    }

    if (!env.GOOGLE_API_KEY) {
      return new Response('Server misconfigured', { status: 500 });
    }

    if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) {
      return new Response('Payload too large', { status: 413, headers: corsHeaders(request) });
    }

    const body = await request.text();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GOOGLE_API_KEY}`;

    // #65 - check the cache for this exact image before calling Gemini.
    const cache = caches.default;
    let cacheKey = null;
    try {
      const parsed = JSON.parse(body);
      const imageB64 = parsed?.contents?.[0]?.parts?.find((p) => p.inline_data)?.inline_data?.data || '';
      if (imageB64) {
        cacheKey = photoCacheKey(await sha256Hex(imageB64));
        const hit = await cache.match(cacheKey);
        if (hit) {
          const cached = await hit.text();
          return new Response(cached, {
            status: 200,
            headers: {
              ...corsHeaders(request),
              'content-type': 'application/json',
              'x-cache': 'HIT',
            },
          });
        }
      }
    } catch (_) {
      // Unparseable body - skip caching and forward as-is.
      cacheKey = null;
    }

    const upstream = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

    const text = await upstream.text();

    // #65 - store only clean 200s so a transient failure is never frozen in.
    if (cacheKey && upstream.status === 200) {
      const toStore = new Response(text, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': `max-age=${60 * 60 * 24 * 30}`, // 30-day edge TTL
        },
      });
      ctx.waitUntil(cache.put(cacheKey, toStore));
    }

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders(request),
        'content-type': 'application/json',
        'x-cache': cacheKey ? 'MISS' : 'BYPASS',
      },
    });
  },
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin':
      origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
  };
}
