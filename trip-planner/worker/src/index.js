const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MAX_FILES = 6
const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_SHARED_TRIP_BYTES = 200 * 1024

const ALLOWED_EXPIRY_DAYS = [15, 30, 60, 90]
const SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const SHORT_ID_LENGTH = 8

const SYSTEM_PROMPT = `You turn messy, real trip-planning material — pasted notes, flight
confirmations, screenshots, PDFs — into a structured itinerary using the
generate_itinerary tool. Follow these rules strictly:

1. Never invent facts that aren't in the source — dates, prices, confirmation
   numbers, addresses. If something is unclear, ambiguous, or simply missing
   (e.g. the source says "need to check flight routing"), put it in
   openQuestions instead of guessing or resolving it.
2. Preserve genuine uncertainty from the source as uncertainty — don't
   silently pick one option when the source lists several unresolved ones.
3. Order days chronologically. If exact dates are given, use them and infer
   the weekday. If only relative info is given ("day 3", "after Kyoto"),
   make a reasonable sequential label and don't fabricate a specific
   calendar date.
4. Keep every field concise — this renders in a compact UI, not a document.
5. Only include a "flag" on a day card when something genuinely stands out
   (an early start, a must-see, something still unconfirmed) — leave it out
   otherwise, don't decorate every card.
6. notes categories should reflect what's actually relevant in the source
   (visa, transport, weather, budget, etc.) — don't pad with generic travel
   advice that wasn't in the input.
7. If the source is too thin to produce a real itinerary (e.g. no dates,
   no destination, no activities at all), still call the tool: put what you
   do know in title/stats, leave days empty, and use openQuestions to say
   what's missing.`

const ITINERARY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: "Short trip title, e.g. 'Kyoto Autumn Itinerary'" },
    eyebrow: { type: 'string', description: "One punchy line above the title, e.g. '7 Nights of Momiji Season in Kyoto'" },
    subtitle: { type: 'string', description: "Dates and base location, e.g. 'November 15 – 22, 2026 · Gion Shinmonzen, Kyoto'" },
    stats: {
      type: 'array',
      description: '3-6 short key facts: travel dates, duration, base hotel, weather, etc.',
      items: {
        type: 'object',
        properties: { label: { type: 'string' }, value: { type: 'string' } },
        required: ['label', 'value'],
      },
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: "e.g. 'Mon · Nov 16' — mark genuinely uncertain dates with a trailing '?'" },
          time: { type: 'string', description: "e.g. 'Morning', 'Full day', 'Evening'" },
          title: { type: 'string' },
          description: { type: 'string' },
          flag: { type: 'string', description: "optional short tag like 'Must-see' or 'To confirm' — omit if nothing stands out" },
        },
        required: ['date', 'time', 'title', 'description'],
      },
    },
    food: {
      type: 'array',
      description: 'Restaurants, cafes, markets, shops mentioned or clearly implied by the source',
      items: {
        type: 'object',
        properties: { category: { type: 'string' }, name: { type: 'string' }, note: { type: 'string' } },
        required: ['category', 'name'],
      },
    },
    notes: {
      type: 'array',
      description: "Practical tips grouped by topic, drawn from what's actually in the source",
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', description: "e.g. 'Getting around', 'Visa & docs', 'Pack for the weather'" },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['category', 'items'],
      },
    },
    openQuestions: {
      type: 'array',
      description: 'Things genuinely unclear or unconfirmed in the source — never invent an answer, flag it here instead',
      items: { type: 'string' },
    },
  },
  required: ['title', 'days'],
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function buildContentBlocks(form) {
  const text = (form.get('text') || '').toString().trim()
  const files = form.getAll('files').filter((f) => f instanceof File)

  if (files.length > MAX_FILES) {
    throw new Error(`Too many files — max ${MAX_FILES} per request.`)
  }

  const blocks = []
  if (text) {
    blocks.push({ type: 'text', text: `Trip planning notes:\n\n${text}` })
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is over 15MB.`)
    }
    const buffer = await file.arrayBuffer()
    const data = bufferToBase64(buffer)
    if (file.type === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } })
    } else if (file.type.startsWith('image/')) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: file.type, data } })
    } else {
      throw new Error(`"${file.name}" isn't a supported type — only PDF and images.`)
    }
  }

  if (blocks.length === 0) {
    throw new Error('Paste some notes or attach a file first.')
  }
  return blocks
}

async function callAnthropic(env, contentBlocks) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: 'generate_itinerary',
          description: 'Return the structured itinerary extracted from the trip planning material.',
          input_schema: ITINERARY_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'generate_itinerary' },
      messages: [{ role: 'user', content: contentBlocks }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error('Anthropic API error', res.status, errBody)
    throw new Error(`The model call failed (${res.status}) — try again in a moment.`)
  }

  const data = await res.json()
  const toolUse = data.content?.find((block) => block.type === 'tool_use' && block.name === 'generate_itinerary')
  if (!toolUse) {
    throw new Error('The model did not return a structured itinerary — try rephrasing your notes.')
  }
  return toolUse.input
}

function makeShortId() {
  const bytes = new Uint8Array(SHORT_ID_LENGTH)
  crypto.getRandomValues(bytes)
  let id = ''
  for (let i = 0; i < SHORT_ID_LENGTH; i++) {
    id += SHORT_ID_ALPHABET[bytes[i] % SHORT_ID_ALPHABET.length]
  }
  return id
}

async function handleGenerate(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'Server is missing an API key — set ANTHROPIC_API_KEY.' }, 500)
  }
  try {
    const form = await request.formData()
    const contentBlocks = await buildContentBlocks(form)
    const itinerary = await callAnthropic(env, contentBlocks)
    return jsonResponse(itinerary)
  } catch (err) {
    return jsonResponse({ error: err.message || 'Something went wrong.' }, 400)
  }
}

async function handleCreateShare(request, env) {
  if (!env.TRIPS_KV) {
    return jsonResponse({ error: 'Sharing is not configured on this server.' }, 500)
  }
  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }

  const days = Number(body?.days)
  if (!ALLOWED_EXPIRY_DAYS.includes(days)) {
    return jsonResponse({ error: `Expiration must be one of: ${ALLOWED_EXPIRY_DAYS.join(', ')} days.` }, 400)
  }
  if (!body?.trip || typeof body.trip !== 'object' || !body.trip.title) {
    return jsonResponse({ error: 'Missing trip data.' }, 400)
  }

  const payload = JSON.stringify(body.trip)
  if (payload.length > MAX_SHARED_TRIP_BYTES) {
    return jsonResponse({ error: 'This itinerary is too large to share.' }, 400)
  }

  let id
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = makeShortId()
    const existing = await env.TRIPS_KV.get(candidate)
    if (!existing) {
      id = candidate
      break
    }
  }
  if (!id) {
    return jsonResponse({ error: 'Could not generate a unique link — try again.' }, 500)
  }

  const expirationTtl = days * 24 * 60 * 60
  await env.TRIPS_KV.put(id, payload, { expirationTtl })

  return jsonResponse({ id, expiresAt: Date.now() + expirationTtl * 1000 })
}

async function handleGetShare(id, env) {
  if (!env.TRIPS_KV) {
    return jsonResponse({ error: 'Sharing is not configured on this server.' }, 500)
  }
  const stored = await env.TRIPS_KV.get(id)
  if (!stored) {
    return jsonResponse({ error: 'This link has expired or does not exist.' }, 404)
  }
  return new Response(stored, {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const shareMatch = url.pathname.match(/^\/share\/([A-Za-z0-9]+)$/)

    if (url.pathname === '/generate' && request.method === 'POST') {
      return handleGenerate(request, env)
    }
    if (url.pathname === '/share' && request.method === 'POST') {
      return handleCreateShare(request, env)
    }
    if (shareMatch && request.method === 'GET') {
      return handleGetShare(shareMatch[1], env)
    }
    return jsonResponse({ error: 'Not found' }, 404)
  },
}
