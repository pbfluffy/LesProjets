import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'

export function useBillStore() {
  const [members, setMembers] = useState([])
  const [foods, setFoods] = useState([])
  const [vatEnabled, setVatEnabled] = useState(false)
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false)
  const [promptPay, setPromptPay] = useState('')
  const [bankInfo, setBankInfo] = useState('')
  const [notes, setNotes] = useState('')

  const addMember = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed || members.includes(trimmed)) return false
    setMembers(prev => [...prev, trimmed])
    return true
  }, [members])

  const removeMember = useCallback((name) => {
    setMembers(prev => prev.filter(m => m !== name))
    setFoods(prev => prev.map(f => ({ ...f, who: f.who.filter(w => w !== name) })))
  }, [])

  const addFood = useCallback(() => {
    setFoods(prev => [...prev, { id: uuid(), name: '', price: '', who: [] }])
  }, [])

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
    foods.forEach(f => {
      const price = parseFloat(f.price) || 0
      if (!price || !f.who.length) return
      const split = price / f.who.length
      f.who.forEach(m => { if (shares[m] !== undefined) shares[m] += split })
      subtotal += price
    })
    let multiplier = 1
    if (serviceChargeEnabled) multiplier *= 1.10
    if (vatEnabled) multiplier *= 1.07
    const totals = Object.fromEntries(Object.entries(shares).map(([m, v]) => [m, v * multiplier]))
    return {
      shares, totals, subtotal,
      serviceCharge: serviceChargeEnabled ? subtotal * 0.10 : 0,
      vat: vatEnabled ? subtotal * (serviceChargeEnabled ? 1.10 : 1) * 0.07 : 0,
      grandTotal: subtotal * multiplier, multiplier,
    }
  }, [members, foods, vatEnabled, serviceChargeEnabled])

  return { members, addMember, removeMember, foods, addFood, updateFood, toggleFoodMember, removeFood, setAllMembers, vatEnabled, setVatEnabled, serviceChargeEnabled, setServiceChargeEnabled, promptPay, setPromptPay, bankInfo, setBankInfo, notes, setNotes, calculate }
}
