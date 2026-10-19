// Shrinks a picked photo to a small JPEG data URL so it can live inside the
// Firestore doc itself (no Storage bucket / upload step). A Firestore doc is
// capped at 1 MB, so each kind of photo gets a size budget:
//   handyman: up to 4 photos × 200 KB
//   shop:     up to 2 shop photos × 150 KB + up to 15 item photos × 40 KB
// Steps quality, then size, down until the photo fits its budget.
export const PHOTO_BIG = { maxChars: 200000, sides: [1000, 800, 600] }
export const PHOTO_SHOP = { maxChars: 150000, sides: [1000, 800, 600] }
export const PHOTO_ITEM = { maxChars: 40000, sides: [480, 360, 280] }

// Firestore's per-doc limit is 1,048,576 bytes; leave room for field names.
export const MAX_DOC_CHARS = 1000000

export async function photoToDataUrl(file, { maxChars, sides } = PHOTO_BIG) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  try {
    for (const side of sides) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.75, 0.6, 0.45]) {
        const url = canvas.toDataURL('image/jpeg', quality)
        if (url.length <= maxChars) return url
      }
    }
  } finally {
    bitmap.close?.()
  }
  throw new Error('photo too large')
}
