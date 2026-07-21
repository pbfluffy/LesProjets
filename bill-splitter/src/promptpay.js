// PromptPay QR payload generator (EMVCo merchant-presented QR + CRC-16/CCITT).
// Output string can be passed straight to any QR encoder.
//
// Supports:
//   - Mobile number (10 digits, leading 0) → sub-tag 01, formatted as 0066XXXXXXXXX
//   - National ID / Tax ID (13 digits)     → sub-tag 02
//   - e-Wallet ID (15 digits)              → sub-tag 03

function tlv(tag, value) {
  const len = value.length.toString().padStart(2, '0')
  return tag + len + value
}

function crc16(payload) {
  // CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, xorout 0x0000
  let crc = 0xFFFF
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function formatPromptPayId(raw) {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) {
    return { value: '0066' + digits.substring(1), subTag: '01' }
  }
  if (digits.length === 13) {
    return { value: digits, subTag: '02' }
  }
  if (digits.length === 15) {
    return { value: digits, subTag: '03' }
  }
  return null
}

export function isValidPromptPayId(raw) {
  return formatPromptPayId(raw) !== null
}

/**
 * Build a PromptPay QR payload string.
 * @param {string} rawId - mobile/NID/eWallet (digits, dashes, spaces all OK)
 * @param {number} [amount] - optional THB amount; omit/0 for "any amount" QR
 * @returns {string|null} payload string, or null if id invalid
 */
export function buildPromptPayPayload(rawId, amount) {
  const fmt = formatPromptPayId(rawId)
  if (!fmt) return null

  const hasAmount = typeof amount === 'number' && isFinite(amount) && amount > 0
  const merchant = tlv('00', 'A000000677010111') + tlv(fmt.subTag, fmt.value)

  let payload = ''
  payload += tlv('00', '01')                       // Payload Format Indicator
  payload += tlv('01', hasAmount ? '12' : '11')    // POI Method (12 = dynamic, 11 = static)
  payload += tlv('29', merchant)                   // Merchant Account Info (Thailand)
  payload += tlv('53', '764')                      // Currency = THB
  if (hasAmount) payload += tlv('54', amount.toFixed(2))
  payload += tlv('58', 'TH')                       // Country
  payload += '6304'                                // CRC tag + length (value computed next)
  payload += crc16(payload)
  return payload
}
