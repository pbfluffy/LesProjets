// Translate helper: accepts either a plain string (no translation needed)
// or an object {th, en, ...}. Falls back gracefully.
export function tr(value, lang) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value[lang] ?? value.en ?? value.th ?? ''
  }
  return String(value)
}
