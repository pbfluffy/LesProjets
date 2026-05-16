import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { LS_KEYS } from '../config'

// A trip is an ordered chain of place IDs the user assembles for a day out.
// Shape: { id, name, placeIds: string[], createdAt }
// Persisted to localStorage via useLocalStorage — no backend, same as Saved.

function newId() {
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function useTrips() {
  const [trips, setTrips] = useLocalStorage(LS_KEYS.TRIPS, [])

  const createTrip = useCallback(
    (name) => {
      const trip = {
        id: newId(),
        name: (name || '').trim() || 'Untitled trip',
        placeIds: [],
        createdAt: Date.now(),
      }
      setTrips((ts) => [trip, ...ts])
      return trip
    },
    [setTrips]
  )

  const renameTrip = useCallback(
    (id, name) => {
      const trimmed = (name || '').trim()
      if (!trimmed) return
      setTrips((ts) => ts.map((t) => (t.id === id ? { ...t, name: trimmed } : t)))
    },
    [setTrips]
  )

  const deleteTrip = useCallback(
    (id) => setTrips((ts) => ts.filter((t) => t.id !== id)),
    [setTrips]
  )

  const addPlace = useCallback(
    (tripId, placeId) =>
      setTrips((ts) =>
        ts.map((t) =>
          t.id === tripId && !t.placeIds.includes(placeId)
            ? { ...t, placeIds: [...t.placeIds, placeId] }
            : t
        )
      ),
    [setTrips]
  )

  const removePlace = useCallback(
    (tripId, placeId) =>
      setTrips((ts) =>
        ts.map((t) =>
          t.id === tripId
            ? { ...t, placeIds: t.placeIds.filter((p) => p !== placeId) }
            : t
        )
      ),
    [setTrips]
  )

  // dir: -1 moves the stop one earlier, +1 moves it one later
  const movePlace = useCallback(
    (tripId, index, dir) =>
      setTrips((ts) =>
        ts.map((t) => {
          if (t.id !== tripId) return t
          const j = index + dir
          if (j < 0 || j >= t.placeIds.length) return t
          const next = [...t.placeIds]
          ;[next[index], next[j]] = [next[j], next[index]]
          return { ...t, placeIds: next }
        })
      ),
    [setTrips]
  )

  return { trips, createTrip, renameTrip, deleteTrip, addPlace, removePlace, movePlace }
}
