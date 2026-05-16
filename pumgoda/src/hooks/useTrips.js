import { useCallback, useSyncExternalStore } from 'react'
import { LS_KEYS } from '../config'

// Shared trip store. A trip is an ordered chain of place IDs.
// Module-level singleton so every useTrips() caller (TripBuilder, PlaceDetail)
// sees the same data and re-renders together — no two-writer clobbering.

function newId() {
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEYS.TRIPS)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

let trips = load()
const listeners = new Set()

function emit() {
  try {
    localStorage.setItem(LS_KEYS.TRIPS, JSON.stringify(trips))
  } catch {
    /* quota / disabled — non-fatal */
  }
  for (const l of listeners) l()
}

function setTrips(updater) {
  trips = typeof updater === 'function' ? updater(trips) : updater
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return trips
}

export function useTrips() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const createTrip = useCallback((name) => {
    const trip = {
      id: newId(),
      name: (name || '').trim() || 'Untitled trip',
      placeIds: [],
      createdAt: Date.now(),
    }
    setTrips((ts) => [trip, ...ts])
    return trip
  }, [])

  const renameTrip = useCallback((id, name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return
    setTrips((ts) => ts.map((t) => (t.id === id ? { ...t, name: trimmed } : t)))
  }, [])

  const deleteTrip = useCallback((id) => {
    setTrips((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const addPlace = useCallback((tripId, placeId) => {
    setTrips((ts) =>
      ts.map((t) =>
        t.id === tripId && !t.placeIds.includes(placeId)
          ? { ...t, placeIds: [...t.placeIds, placeId] }
          : t
      )
    )
  }, [])

  const removePlace = useCallback((tripId, placeId) => {
    setTrips((ts) =>
      ts.map((t) =>
        t.id === tripId
          ? { ...t, placeIds: t.placeIds.filter((p) => p !== placeId) }
          : t
      )
    )
  }, [])

  const movePlace = useCallback((tripId, index, dir) => {
    setTrips((ts) =>
      ts.map((t) => {
        if (t.id !== tripId) return t
        const j = index + dir
        if (j < 0 || j >= t.placeIds.length) return t
        const next = [...t.placeIds]
        ;[next[index], next[j]] = [next[j], next[index]]
        return { ...t, placeIds: next }
      })
    )
  }, [])

  return { trips: list, createTrip, renameTrip, deleteTrip, addPlace, removePlace, movePlace }
}
