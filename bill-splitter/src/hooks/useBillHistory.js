import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'

const LS_KEY = 'bill_history_v1'
// Oldest saved bills beyond this are dropped; high enough that it's not hit in
// normal use (it used to be 20, which silently discarded bills — and Trips
// that still referenced them).
const MAX_ENTRIES = 100

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

  // Always the latest list, so a save/update can build the next list and write
  // it *before* touching React state — the result then reports whether the
  // write really landed, and a failed write leaves nothing half-saved on screen.
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const commit = (next) => {
    const capped = next.slice(0, MAX_ENTRIES)
    const ok = writeAll(capped)
    if (ok) { entriesRef.current = capped; setEntries(capped) }
    return ok
  }

  const save = useCallback((tab, state) => {
    const trimmedName = (state?.billName || '').trim()
    const entry = {
      id: uuid(),
      savedAt: Date.now(),
      tab,
      billName: trimmedName,
      state,
    }
    const ok = commit([entry, ...entriesRef.current])
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
    const ok = commit(entriesRef.current.map(e => e.id === id
      ? { ...e, savedAt: Date.now(), tab, billName: trimmedName, state }
      : e
    ))
    return { id, ok }
  }, [])

  return { entries, save, update, remove, clear, replaceEntries }
}
