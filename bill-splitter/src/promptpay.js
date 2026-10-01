// PromptPay QR payload generator (EMVCo merchant-presented QR + CRC-16/CCITT).
// Output string can be passed straight to any QR encoder.
//
// Supports:
//   - Mobile number (10 digits, leading 0) → sub-tag 01, formatted as 0066XXXXXXXXX
//   - National ID / Tax ID (13 digits)     → sub-tag 02
//   - e-Wallet ID (15 digits)              → sub-tag 03
//   - Bank account                         → sub-tag 04, bank code (3) + account no.
//
// Bank accounts are stored in the same string field as PromptPay ids, encoded
// as `bank:<code>:<account>` (e.g. `bank:004:1234567890`), so bills, share
// links and saved payees carry them without any schema change. Sub-tag 04 is
// marked "reserved" in some references — support varies by banking app.

// Bank of Thailand bank codes for retail banks people actually transfer to.
export const THAI_BANKS = [
  { code: '002', en: 'Bangkok Bank', th: 'กรุงเทพ' },
  { code: '004', en: 'KBank', th: 'กสิกรไทย' },
  { code: '006', en: 'Krungthai', th: 'กรุงไทย' },
  { code: '011', en: 'ttb', th: 'ทีทีบี' },
  { code: '014', en: 'SCB', th: 'ไทยพาณิชย์' },
  { code: '022', en: 'CIMB Thai', th: 'ซีไอเอ็มบี' },
  { code: '024', en: 'UOB', th: 'ยูโอบี' },
  { code: '025', en: 'Krungsri', th: 'กรุงศรี' },
  { code: '030', en: 'GSB', th: 'ออมสิน' },
  { code: '033', en: 'GH Bank', th: 'ธอส.' },
  { code: '034', en: 'BAAC', th: 'ธ.ก.ส.' },
  { code: '066', en: 'Islamic Bank', th: 'อิสลาม' },
  { code: '067', en: 'Tisco', th: 'ทิสโก้' },
  { code: '069', en: 'KKP', th: 'เกียรตินาคินภัทร' },
  { code: '071', en: 'Thai Credit', th: 'ไทยเครดิต' },
  { code: '073', en: 'LH Bank', th: 'แลนด์ แอนด์ เฮ้าส์' },
]

const BANK_PREFIX = 'bank:'

/** Parse a stored value. Returns { code, account } for bank values, else null. */
export function parseBankTarget(raw) {
  const s = (raw || '').trim()
  if (!s.startsWith(BANK_PREFIX)) return null
  const [code = '', account = ''] = s.slice(BANK_PREFIX.length).split(':')
  return { code, account: account.replace(/\D/g, '') }
}

/** Encode a bank account into the shared promptPay string field. */
export function encodeBankTarget(code, account) {
  const acc = (account || '').replace(/\D/g, '')
  if (!code && !acc) return ''
  return `${BANK_PREFIX}${code || ''}:${acc}`
}

export function bankName(code, lang = 'en') {
  const b = THAI_BANKS.find(x => x.code === code)
  return b ? (lang === 'th' ? b.th : b.en) : ''
}

/**
 * Human-readable form of a stored value, for display and share text.
 * label — "PromptPay" or the bank name; text — what to show/copy.
 */
export function describePayTarget(raw, lang = 'en') {
  const bank = parseBankTarget(raw)
  if (!bank) return { label: 'PromptPay', text: (raw || '').trim(), isBank: false }
  const label = bankName(bank.code, lang) || (lang === 'th' ? 'ธนาคาร' : 'Bank')
  return { label, text: bank.account, isBank: true }
}

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
  const bank = parseBankTarget(raw)
  if (bank) {
    // Most banks use 10-digit accounts; GSB / BAAC / GHB use 12.
    if (!THAI_BANKS.some(b => b.code === bank.code)) return null
    if (bank.account.length < 10 || bank.account.length > 12) return null
    return { value: bank.code + bank.account, subTag: '04' }
  }
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
 * @param {string} rawId - mobile/NID/eWallet (digits, dashes, spaces all OK),
 *   or an encoded bank account (see encodeBankTarget)
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
