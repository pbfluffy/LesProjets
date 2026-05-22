import { useState, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'

const LS_KEY = 'bill_history_v1'
const MAX_ENTRIES = 20

function readAll() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(entries) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {}
}

/**
 * Bill history hook.
 *
 * An entry has shape:
 *   { id, savedAt, tab, billName, state }
 * where `state` is the same snapshot shape used by share.js.
 */
export function useBillHistory() {
  const [entries, setEntries] = useState(() => readAll())

  // Cross-tab sync — if another tab edits history, we update too.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEY) setEntries(readAll())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const save = useCallback((tab, state) => {
    const trimmedName = (state?.billName || '').trim()
    const entry = {
      id: uuid(),
      savedAt: Date.now(),
      tab,
      billName: trimmedName,
      state,
    }
    setEntries(prev => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES)
      writeAll(next)
      return next
    })
    return entry
  }, [])

  const remove = useCallback((id) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id)
      writeAll(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    writeAll([])
    setEntries([])
  }, [])

  return { entries, save, remove, clear }
}
