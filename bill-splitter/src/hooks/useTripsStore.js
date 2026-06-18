/**
 * useTripsStore — Trip mode for Bill Splitter (#128)
 *
 * Shape:
 *   Trip: { id, name, members, currency, createdAt, billIds: string[], paidBy: { [billId]: memberName } }
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'
import {
  auth, db,
  onAuthStateChanged, doc, setDoc, serverTimestamp, onSnapshot,
} from '../firebase.js'

const TRIPS_KEY = 'bill_trips_v1'
const TRIPS_TS_KEY = 'bill_trips_ts_v1'
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

// Recompute bill result from saved state (result is never persisted in snapshots)
export function calcBillResult(entry) {
  if (!entry?.state) return { grandTotal: 0, totals: {} }
  const s = entry.state

  if (entry.tab === 'sushi') {
    // Sushiro: sum plates + snacks per person
    const PLATE_PRICES = { p60:60, p80:80, p120:120, p150:150, p180:180, p220:220 }
    const people = Array.isArray(s.people) ? s.people : []
    const plates = s.plates || {}
    const snacks = s.snacks || {}
    const totals = {}
    let grand = 0
    people.forEach(p => {
      let amt = 0
      const pp = plates[p] || {}
      Object.entries(pp).forEach(([id, count]) => { amt += (count || 0) * (PLATE_PRICES[id] || 0) })
      ;(snacks[p] || []).forEach(snack => { amt += Number(snack.price) || 0 })
      let mul = 1
      if (s.serviceChargeEnabled) mul *= 1.1
      if (s.vatEnabled) mul *= 1.07
      amt = amt * mul
      totals[p] = Math.round((amt + Number.EPSILON) * 100) / 100
      grand += totals[p]
    })
    const currency = s.currency || 'THB'
    return { grandTotal: Math.round((grand + Number.EPSILON) * 100) / 100, totals, currency }
  }

  // Split bill
  const members = Array.isArray(s.members) ? s.members : []
  const foods = Array.isArray(s.foods) ? s.foods : []
  const scRate = Math.max(0, Math.min(100, parseFloat(s.serviceChargeRate) || 0))
  const scFraction = s.serviceChargeEnabled ? scRate / 100 : 0
  let multiplier = 1 + scFraction
  if (s.vatEnabled) multiplier *= 1.07
  const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100

  const shares = Object.fromEntries(members.map(m => [m, 0]))
  let subtotal = 0
  foods.forEach(f => {
    const price = parseFloat(f.price) || 0
    if (!price || !Array.isArray(f.who) || !f.who.length) return
    subtotal += price
    const split = price / f.who.length
    f.who.forEach(m => { if (shares[m] !== undefined) shares[m] += split })
  })

  const rawGrand = subtotal * multiplier
  let grandTotal = s.roundTotalEnabled ? Math.round(rawGrand) : round2(rawGrand)
  const totals = {}
  if (members.length > 0) {
    const owner = members[0]
    let othersSum = 0
    members.forEach(m => {
      if (m === owner) return
      const r = round2(shares[m] * multiplier)
      totals[m] = r
      othersSum += r
    })
    let ownerAmt = round2(grandTotal - othersSum)
    if (ownerAmt < 0) { ownerAmt = 0; grandTotal = round2(othersSum) }
    totals[owner] = ownerAmt
  }
  const currency = s.currency || 'THB'
  return { grandTotal, totals, currency }
}

export function useTripsStore() {
  const [trips, setTrips] = useState(() => readAll())

  const uidRef = useRef(null)
  const pushInFlight = useRef(false)

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e) => { if (e.key === TRIPS_KEY) setTrips(readAll()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Cloud sync — pull on auth/snapshot, push on every mutation
  useEffect(() => {
    let unsub = null
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsub) { unsub(); unsub = null }
      uidRef.current = user?.uid ?? null
      if (!user) return
      // On sign-in: if local trips exist but never pushed, push now
      const localTrips = readAll()
      const localTs = (() => { try { return JSON.parse(localStorage.getItem(TRIPS_TS_KEY) || '0') } catch { return 0 } })()
      if (localTrips.length > 0 && localTs === 0) {
        const now = Date.now()
        localStorage.setItem(TRIPS_TS_KEY, JSON.stringify(now))
        setDoc(doc(db, 'userBills', user.uid), { trips: localTrips, tripsLastEdit: now, lastModified: serverTimestamp() }, { merge: true })
          .catch(e => console.warn('[tripsSync] initial push failed:', e?.code))
      }
      const ref = doc(db, 'userBills', user.uid)
      unsub = onSnapshot(ref, (snap) => {
        if (!snap.exists()) return
        const remote = snap.data().trips
        if (!Array.isArray(remote)) return
        const remoteTs = snap.data().tripsLastEdit || 0
        const localTs = (() => { try { return JSON.parse(localStorage.getItem(TRIPS_TS_KEY) || '0') } catch { return 0 } })()
        if (remoteTs > localTs) {
          writeAll(remote)
          localStorage.setItem(TRIPS_TS_KEY, JSON.stringify(remoteTs))
          setTrips(remote)
        }
      }, () => {}) // silently ignore permission errors (anon users)
    })
    return () => { unsubAuth(); if (unsub) unsub() }
  }, [])

  const pushToCloud = useCallback(async (next) => {
    const uid = uidRef.current
    if (!uid || pushInFlight.current) return
    pushInFlight.current = true
    try {
      const now = Date.now()
      localStorage.setItem(TRIPS_TS_KEY, JSON.stringify(now))
      await setDoc(doc(db, 'userBills', uid), {
        trips: next,
        tripsLastEdit: now,
        lastModified: serverTimestamp(),
      }, { merge: true })
    } catch {} finally {
      pushInFlight.current = false
    }
  }, [])

  const createTrip = useCallback((name, members = [], currency = 'THB') => {
    const trip = { id: uuid(), name: name.trim().slice(0, 60), members, currency, createdAt: Date.now(), billIds: [], paidBy: {} }
    let _next
    setTrips(prev => { _next = [trip, ...prev]; writeAll(_next); return _next })
    pushToCloud(_next)
    return trip
  }, [])

  const updateTrip = useCallback((id, patch) => {
    let _next
    setTrips(prev => { _next = prev.map(t => t.id === id ? { ...t, ...patch } : t); writeAll(_next); return _next })
    pushToCloud(_next)
  }, [])

  const deleteTrip = useCallback((id) => {
    let _next
    setTrips(prev => { _next = prev.filter(t => t.id !== id); writeAll(_next); return _next })
    pushToCloud(_next)
  }, [])

  const addBillToTrip = useCallback((tripId, billId) => {
    let _next
    setTrips(prev => { _next = prev.map(t => t.id === tripId && !t.billIds.includes(billId) ? { ...t, billIds: [...t.billIds, billId] } : t); writeAll(_next); return _next })
    pushToCloud(_next)
  }, [])

  const removeBillFromTrip = useCallback((tripId, billId) => {
    let _next
    setTrips(prev => { _next = prev.map(t => { if (t.id !== tripId) return t; const pb = { ...(t.paidBy||{}) }; delete pb[billId]; return { ...t, billIds: t.billIds.filter(b => b !== billId), paidBy: pb } }); writeAll(_next); return _next })
    pushToCloud(_next)
  }, [])

  const setBillPayer = useCallback((tripId, billId, payer) => {
    let _next
    setTrips(prev => { _next = prev.map(t => t.id !== tripId ? t : { ...t, paidBy: { ...(t.paidBy||{}), [billId]: payer } }); writeAll(_next); return _next })
    pushToCloud(_next)
  }, [])

  const reorderBills = useCallback((tripId, fromIdx, toIdx) => {
    let _next
    setTrips(prev => { _next = prev.map(t => { if (t.id !== tripId) return t; const ids = [...t.billIds]; const [m] = ids.splice(fromIdx,1); ids.splice(toIdx,0,m); return { ...t, billIds: ids } }); writeAll(_next); return _next })
    pushToCloud(_next)
  }, [])

  const getTrip = useCallback((id) => trips.find(t => t.id === id) ?? null, [trips])

  const tripSummary = useCallback((tripId, entries) => {
    const trip = trips.find(t => t.id === tripId)
    if (!trip) return null

    // --- Grand total: sum all bill totals regardless of member matching ---
    let grandTotal = 0
    const owed = Object.fromEntries(trip.members.map(m => [m, 0]))
    const paid = Object.fromEntries(trip.members.map(m => [m, 0]))

    const billCurrencies = new Set()
    trip.billIds.forEach(billId => {
      const entry = entries.find(e => e.id === billId)
      if (!entry) return
      const { grandTotal: billTotal, totals, currency: billCurrency } = calcBillResult(entry)
      billCurrencies.add(billCurrency || trip.currency)
      grandTotal += billTotal

      // Accumulate per-member owed amounts
      Object.entries(totals).forEach(([m, v]) => {
        if (owed[m] !== undefined) owed[m] += (Number(v) || 0)
      })

      // Accumulate payer: who fronted this bill's total
      const payer = (trip.paidBy || {})[billId]
      if (payer && paid[payer] !== undefined) {
        paid[payer] += billTotal
      }
    })
    // Determine effective display currency
    // If all bills share one currency, use that. Otherwise flag as mixed.
    const uniqueCurrencies = [...billCurrencies]
    const effectiveCurrency = uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : trip.currency
    const mixedCurrencies = uniqueCurrencies.length > 1

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

    return { owed, paid, grandTotal, currency: effectiveCurrency, mixedCurrencies, settlements, hasPayers }
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
