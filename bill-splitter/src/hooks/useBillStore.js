import { useState, useEffect, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { auth, onAuthStateChanged } from '../firebase'
import { DEFAULT_CURRENCY, normaliseCurrency } from '../currencies'
import { calcSplit } from '../billMath'

export function useBillStore(initial) {
  const [billName, setBillName] = useState(initial?.billName ?? '')
  const [members, setMembers] = useState(initial?.members ?? [])
  const [foods, setFoods] = useState(initial?.foods ?? [])
  const [vatEnabled, setVatEnabled] = useState(initial?.vatEnabled ?? false)
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(initial?.serviceChargeEnabled ?? false)
  const [serviceChargeRate, setServiceChargeRate] = useState(initial?.serviceChargeRate ?? 10)
  const [roundTotalEnabled, setRoundTotalEnabled] = useState(initial?.roundTotalEnabled ?? false)
  // Bill-level pre-tax discounts (e.g. promo, coupon) — each entry can be assigned
  // to its own subset of members. Backward compat: bills saved before multi-discount
  // support only have a single billDiscount/billDiscountLabel/billDiscountWho — those
  // get upgraded into a one-item list on load; the array is what gets saved from now on.
  const [billDiscounts, setBillDiscounts] = useState(() => {
    if (Array.isArray(initial?.billDiscounts)) return initial.billDiscounts
    const legacyAmt = parseFloat(initial?.billDiscount)
    if (legacyAmt > 0) {
      return [{
        id: uuid(),
        amount: initial.billDiscount,
        label: initial.billDiscountLabel ?? '',
        who: initial.billDiscountWho ?? null,
      }]
    }
    return []
  })
  const addBillDiscount = useCallback(() => {
    setBillDiscounts(prev => [...prev, { id: uuid(), amount: '', label: '', who: null }])
  }, [])
  // Bulk-add from receipt OCR — each item: { amount, label }. `who` defaults to
  // all members (null), same as a manually-added discount.
  const addBillDiscounts = useCallback((items) => {
    if (!Array.isArray(items) || items.length === 0) return
    setBillDiscounts(prev => [
      ...prev,
      ...items.map(({ amount, label }) => ({ id: uuid(), amount, label: label ?? '', who: null })),
    ])
  }, [])
  const updateBillDiscount = useCallback((id, field, value) => {
    setBillDiscounts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }, [])
  const removeBillDiscount = useCallback((id) => {
    setBillDiscounts(prev => prev.filter(d => d.id !== id))
  }, [])
  const [promptPay, setPromptPay] = useState(initial?.promptPay ?? '')
  const [bankInfo, setBankInfo] = useState(initial?.bankInfo ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [currency, setCurrency] = useState(normaliseCurrency(initial?.currency) ?? DEFAULT_CURRENCY)
  const [billOwner, setBillOwnerState] = useState(
    initial?.members?.includes(initial?.billOwner) ? initial.billOwner : (initial?.members?.[0] ?? '')
  )
  // #91 mark-as-paid — persisted in store so it round-trips through Save,
  // bill history, cloud sync, and share links (all of which just serialise
  // whatever is in the snapshot object). Stored as a Set internally; the
  // snapshot builder in BillSplitter.jsx converts it to a plain array.
  const [paid, setPaidState] = useState(
    () => new Set(Array.isArray(initial?.paid) ? initial.paid : [])
  )
  const togglePaid = useCallback((name) => {
    setPaidState(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }, [])
  const setPaid = useCallback((names) => {
    setPaidState(new Set(Array.isArray(names) ? names : []))
  }, [])
  // Owner never shows as "paid" (they're the one collecting) — strip them
  // from the paid set whenever the owner changes.
  const setBillOwner = useCallback((owner) => {
    setPaidState(prev => {
      if (!prev.has(owner)) return prev
      const next = new Set(prev)
      next.delete(owner)
      return next
    })
    setBillOwnerState(owner)
  }, [])

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

  useEffect(() => {
    setBillOwnerState(owner => members.length === 0 ? '' : (members.includes(owner) ? owner : members[0]))
  }, [members])

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
    setBillDiscounts(prev => prev.map(d => d.who === null ? d : { ...d, who: d.who.filter(m => m !== name) }))
    setPaidState(prev => {
      if (!prev.has(name)) return prev
      const next = new Set(prev)
      next.delete(name)
      return next
    })
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

  const duplicateFood = useCallback((id) => {
    setFoods(prev => {
      const idx = prev.findIndex(f => f.id === id)
      if (idx === -1) return prev
      const copy = { ...prev[idx], id: uuid() }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }, [])

  const restoreFood = useCallback((food, afterId) => {
    setFoods(prev => {
      const idx = afterId ? prev.findIndex(f => f.id === afterId) : -1
      const next = [...prev]
      next.splice(idx + 1, 0, food)
      return next
    })
  }, [])

  const setAllMembers = useCallback((id, memberList) => {
    setFoods(prev => prev.map(f => f.id === id ? { ...f, who: [...memberList] } : f))
  }, [])

  const calculate = useCallback(
    () => calcSplit({ members, foods, billDiscounts, vatEnabled, serviceChargeEnabled, serviceChargeRate, roundTotalEnabled, billOwner }),
    [members, foods, vatEnabled, serviceChargeEnabled, serviceChargeRate, roundTotalEnabled, billOwner, billDiscounts]
  )

  return { billName, setBillName, members, addMember, removeMember, billOwner, setBillOwner, foods, addFood, addFoods, updateFood, toggleFoodMember, removeFood, duplicateFood, restoreFood, setAllMembers, vatEnabled, setVatEnabled, serviceChargeEnabled, setServiceChargeEnabled, serviceChargeRate, setServiceChargeRate, promptPay, setPromptPay, bankInfo, setBankInfo, notes, setNotes, roundTotalEnabled, setRoundTotalEnabled, currency, setCurrency, billDiscounts, setBillDiscounts, addBillDiscount, addBillDiscounts, updateBillDiscount, removeBillDiscount, paid, togglePaid, setPaid, calculate }
}
