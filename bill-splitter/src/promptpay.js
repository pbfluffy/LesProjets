// PromptPay QR payload generator (EMVCo merchant-presented QR + CRC-16/CCITT).
// Output string can be passed straight to any QR encoder.
//
// Supports:
//   - Mobile number (10 digits, leading 0) → sub-tag 01, formatted as 0066XXXXXXXXX
//   - National ID / Tax ID (13 digits)     → sub-tag 02
//   - e-Wallet ID (15 digits)              → sub-tag 03
//
// The payee can also be a plain bank account, stored in the same string field
// as PromptPay ids, encoded as `bank:<code>:<account>` (e.g.
// `bank:004:1234567890`), so bills, share links and saved payees carry it
// without any schema change. Bank accounts never get a QR: the Thai QR
// sub-tag for them (29.04) is reserved, and banking apps scan it as a blank
// PromptPay recipient (tested with a real app, Oct 2026). The UI shows a
// copyable transfer card (BankTransferCard) for them instead.

// Bank of Thailand bank codes for retail banks people actually transfer to.
// color = approximate brand (CI) colour, used for the swatch in the bank picker.
export const THAI_BANKS = [
  { code: '002', en: 'Bangkok Bank', th: 'กรุงเทพ', color: '#1E4598' },
  { code: '004', en: 'KBank', th: 'กสิกรไทย', color: '#138F2D' },
  { code: '006', en: 'Krungthai', th: 'กรุงไทย', color: '#1BA5E1' },
  { code: '011', en: 'ttb', th: 'ทีทีบี', color: '#0050F0' },
  { code: '014', en: 'SCB', th: 'ไทยพาณิชย์', color: '#4E2E7F' },
  { code: '022', en: 'CIMB Thai', th: 'ซีไอเอ็มบี', color: '#EC1C24' },
  { code: '024', en: 'UOB', th: 'ยูโอบี', color: '#0B3B8C' },
  { code: '025', en: 'Krungsri', th: 'กรุงศรี', color: '#FEC43B' },
  { code: '030', en: 'GSB', th: 'ออมสิน', color: '#EB198D' },
  { code: '033', en: 'GH Bank', th: 'ธอส.', color: '#F57D23' },
  { code: '034', en: 'BAAC', th: 'ธ.ก.ส.', color: '#4B9B2E' },
  { code: '066', en: 'Islamic Bank', th: 'อิสลาม', color: '#1A6B3C' },
  { code: '067', en: 'Tisco', th: 'ทิสโก้', color: '#12549F' },
  { code: '069', en: 'KKP', th: 'เกียรตินาคินภัทร', color: '#5F4F87' },
  { code: '071', en: 'Thai Credit', th: 'ไทยเครดิต', color: '#F7941D' },
  { code: '073', en: 'LH Bank', th: 'แลนด์ แอนด์ เฮ้าส์', color: '#6D6E71' },
]

const BANK_PREFIX = 'bank:'

/** Parse a stored value. Returns { code, account } for bank values, else null. */
// Optional 4th part: the PromptPay id read from the bank app's receive-money
// QR (`bank:004:1234567890:004999003141560`), so a bank payee can also get a
// scan-to-pay QR. Older 3-part values still parse (qrId '').
export function parseBankTarget(raw) {
  const s = (raw || '').trim()
  if (!s.startsWith(BANK_PREFIX)) return null
  const [code = '', account = '', qrId = ''] = s.slice(BANK_PREFIX.length).split(':')
  return { code, account: account.replace(/\D/g, ''), qrId: qrId.replace(/\D/g, '') }
}

/** Encode a bank account into the shared promptPay string field. */
export function encodeBankTarget(code, account, qrId) {
  const acc = (account || '').replace(/\D/g, '')
  const qr = (qrId || '').replace(/\D/g, '')
  if (!code && !acc && !qr) return ''
  return `${BANK_PREFIX}${code || ''}:${acc}${qr ? `:${qr}` : ''}`
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
  return { label, text: bank.account || 'QR', isBank: true, hasQr: !!bank.qrId }
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
  // Must reject bank targets explicitly: their digits ("004" + a 10-digit
  // account) would otherwise read as a 13-digit national ID.
  if (parseBankTarget(raw)) return null
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

/** A complete bank target: a known bank and a 10–12 digit account (GSB / BAAC / GHB use 12). */
export function isValidBankTarget(raw) {
  const bank = parseBankTarget(raw)
  if (!bank || !THAI_BANKS.some(b => b.code === bank.code)) return false
  const accountOk = bank.account.length >= 10 && bank.account.length <= 12
  const qrOk = formatPromptPayId(bank.qrId) !== null
  if (bank.account && !accountOk) return false
  if (bank.qrId && !qrOk) return false
  return accountOk || qrOk // a QR alone is enough to get paid
}

/**
 * The PromptPay id to build a scan-to-pay QR from: the id itself for a
 * PromptPay payee, the attached QR id for a bank payee, else null.
 */
export function qrIdOf(raw) {
  const bank = parseBankTarget(raw)
  const id = bank ? bank.qrId : (raw || '').trim()
  return id && formatPromptPayId(id) ? id : null
}

/** Whether the payee can be paid: a valid PromptPay id (QR) or a valid bank account (transfer card). */
export function isValidPayTarget(raw) {
  return parseBankTarget(raw) ? isValidBankTarget(raw) : formatPromptPayId(raw) !== null
}

/**
 * Build a PromptPay QR payload string.
 * @param {string} rawId - mobile/NID/eWallet (digits, dashes, spaces all OK).
 *   Bank targets return null — they can't be paid by QR (see top of file).
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

function parseTlv(str) {
  const out = {}
  let i = 0
  while (i + 4 <= str.length) {
    const tag = str.slice(i, i + 2)
    const len = Number(str.slice(i + 2, i + 4))
    if (!Number.isInteger(len) || i + 4 + len > str.length) return null
    out[tag] = str.slice(i + 4, i + 4 + len)
    i += 4 + len
  }
  return i === str.length ? out : null
}

/**
 * Read the PromptPay id out of a scanned PromptPay QR — e.g. the "receive
 * money" QR a banking app makes for an account. Those don't contain the
 * account number: the bank registers a PromptPay id for the account (K PLUS
 * uses a 15-digit e-Wallet-style "reference number" like 004999003141560)
 * and puts that in the QR, so it can be reused as-is for our own QRs.
 * @returns {{ id: string } | { error: 'not-qr-payment' | 'not-promptpay' }}
 */
export function parsePromptPayQr(payload) {
  const s = (payload || '').trim()
  const crcAt = s.lastIndexOf('6304')
  if (crcAt < 0 || crcAt !== s.length - 8 || crc16(s.slice(0, crcAt + 4)) !== s.slice(-4).toUpperCase()) {
    return { error: 'not-qr-payment' }
  }
  const top = parseTlv(s)
  if (!top) return { error: 'not-qr-payment' }
  const merchant = top['29'] && parseTlv(top['29'])
  if (!merchant || merchant['00'] !== 'A000000677010111') return { error: 'not-promptpay' }
  if (merchant['01']) return { id: '0' + merchant['01'].slice(-9) }  // 0066XXXXXXXXX → 0XXXXXXXXX
  if (merchant['02']) return { id: merchant['02'] }
  if (merchant['03']) return { id: merchant['03'] }
  return { error: 'not-promptpay' }
}
