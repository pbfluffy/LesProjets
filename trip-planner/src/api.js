const WORKER_URL = import.meta.env.VITE_TRIP_WORKER_URL

// Sends the raw pasted text plus any attached files (PDFs, screenshots) to
// the Worker as multipart form data — avoids base64-encoding large files on
// the main thread just to stuff them into a JSON body. The Worker itself
// base64-encodes each file when building the Anthropic request, since that
// API requires base64 either way.
export async function generateItinerary({ text, files }) {
  if (!WORKER_URL) {
    throw new Error('VITE_TRIP_WORKER_URL is not set — see .env.example.')
  }
  const form = new FormData()
  form.set('text', text || '')
  files.forEach((file) => form.append('files', file, file.name))

  const res = await fetch(`${WORKER_URL}/generate`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message)
  }

  return res.json()
}
