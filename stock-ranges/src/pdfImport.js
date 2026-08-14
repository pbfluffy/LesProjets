// Renders a broker-statement PDF's pages to JPEG images entirely in the
// browser (pdfjs-dist is dynamically imported so it never loads until the
// import modal is actually opened), then posts them to the worker's
// import endpoint for Workers-AI-vision extraction. Capped at 20 pages —
// matches the worker's own request cap.
const MAX_PAGES = 20
const MAX_WIDTH = 1600
const WORKER_URL = import.meta.env.VITE_STOCK_WORKER_URL

// pdfjs's own worker construction (via GlobalWorkerOptions.workerSrc) races
// getDocument()'s first handshake message against the worker module's own
// async startup — confirmed while building this: constructing the Worker
// ourselves and calling getDocument() immediately after hangs forever with
// no error most of the time, but reliably works once the worker's "ready"
// message has actually arrived first. So: build the worker, wait for
// ready, then hand it to pdfjs.
function createReadyPdfWorker() {
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
  const worker = new Worker(workerUrl, { type: 'module' })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('PDF worker did not start in time')), 10000)
    worker.addEventListener('message', function onMessage(e) {
      if (e.data?.action === 'ready') {
        clearTimeout(timer)
        worker.removeEventListener('message', onMessage)
        resolve(worker)
      }
    })
    worker.addEventListener('error', (e) => {
      clearTimeout(timer)
      reject(new Error(e.message || 'PDF worker failed to start'))
    })
  })
}

export async function renderPdfToImages(file, onProgress) {
  const [pdfjsLib, worker] = await Promise.all([
    import('pdfjs-dist'),
    createReadyPdfWorker(),
  ])
  pdfjsLib.GlobalWorkerOptions.workerPort = worker

  const buf = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buf }).promise
  const pageCount = Math.min(doc.numPages, MAX_PAGES)
  const images = []
  try {
    for (let i = 1; i <= pageCount; i++) {
      onProgress?.(i, pageCount)
      const page = await doc.getPage(i)
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = Math.min(2, MAX_WIDTH / baseViewport.width)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
      if (blob) images.push(blob)
    }
  } finally {
    // Cleanup failing here shouldn't discard pages that already rendered
    // successfully — worst case the worker thread lingers until the tab
    // closes, which is far better than losing a completed render.
    try {
      await doc.destroy()
    } catch {
      worker.terminate()
    }
  }
  return images
}

function codedError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

// Returns { rows: [{symbol, shares, avgCost, currency, page}, ...] }.
// Throws an Error with a `code` (RATE_LIMIT | NETWORK | SERVICE | CONFIG) so
// the caller can show a localized message — the message text here is only
// an English fallback for non-UI contexts (e.g. console logs).
export async function importHoldingsFromImages(images) {
  if (!WORKER_URL) {
    throw codedError('CONFIG', 'Worker URL not configured (VITE_STOCK_WORKER_URL)')
  }
  const form = new FormData()
  images.forEach((blob, i) => form.append('pages', blob, `page-${i + 1}.jpg`))

  let res
  try {
    res = await fetch(WORKER_URL, { method: 'POST', body: form })
  } catch {
    throw codedError('NETWORK', 'Network error — could not reach the import service')
  }

  if (res.status === 429) {
    throw codedError('RATE_LIMIT', 'Too many imports recently — try again in a bit')
  }
  if (!res.ok) {
    throw codedError('SERVICE', 'Import service error')
  }
  return res.json()
}
