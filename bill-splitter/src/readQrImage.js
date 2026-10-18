// Decode the QR code in an image file (e.g. a screenshot of a bank app's
// receive-money QR). jsQR is loaded on demand so it doesn't weigh down the
// main bundle. Returns the QR's text, or null if no QR was found.
export async function readQrImage(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    // Large phone photos: scale down for speed; QR screenshots stay sharp.
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    const { default: jsQR } = await import('jsqr')
    return jsQR(data, w, h)?.data ?? null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
