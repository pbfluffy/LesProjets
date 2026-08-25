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

// Returns whether the write actually landed — a full localStorage quota
// (this app shares its origin's storage with sibling apps in the monorepo)
// silently failed here before, while callers still told the user "Saved".
function writeAll(entries) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
    return true
  } catch {
    return false
  }
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
    let ok = true
    setEntries(prev => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES)
      ok = writeAll(next)
      return next
    })
    return { ...entry, ok }
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

  const replaceEntries = useCallback((newEntries) => {
    const arr = Array.isArray(newEntries) ? newEntries : []
    writeAll(arr)
    setEntries(arr)
  }, [])

  const update = useCallback((id, tab, state) => {
    const trimmedName = (state?.billName || '').trim()
    let ok = true
    setEntries(prev => {
      const next = prev.map(e => e.id === id
        ? { ...e, savedAt: Date.now(), tab, billName: trimmedName, state }
        : e
      )
      ok = writeAll(next)
      return next
    })
    return { id, ok }
  }, [])

  return { entries, save, update, remove, clear, replaceEntries }
}
