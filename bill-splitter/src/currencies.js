// Shared currency definitions — used by useBillStore, ReceiptScanner, BillSplitter, ResultSection
export const CURRENCIES = [
  { code: 'THB', symbol: '฿',   label: '฿ THB' },
  { code: 'KRW', symbol: '₩',   label: '₩ KRW' },
  { code: 'JPY', symbol: '¥',   label: '¥ JPY' },
  { code: 'USD', symbol: '$',   label: '$ USD' },
  { code: 'EUR', symbol: '€',   label: '€ EUR' },
  { code: 'SGD', symbol: 'S$',  label: 'S$ SGD' },
  { code: 'HKD', symbol: 'HK$', label: 'HK$ HKD' },
  { code: 'GBP', symbol: '£',   label: '£ GBP' },
  { code: 'AUD', symbol: 'A$',  label: 'A$ AUD' },
  { code: 'CAD', symbol: 'C$',  label: 'C$ CAD' },
  { code: 'CNY', symbol: '¥',   label: '¥ CNY' },
]

export const DEFAULT_CURRENCY = 'THB'

export function symbolFor(code) {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? '฿'
}

// Receipt scanner OCR → currency code mapping
// Claude returns ISO 4217 codes; we normalise to our supported set.
export function normaliseCurrency(raw) {
  if (!raw || typeof raw !== 'string') return DEFAULT_CURRENCY
  const upper = raw.trim().toUpperCase()
  return CURRENCIES.find(c => c.code === upper)?.code ?? DEFAULT_CURRENCY
}
