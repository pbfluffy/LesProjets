// Shared receipt scanning utilities — used by ReceiptScanner and TripReceiptScanner

export const WORKER_URL = 'https://bill-splitter-receipt.pbfluffygaming.workers.dev/'
export const MAX_DIM = 1568
export const JPEG_QUALITY = 0.85
export const SCAN_CAP = 10
export const SCAN_KEY = 'billSplitter_scanCount'

export const CURRENCY_FLAGS = { THB: '🇹🇭', KRW: '🇰🇷', JPY: '🇯🇵', USD: '🇺🇸', EUR: '🇪🇺', SGD: '🇸🇬', HKD: '🇭🇰', GBP: '🇬🇧', AUD: '🇦🇺', CAD: '🇨🇦', CNY: '🇨🇳' }

export function getScanCount() {
  try { return parseInt(sessionStorage.getItem(SCAN_KEY) || '0', 10) || 0 } catch { return 0 }
}
export function bumpScanCount() {
  try { sessionStorage.setItem(SCAN_KEY, String(getScanCount() + 1)) } catch {}
}

export function localizeError(msg, t) {
  if (typeof msg !== 'string') return String(msg)
  const m = msg.toLowerCase()
  if (m.includes('payment slip')) return t.receiptErrPaymentSlip ?? 'This looks like a payment slip — please scan the itemized order receipt instead.'
  if (m.includes('no receipt')) return t.receiptErrNoReceipt
  if (m.includes('could not load image') || m.includes('could not read image') || m.includes('could not encode image')) return t.receiptErrReadImage
  if (m.startsWith('api ') || m.startsWith('bad json')) return t.receiptErrService
  return msg
}

export async function compressImage(file) {
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
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
        'image/jpeg', JPEG_QUALITY,
      )
    )
    return await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result.split(',')[1])
      r.onerror = () => reject(new Error('Could not read image'))
      r.readAsDataURL(blob)
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const PROMPT = `You are extracting line items from a restaurant or shop receipt photo.

Respond ONLY with valid JSON, no markdown fences, no preamble:

{
  "merchantName": "<the restaurant or shop name translated to English; null if not legible>",
  "currency": "<ISO 4217 currency code detected from the receipt, e.g. THB, KRW, JPY, USD; null if unknown>",
  "items": [
    {"name": "<item name translated to English>", "originalName": "<item name in original language, omit if already English>", "price": <number>}
  ],
  "vatIncluded": <true|false|null>,
  "serviceChargeIncluded": <true|false|null>,
  "serviceChargeRate": <number|null>,
  "billDiscount": <positive number if there is a bill-level discount/coupon/promo deduction shown on the receipt, otherwise null>,
  "billDiscountLabel": "<short description of the discount reason e.g. promo name, null if none>",
  "confidence": "<high|medium|low>"
}

IMPORTANT: Do NOT include discount line items inside "items". Extract them as "billDiscount" instead.
If the image is not a receipt or is a payment slip:
{"error": "no receipt"}
{"error": "payment slip"}`

export async function scanReceipt(base64Image) {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
        { text: PROMPT },
      ]}],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`)
  }
  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No text in response')
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try { return JSON.parse(cleaned) } catch { throw new Error(`Bad JSON: ${cleaned.slice(0, 200)}`) }
}
