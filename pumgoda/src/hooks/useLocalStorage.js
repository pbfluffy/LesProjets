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

  // BUG-03 — cross-tab sync. Storage events fire only in OTHER tabs (not the
  // one that wrote), so listening here keeps tabs in lockstep without looping
  // against the persist effect above. Without this, tab B's React state stays
  // stale and its next write clobbers tab A's update.
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== key) return
      if (e.newValue === null) {
        // Key was removed elsewhere — fall back to initial
        setValue(initial)
        return
      }
      try {
        setValue(JSON.parse(e.newValue))
      } catch {
        // Bad JSON from elsewhere — ignore
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, initial])

  return [value, setValue]
}
