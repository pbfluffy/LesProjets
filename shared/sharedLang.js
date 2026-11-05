// Language shared across the landing page and every app on the origin.
// Same convention as the shared `theme` key: a plain 'th' | 'en' string under
// `lang`, written by whichever page the user last toggled it on, so entering an
// app from the landing page (or hopping between apps) keeps the language.
const KEY = 'lang'

export function readSharedLang() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'th' || v === 'en' ? v : null
  } catch {
    return null
  }
}

// For apps whose language lives in a JSON-encoded localStorage hook: call once
// at module load (before first render) to point the app's own key at the shared
// language, so there's no flash of the wrong language.
export function seedAppLang(appKey) {
  const shared = readSharedLang()
  if (!shared) return
  try {
    localStorage.setItem(appKey, JSON.stringify(shared))
  } catch {
    /* storage blocked */
  }
}

export function writeSharedLang(lang) {
  try {
    if (lang === 'th' || lang === 'en') localStorage.setItem(KEY, lang)
  } catch {
    /* storage blocked — language just won't carry over */
  }
}
