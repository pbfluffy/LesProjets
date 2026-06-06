// worklog-worker.js — Cloudflare Worker proxy for Pum's Office live work-log.
// Mirrors the existing Nutritions/Gemini Worker pattern: the API key lives as a
// Worker secret, never in the page. The static page calls this Worker; the Worker
// forwards to Anthropic and returns the response with CORS headers.
//
// Deploy:
//   1) wrangler init pums-office-worklog   (or paste into an existing Worker)
//   2) wrangler secret put ANTHROPIC_API_KEY
//   3) (optional) set ALLOWED_ORIGIN var to https://pumbafluffycorgi.com
//   4) wrangler deploy
//   5) put the deployed URL into WORKLOG_ENDPOINT in studio/index.html

const MODEL_DEFAULT = 'claude-sonnet-4-20250514';
const ALLOWED_ORIGINS = ['https://pumbafluffycorgi.com', 'https://pbfluffy.github.io'];
const MAX_BYTES = 100 * 1024; // 100 KB — work-log prompts are text-only

export default {
  async fetch(request, env) {
    const reqOrigin = request.headers.get('Origin') || '';
    const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : (env.ALLOWED_ORIGIN || ALLOWED_ORIGINS[0]);
    const cors = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    // Preflight
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    // Origin allowlist — blocks cross-site browser embedding (spoofable by non-browser clients)
    if (!ALLOWED_ORIGINS.includes(reqOrigin)) {
      return new Response(JSON.stringify({ error: 'forbidden origin' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'payload too large' }), { status: 413, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY secret not set' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    try {
      const raw = await request.text();
      if (raw.length > MAX_BYTES) {
        return new Response(JSON.stringify({ error: 'payload too large' }), { status: 413, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      const body = JSON.parse(raw);
      const payload = {
        model: MODEL_DEFAULT,                       // pinned — caller cannot choose the model
        max_tokens: Math.min(body.max_tokens || 1000, 2000),
        messages: body.messages || [],
      };
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });
      const data = await r.text(); // pass straight through
      return new Response(data, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'proxy_failed', detail: String(err) }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  },
};
