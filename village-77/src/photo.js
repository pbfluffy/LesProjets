// Shrinks a picked photo to a small JPEG data URL so it can live inside the
// Firestore doc itself (no Storage bucket / upload step). A post holds up to
// MAX_PHOTOS of these and a Firestore doc is capped at 1 MB, so each one is
// kept under 200 KB: 1000px on the long side, stepping quality (then size)
// down until it fits.
export const MAX_PHOTOS = 4
const MAX_CHARS = 200000

export async function photoToDataUrl(file) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  try {
    for (const side of [1000, 800, 600]) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.75, 0.6, 0.45]) {
        const url = canvas.toDataURL('image/jpeg', quality)
        if (url.length <= MAX_CHARS) return url
      }
    }
  } finally {
    bitmap.close?.()
  }
  throw new Error('photo too large')
}
