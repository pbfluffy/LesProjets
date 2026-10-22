import { useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

// Theme: 'light' | 'dark'. Shared `theme` localStorage key (plain string,
// never JSON-encoded) — same convention as every other app on the origin, so
// switching theme in one app carries over to the others.
export function useTheme() {
  const initial =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' || saved === 'light' ? saved : initial
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    function onStorage(e) {
      if (e.key !== 'theme') return
      const v = e.newValue
      if (v === 'dark' || v === 'light') setTheme(v)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return [theme, setTheme]
}

// Language: 'th' | 'en'. App-local key (JSON-encoded via useLocalStorage is
// fine here — unlike `theme` this isn't a cross-app shared key).
export function useLang() {
  const [lang, setLang] = useLocalStorage('village_lang', 'th')

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  return [lang, setLang]
}

// Larger text for easier reading: zooms the whole page 15% (layout, spacing
// and text together, so nothing overlaps). Saved per browser.
const BIG_TEXT_KEY = 'village_big_text'
export function useBigText() {
  const [big, setBig] = useState(() => {
    try { return localStorage.getItem(BIG_TEXT_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    document.documentElement.style.zoom = big ? '1.15' : ''
    try { localStorage.setItem(BIG_TEXT_KEY, big ? '1' : '0') } catch { /* storage blocked */ }
  }, [big])
  return [big, setBig]
}
