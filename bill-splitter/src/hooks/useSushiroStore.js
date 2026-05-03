import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'

export const PLATES = [
  { id: 'white',  label: 'White',  color: '#EEEEEE', border: '#BBBBBB', price: 30  },
  { id: 'red',    label: 'Red',    color: '#D63A3A', border: '#D63A3A', price: 40  },
  { id: 'silver', label: 'Silver', color: '#A8A8A8', border: '#888888', price: 60  },
  { id: 'gold',   label: 'Gold',   color: '#D4AF37', border: '#B8941E', price: 80  },
  { id: 'black',  label: 'Black',  color: '#2C2C2C', border: '#555555', price: 100 },
]

const emptyPlates = () => Object.fromEntries(PLATES.map(p => [p.id, 0]))

export function useSushiroStore() {
  const [people, setPeople]             = useState([])
  const [activePerson, setActivePerson] = useState(null)
  const [plates, setPlates]             = useState({})
  const [snacks, setSnacks]             = useState({})
  const [vatEnabled, setVatEnabled]               = useState(false)
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false)

  const addPerson = useCallback((name) => {
    const t = name.trim()
    if (!t) return false
    if (people.includes(t)) return false
    setPeople(prev => [...prev, t])
    setPlates(prev => ({ ...prev, [t]: emptyPlates() }))
    setSnacks(prev => ({ ...prev, [t]: [] }))
    setActivePerson(prev => prev ?? t)
    return true
  }, [people])

  const removePerson = useCallback((name) => {
    setPeople(prev => {
      const next = prev.filter(p => p !== name)
      setActivePerson(ap => ap !== name ? ap : (next[0] ?? null))
      return next
    })
    setPlates(prev => { const n = {...prev}; delete n[name]; return n })
    setSnacks(prev => { const n = {...prev}; delete n[name]; return n })
  }, [])

  const changePlate = useCallback((person, plateId, delta) => {
    setPlates(prev => ({
      ...prev,
      [person]: {
        ...prev[person],
        [plateId]: Math.max(0, ((prev[person] ?? emptyPlates())[plateId] ?? 0) + delta),
      },
    }))
  }, [])

  const addSnack = useCallback((person, name, price) => {
    const p = parseFloat(price)
    if (!p || p <= 0) return false
    setSnacks(prev => ({
      ...prev,
      [person]: [...(prev[person] ?? []), { id: uuid(), name: name.trim() || 'ของกินเล่น', price: p }],
    }))
    return true
  }, [])

  const removeSnack = useCallback((person, snackId) => {
    setSnacks(prev => ({
      ...prev,
      [person]: (prev[person] ?? []).filter(s => s.id !== snackId),
    }))
  }, [])

  const resetAll = useCallback(() => {
    setPlates(prev => Object.fromEntries(Object.keys(prev).map(n => [n, emptyPlates()])))
    setSnacks(prev => Object.fromEntries(Object.keys(prev).map(n => [n, []])))
  }, [])

  const calculate = useCallback(() => {
    let mul = 1
    if (serviceChargeEnabled) mul *= 1.10
    if (vatEnabled)           mul *= 1.07

    const personSubtotals = Object.fromEntries(
      people.map(name => {
        const plateSub  = PLATES.reduce((s, p) => s + ((plates[name] ?? {})[p.id] ?? 0) * p.price, 0)
        const snackSub  = (snacks[name] ?? []).reduce((s, item) => s + item.price, 0)
        return [name, plateSub + snackSub]
      })
    )
    const subtotal   = Object.values(personSubtotals).reduce((a, b) => a + b, 0)
    const grandTotal = subtotal * mul
    const personTotals = Object.fromEntries(people.map(n => [n, personSubtotals[n] * mul]))
    const totalPlates  = people.reduce(
      (s, n) => s + PLATES.reduce((ss, p) => ss + ((plates[n] ?? {})[p.id] ?? 0), 0), 0
    )
    return {
      personSubtotals, personTotals, subtotal, grandTotal, totalPlates,
      serviceCharge: serviceChargeEnabled ? subtotal * 0.10 : 0,
      vat: vatEnabled ? subtotal * (serviceChargeEnabled ? 1.10 : 1) * 0.07 : 0,
    }
  }, [people, plates, snacks, vatEnabled, serviceChargeEnabled])

  return {
    people, addPerson, removePerson,
    activePerson, setActivePerson,
    plates, changePlate,
    snacks, addSnack, removeSnack,
    resetAll,
    vatEnabled, setVatEnabled,
    serviceChargeEnabled, setServiceChargeEnabled,
    calculate,
  }
}
