import { auth } from './firebase'
import { WORKER_URL } from './config'

// Photos are shrunk on the phone, uploaded to the village-77 Worker (R2) and
// stored on the post as plain URLs. Cards lazy-load them, so opening the app
// no longer downloads every photo of every post (they used to be data URLs
// inside the Firestore docs).
export const PHOTO_BIG = { maxSide: 1280, quality: 0.8 }
export const PHOTO_ITEM = { maxSide: 800, quality: 0.8 }
const PHOTO_THUMB = { maxSide: 240, quality: 0.7 } // list cards and item rows

// The small copy's URL: <name>-t.jpg next to the photo (worker/src/index.js
// thumbKey). Photos uploaded before thumbnails existed have none — show the
// full photo then (see Thumb in PostCard).
export const thumbUrl = (url) => url.replace(/\.[a-z]+$/, '-t.jpg')

async function shrink(file, { maxSide, quality }) {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality),
    )
  } finally {
    bitmap.close?.()
  }
}

// Returns the photo's public URL. Needs a signed-in user (the Worker checks
// the Firebase ID token).
export async function uploadPhoto(file, size = PHOTO_BIG) {
  const blob = await shrink(file, size)
  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  try {
    form.append('thumb', await shrink(file, PHOTO_THUMB), 'thumb.jpg')
  } catch { /* no thumbnail: cards fall back to the full photo */ }
  const res = await fetch(WORKER_URL + '/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()) },
    body: form,
  })
  if (!res.ok) throw new Error('upload failed (' + res.status + ')')
  return (await res.json()).url
}

// Every photo URL a post uses (post photos + item photos).
export function photosOf(post) {
  return [...(post?.photos || []), ...(post?.items || []).map((it) => it.photo)].filter(Boolean)
}

// Asks the Worker to delete photos nothing uses any more. Best effort: the
// Worker only deletes the caller's own uploads, and a failure just leaves a
// stray file in storage.
export async function deletePhotos(urls) {
  if (!urls.length || !auth.currentUser) return
  try {
    await fetch(WORKER_URL + '/delete', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls }),
    })
  } catch (e) {
    console.warn('[village] photo cleanup failed:', e)
  }
}
