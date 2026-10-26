// Money as people read it: thousands separators, fixed decimals —
// "1,269.98", "150,000" (yen / won have no decimals). Display only; amounts
// that go into a QR code or a copy-to-banking-app field stay plain numbers.
export function money(n, decimals = 2) {
  return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
