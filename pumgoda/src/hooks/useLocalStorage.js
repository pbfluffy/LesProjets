import { useEffect, useState } from 'react'

// Tiny useState wrapper that persists to localStorage.
// Reads once on mount; writes on every set.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Quota or disabled — silently skip
    }
  }, [key, value])

  return [value, setValue]
}
