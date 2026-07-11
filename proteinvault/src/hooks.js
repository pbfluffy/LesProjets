import { useEffect, useState } from 'react'

// Theme hook — mirrors the pattern used across bill-splitter / pumgoda /
// nutritions-thailand: plain string in localStorage["theme"], NEVER
// JSON-encoded, shared across all apps on the same origin if this ever
// gets deployed under pumbafluffycorgi.com.
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return [theme, setTheme]
}
