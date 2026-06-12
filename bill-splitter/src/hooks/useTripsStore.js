/**
 * useTripsStore — Trip mode for Bill Splitter (#128)
 *
 * A trip is a named container with a shared member list, currency,
 * and an ordered list of bill IDs referencing entries in bill history.
 *
 * Stored in localStorage under TRIPS_KEY.
 * Cloud sync deferred — requires Firestore rules update (laptop).
 *
 * Shape:
 *   Trip: { id, name, members, currency, createdAt, billIds: string[] }
 */
import { useState, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'

const TRIPS_KEY = 'bill_trips_v1'
const MAX_TRIPS = 50

function readAll() {
  try {
    const raw = localStorage.getItem(TRIPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeAll(trips) {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips.slice(0, MAX_TRIPS)))
  } catch {}
}

export function useTripsStore() {
  const [trips, setTrips] = useState(() => readAll())

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e) => { if (e.key === TRIPS_KEY) setTrips(readAll()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const persist = useCallback((next) => {
    writeAll(next)
    setTrips(next)
  }, [])

  // Create a new trip
  const createTrip = useCallback((name, members = [], currency = 'THB') => {
    const trip = { id: uuid(), name: name.trim().slice(0, 60), members, currency, createdAt: Date.now(), billIds: [] }
    setTrips(prev => {
      const next = [trip, ...prev]
      writeAll(next)
      return next
    })
    return trip
  }, [])

  // Update trip fields (name, members, currency)
  const updateTrip = useCallback((id, patch) => {
    setTrips(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t)
      writeAll(next)
      return next
    })
  }, [])

  // Delete a trip (does not delete its bills from history)
  const deleteTrip = useCallback((id) => {
    setTrips(prev => {
      const next = prev.filter(t => t.id !== id)
      writeAll(next)
      return next
    })
  }, [])

  // Add a bill (history entry id) to a trip
  const addBillToTrip = useCallback((tripId, billId) => {
    setTrips(prev => {
      const next = prev.map(t =>
        t.id === tripId && !t.billIds.includes(billId)
          ? { ...t, billIds: [...t.billIds, billId] }
          : t
      )
      writeAll(next)
      return next
    })
  }, [])

  // Remove a bill from a trip
  const removeBillFromTrip = useCallback((tripId, billId) => {
    setTrips(prev => {
      const next = prev.map(t =>
        t.id === tripId ? { ...t, billIds: t.billIds.filter(b => b !== billId) } : t
      )
      writeAll(next)
      return next
    })
  }, [])

  // Reorder bills within a trip
  const reorderBills = useCallback((tripId, fromIdx, toIdx) => {
    setTrips(prev => {
      const next = prev.map(t => {
        if (t.id !== tripId) return t
        const ids = [...t.billIds]
        const [moved] = ids.splice(fromIdx, 1)
        ids.splice(toIdx, 0, moved)
        return { ...t, billIds: ids }
      })
      writeAll(next)
      return next
    })
  }, [])

  // Get a single trip by id
  const getTrip = useCallback((id) => trips.find(t => t.id === id) ?? null, [trips])

  // Compute per-person totals across all bills in a trip
  // entries = all history entries (from useBillHistory)
  const tripSummary = useCallback((tripId, entries) => {
    const trip = trips.find(t => t.id === tripId)
    if (!trip) return null
    const totals = Object.fromEntries(trip.members.map(m => [m, 0]))
    let grandTotal = 0
    trip.billIds.forEach(billId => {
      const entry = entries.find(e => e.id === billId)
      if (!entry?.state) return
      // Re-use the snapshot's per-person result if present
      const result = entry.state.result
      if (result?.totals) {
        Object.entries(result.totals).forEach(([m, v]) => {
          if (totals[m] !== undefined) totals[m] += (Number(v) || 0)
        })
        grandTotal += Number(result.grandTotal) || 0
      }
    })
    return { totals, grandTotal, currency: trip.currency }
  }, [trips])

  return {
    trips,
    createTrip,
    updateTrip,
    deleteTrip,
    addBillToTrip,
    removeBillFromTrip,
    reorderBills,
    getTrip,
    tripSummary,
  }
}
