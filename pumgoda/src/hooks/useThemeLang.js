import { useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { LS_KEYS } from '../config'

// Theme: 'light' | 'dark'. Initial guess from prefers-color-scheme; persisted thereafter.
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
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  }, [theme])

  return [theme, setTheme]
}

// Language: 'th' | 'en'. Defaults to 'th' to match the portfolio's default.
export function useLang() {
  const [lang, setLang] = useLocalStorage(LS_KEYS.LANG, 'th')

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  return [lang, setLang]
}
