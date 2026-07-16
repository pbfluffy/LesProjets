// Compress a photo client-side, then upload it to the majon-photo Worker,
// which stores it in R2 and returns Gemini-derived descriptive tags.
// Mirrors bill-splitter's receiptScanUtils.compressImage, but returns a Blob
// (for multipart upload) instead of a base64 string.

export const WORKER_URL = import.meta.env.VITE_MAJON_WORKER_URL || 'http://localhost:8787/'
export const MAX_DIM = 1568
export const JPEG_QUALITY = 0.85

export async function compressImageToBlob(file) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not load image'))
      i.src = objectUrl
    })
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
        'image/jpeg', JPEG_QUALITY,
      )
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function uploadDogPhoto({ file, lat, lng, idToken }) {
  const blob = await compressImageToBlob(file)
  const form = new FormData()
  form.append('file', blob, 'dog.jpg')
  form.append('lat', String(lat))
  form.append('lng', String(lng))

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  })

  if (!res.ok) {
    let message = `Upload failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch { /* non-JSON error body — keep the generic message */ }
    throw new Error(message)
  }

  return res.json() // { photoUrl, tags }
}
