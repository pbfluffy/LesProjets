import { useState, useEffect, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { auth, onAuthStateChanged } from '../firebase'
import { DEFAULT_CURRENCY, normaliseCurrency } from '../currencies'

export function useBillStore(initial) {
  const [billName, setBillName] = useState(initial?.billName ?? '')
  const [members, setMembers] = useState(initial?.members ?? [])
  const [foods, setFoods] = useState(initial?.foods ?? [])
  const [vatEnabled, setVatEnabled] = useState(initial?.vatEnabled ?? false)
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(initial?.serviceChargeEnabled ?? false)
  const [serviceChargeRate, setServiceChargeRate] = useState(initial?.serviceChargeRate ?? 10)
  const [roundTotalEnabled, setRoundTotalEnabled] = useState(initial?.roundTotalEnabled ?? false)
  const [promptPay, setPromptPay] = useState(initial?.promptPay ?? '')
  const [bankInfo, setBankInfo] = useState(initial?.bankInfo ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [currency, setCurrency] = useState(normaliseCurrency(initial?.currency) ?? DEFAULT_CURRENCY)

  // Feature #76 Phase A — On new bill (no initial.members), auto-seed the
  // first member with the signed-in user's display name once auth resolves.
  useEffect(() => {
    if (initial?.members && initial.members.length > 0) return
    const off = onAuthStateChanged(auth, (u) => {
      const name = u?.displayName?.trim()
      if (!name) return
      setMembers(prev => prev.length === 0 ? [name] : prev)
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMember = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed) return false
    let added = false
    setMembers(prev => {
      if (prev.includes(trimmed)) return prev
      added = true
      return [...prev, trimmed]
    })
    return added
  }, [])

  const removeMember = useCallback((name) => {
    setMembers(prev => prev.filter(m => m !== name))
    setFoods(prev => prev.map(f => ({ ...f, who: f.who.filter(w => w !== name) })))
  }, [])

  const addFood = useCallback(() => {
    setFoods(prev => [...prev, { id: uuid(), name: '', price: '', who: [] }])
  }, [])

  // Feature #68 — bulk insert from receipt OCR.
  // Each item: { name, price }. Seeds `who` with all current members so the
  // summary calculates immediately after scan without manual assignment.
  const addFoods = useCallback((items) => {
    if (!Array.isArray(items) || items.length === 0) return
    setFoods(prev => [
      ...prev,
      ...items.map(({ name, price }) => ({
        id: uuid(),
        name: String(name ?? '').slice(0, 80),
        price: String(price ?? ''),
        who: [...members],
      })),
    ])
  }, [members])

  const updateFood = useCallback((id, field, value) => {
    setFoods(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }, [])

  const toggleFoodMember = useCallback((id, member) => {
    setFoods(prev => prev.map(f => {
      if (f.id !== id) return f
      const who = f.who.includes(member) ? f.who.filter(w => w !== member) : [...f.who, member]
      return { ...f, who }
    }))
  }, [])

  const removeFood = useCallback((id) => {
    setFoods(prev => prev.filter(f => f.id !== id))
  }, [])

  const setAllMembers = useCallback((id, memberList) => {
    setFoods(prev => prev.map(f => f.id === id ? { ...f, who: [...memberList] } : f))
  }, [])

  const calculate = useCallback(() => {
    const shares = Object.fromEntries(members.map(m => [m, 0]))
    let subtotal = 0
    let rawSubtotal = 0
    foods.forEach(f => {
      const price = parseFloat(f.price) || 0
      if (!price) return
      rawSubtotal += price
      if (!f.who.length) return
      const split = price / f.who.length
      f.who.forEach(m => { if (shares[m] !== undefined) shares[m] += split })
      subtotal += price
    })
    const scRate = Math.max(0, Math.min(100, parseFloat(serviceChargeRate) || 0))
    const scFraction = serviceChargeEnabled ? scRate / 100 : 0
    let multiplier = 1 + scFraction
    if (vatEnabled) multiplier *= 1.07
    const rawTotals = Object.fromEntries(Object.entries(shares).map(([m, v]) => [m, v * multiplier]))
    const rawGrand = subtotal * multiplier
    // #88 — reconcile per-person amounts so the column always sums exactly to the
    // grand total (fixes BUG-19). When roundTotalEnabled, the grand total snaps to
    // the nearest whole baht. Either way the bill owner (members[0], the auto-seeded
    // creator) absorbs the rounding delta. Guard: if the owner's natural share is too
    // small to absorb a round-down, clamp owner to >=0 and let the total settle at
    // what is actually owed rather than display a negative amount.
    const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100
    let grandTotal = roundTotalEnabled ? Math.round(rawGrand) : round2(rawGrand)
    const owner = members[0]
    const totals = {}
    if (members.length > 0) {
      let othersSum = 0
      members.forEach(m => {
        if (m === owner) return
        const r = round2(rawTotals[m])
        totals[m] = r
        othersSum += r
      })
      let ownerAmt = round2(grandTotal - othersSum)
      if (ownerAmt < 0) { ownerAmt = 0; grandTotal = round2(othersSum) }
      totals[owner] = ownerAmt
    }
    return {
      shares, totals, subtotal, rawSubtotal,
      serviceCharge: subtotal * scFraction,
      serviceChargeRate: scRate,
      vat: vatEnabled ? subtotal * (1 + scFraction) * 0.07 : 0,
      grandTotal, multiplier,
    }
  }, [members, foods, vatEnabled, serviceChargeEnabled, serviceChargeRate, roundTotalEnabled])

  return { billName, setBillName, members, addMember, removeMember, foods, addFood, addFoods, updateFood, toggleFoodMember, removeFood, setAllMembers, vatEnabled, setVatEnabled, serviceChargeEnabled, setServiceChargeEnabled, serviceChargeRate, setServiceChargeRate, promptPay, setPromptPay, bankInfo, setBankInfo, notes, setNotes, roundTotalEnabled, setRoundTotalEnabled, currency, setCurrency, calculate }
}
