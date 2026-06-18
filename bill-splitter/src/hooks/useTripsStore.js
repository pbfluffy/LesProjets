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
 *   Trip: { id, name, members, currency, createdAt, billIds: string[], paidBy: { [billId]: memberName } }
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
    const trip = { id: uuid(), name: name.trim().slice(0, 60), members, currency, createdAt: Date.now(), billIds: [], paidBy: {} }
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

  // Remove a bill from a trip (also clears its paidBy entry)
  const removeBillFromTrip = useCallback((tripId, billId) => {
    setTrips(prev => {
      const next = prev.map(t => {
        if (t.id !== tripId) return t
        const paidBy = { ...(t.paidBy || {}) }
        delete paidBy[billId]
        return { ...t, billIds: t.billIds.filter(b => b !== billId), paidBy }
      })
      writeAll(next)
      return next
    })
  }, [])

  // Set who paid for a specific bill in a trip
  const setBillPayer = useCallback((tripId, billId, payer) => {
    setTrips(prev => {
      const next = prev.map(t => {
        if (t.id !== tripId) return t
        const paidBy = { ...(t.paidBy || {}), [billId]: payer }
        return { ...t, paidBy }
      })
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
    const owed = Object.fromEntries(trip.members.map(m => [m, 0]))   // how much each person owes
    const paid = Object.fromEntries(trip.members.map(m => [m, 0]))   // how much each person paid
    let grandTotal = 0

    trip.billIds.forEach(billId => {
      const entry = entries.find(e => e.id === billId)
      if (!entry?.state) return
      const result = entry.state.result
      if (!result?.totals) return

      // Accumulate what each member owes from this bill
      Object.entries(result.totals).forEach(([m, v]) => {
        if (owed[m] !== undefined) owed[m] += (Number(v) || 0)
      })
      grandTotal += Number(result.grandTotal) || 0

      // Accumulate what the payer fronted (full bill total)
      const payer = (trip.paidBy || {})[billId]
      if (payer && paid[payer] !== undefined) {
        paid[payer] += Number(result.grandTotal) || 0
      }
    })

    // Settlement: net[m] = paid[m] - owed[m]. Positive = creditor, negative = debtor.
    // Greedy algorithm to minimise number of transfers.
    const hasPayers = trip.billIds.some(billId => (trip.paidBy || {})[billId])
    let settlements = []
    if (hasPayers) {
      const net = {}
      trip.members.forEach(m => { net[m] = (paid[m] || 0) - (owed[m] || 0) })
      const creditors = Object.entries(net).filter(([, v]) => v > 0.005).map(([m, v]) => ({ m, v }))
      const debtors   = Object.entries(net).filter(([, v]) => v < -0.005).map(([m, v]) => ({ m, v: -v }))
      creditors.sort((a, b) => b.v - a.v)
      debtors.sort((a, b) => b.v - a.v)
      let ci = 0, di = 0
      while (ci < creditors.length && di < debtors.length) {
        const amount = Math.min(creditors[ci].v, debtors[di].v)
        if (amount > 0.005) {
          settlements.push({ from: debtors[di].m, to: creditors[ci].m, amount })
        }
        creditors[ci].v -= amount
        debtors[di].v   -= amount
        if (creditors[ci].v < 0.005) ci++
        if (debtors[di].v   < 0.005) di++
      }
    }

    return { owed, paid, grandTotal, currency: trip.currency, settlements, hasPayers }
  }, [trips])

  return {
    trips,
    createTrip,
    updateTrip,
    deleteTrip,
    addBillToTrip,
    removeBillFromTrip,
    setBillPayer,
    reorderBills,
    getTrip,
    tripSummary,
  }
}
