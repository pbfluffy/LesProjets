/**
 * useTripsStore — Trip mode for Bill Splitter (#128)
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

// Extract grand total from a history entry regardless of bill type
function entryTotal(entry) {
  if (!entry?.state) return 0
  const result = entry.state.result
  if (result?.grandTotal) return Number(result.grandTotal) || 0
  // Sushiro fallback: no result object, compute from plates
  return 0
}

export function useTripsStore() {
  const [trips, setTrips] = useState(() => readAll())

  useEffect(() => {
    const onStorage = (e) => { if (e.key === TRIPS_KEY) setTrips(readAll()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const createTrip = useCallback((name, members = [], currency = 'THB') => {
    const trip = { id: uuid(), name: name.trim().slice(0, 60), members, currency, createdAt: Date.now(), billIds: [], paidBy: {} }
    setTrips(prev => {
      const next = [trip, ...prev]
      writeAll(next)
      return next
    })
    return trip
  }, [])

  const updateTrip = useCallback((id, patch) => {
    setTrips(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t)
      writeAll(next)
      return next
    })
  }, [])

  const deleteTrip = useCallback((id) => {
    setTrips(prev => {
      const next = prev.filter(t => t.id !== id)
      writeAll(next)
      return next
    })
  }, [])

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

  const getTrip = useCallback((id) => trips.find(t => t.id === id) ?? null, [trips])

  const tripSummary = useCallback((tripId, entries) => {
    const trip = trips.find(t => t.id === tripId)
    if (!trip) return null

    // --- Grand total: sum all bill totals regardless of member matching ---
    let grandTotal = 0
    trip.billIds.forEach(billId => {
      const entry = entries.find(e => e.id === billId)
      grandTotal += entryTotal(entry)
    })

    // --- Per-member owed: only from bills whose result.totals keys match trip members ---
    const owed = Object.fromEntries(trip.members.map(m => [m, 0]))
    const paid = Object.fromEntries(trip.members.map(m => [m, 0]))

    trip.billIds.forEach(billId => {
      const entry = entries.find(e => e.id === billId)
      if (!entry?.state) return
      const result = entry.state.result
      const billTotal = entryTotal(entry)

      // Accumulate per-member owed amounts
      if (result?.totals) {
        Object.entries(result.totals).forEach(([m, v]) => {
          if (owed[m] !== undefined) owed[m] += (Number(v) || 0)
        })
      }

      // Accumulate payer: who fronted this bill's total
      const payer = (trip.paidBy || {})[billId]
      if (payer && paid[payer] !== undefined) {
        paid[payer] += billTotal
      }
    })

    // --- Settlement ---
    const hasPayers = trip.billIds.some(billId => !!(trip.paidBy || {})[billId])
    let settlements = []

    if (hasPayers) {
      // Use per-member owed if available, else split grandTotal evenly
      const membersWithOwed = trip.members.filter(m => owed[m] > 0)
      const owedToUse = membersWithOwed.length > 0
        ? owed
        : Object.fromEntries(trip.members.map(m => [m, grandTotal / (trip.members.length || 1)]))

      const net = {}
      trip.members.forEach(m => { net[m] = (paid[m] || 0) - (owedToUse[m] || 0) })

      const creditors = Object.entries(net).filter(([, v]) => v > 0.5).map(([m, v]) => ({ m, v }))
      const debtors   = Object.entries(net).filter(([, v]) => v < -0.5).map(([m, v]) => ({ m, v: -v }))
      creditors.sort((a, b) => b.v - a.v)
      debtors.sort((a, b) => b.v - a.v)

      let ci = 0, di = 0
      while (ci < creditors.length && di < debtors.length) {
        const amount = Math.min(creditors[ci].v, debtors[di].v)
        if (amount > 0.5) settlements.push({ from: debtors[di].m, to: creditors[ci].m, amount })
        creditors[ci].v -= amount
        debtors[di].v   -= amount
        if (creditors[ci].v < 0.5) ci++
        if (debtors[di].v   < 0.5) di++
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
