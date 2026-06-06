// bill-splitter-receipt — Cloudflare Worker
// Forwards Gemini-shaped request bodies to the Generative Language API
// with the API key injected from env. Pattern-matched to nutritions-photo:
// single allowed origin, gemini-2.5-flash, exponential-backoff retry on 5xx.

const ALLOWED_ORIGIN = 'https://pumbafluffycorgi.com';
const GEMINI_MODEL = 'gemini-2.5-flash';
const RETRY_STATUSES = new Set([500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB — base64 image payload ceiling

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, options) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const r = await fetch(url, options);
      if (!RETRY_STATUSES.has(r.status) || attempt === MAX_ATTEMPTS - 1) {
        return r;
      }
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    } catch (e) {
      lastErr = e;
      if (attempt === MAX_ATTEMPTS - 1) throw e;
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: { ...CORS_HEADERS, 'Access-Control-Max-Age': '86400' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    // Origin allowlist — blocks cross-site browser embedding (spoofable by non-browser clients)
    if ((request.headers.get('Origin') || '') !== ALLOWED_ORIGIN) {
      return new Response(
        JSON.stringify({ error: 'forbidden origin' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Per-IP rate limit (cost-abuse cap) — no-op until the RATE_LIMITER binding is configured
    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return new Response(
          JSON.stringify({ error: 'rate_limited' }),
          { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Body-size cap (receipt images are base64-in-JSON)
    if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: 'payload too large' }),
        { status: 413, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'invalid JSON' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GOOGLE_API_KEY}`;

    try {
      const upstream = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'upstream fetch failed', detail: String(err).slice(0, 200) }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
  },
};
