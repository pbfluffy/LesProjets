import { useState, useCallback } from 'react'

export const PLATES = [
  { id: 'silver', label: 'Silver',      color: '#B0B0B0', price: 40  },
  { id: 'gold',   label: 'Gold',        color: '#D4AF37', price: 60  },
  { id: 'black',  label: 'Black',       color: '#3C3C3C', price: 80  },
  { id: 'red',    label: 'Red',         color: '#CC3333', price: 120 },
  { id: 'blue',   label: 'Blue (\u0e1e\u0e34\u0e40\u0e28\u0e29)', color: '#2266CC', price: 160 },
]

function emptyPersonCounts() {
  return Object.fromEntries(PLATES.map(p => [p.id, 0]))
}

export function useSushiroStore() {
  const [people, setPeople]             = useState([])
  const [activePerson, setActivePerson] = useState(null)
  const [counts, setCounts]             = useState({})
  const [vatEnabled, setVatEnabled]               = useState(false)
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false)

  const addPerson = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed || people.includes(trimmed)) return false
    setPeople(prev => [...prev, trimmed])
    setCounts(prev => ({ ...prev, [trimmed]: emptyPersonCounts() }))
    setActivePerson(prev => prev ?? trimmed)
    return true
  }, [people])

  const removePerson = useCallback((name) => {
    setPeople(prev => {
      const next = prev.filter(p => p !== name)
      setActivePerson(ap => ap !== name ? ap : (next[0] ?? null))
      return next
    })
    setCounts(prev => { const n = { ...prev }; delete n[name]; return n })
  }, [])

  const changePlate = useCallback((person, plateId, delta) => {
    setCounts(prev => ({
      ...prev,
      [person]: {
        ...prev[person],
        [plateId]: Math.max(0, (prev[person]?.[plateId] ?? 0) + delta),
      },
    }))
  }, [])

  const resetAll = useCallback(() => {
    setCounts(prev =>
      Object.fromEntries(Object.keys(prev).map(n => [n, emptyPersonCounts()]))
    )
  }, [])

  const calculate = useCallback(() => {
    let multiplier = 1
    if (serviceChargeEnabled) multiplier *= 1.10
    if (vatEnabled)           multiplier *= 1.07
    const personSubtotals = Object.fromEntries(
      people.map(name => [name, PLATES.reduce((sum, p) => sum + (counts[name]?.[p.id] ?? 0) * p.price, 0)])
    )
    const subtotal   = Object.values(personSubtotals).reduce((a, b) => a + b, 0)
    const grandTotal = subtotal * multiplier
    const personTotals = Object.fromEntries(people.map(name => [name, personSubtotals[name] * multiplier]))
    const totalPlates = people.reduce((sum, name) => sum + PLATES.reduce((s, p) => s + (counts[name]?.[p.id] ?? 0), 0), 0)
    return { personSubtotals, personTotals, subtotal, grandTotal, totalPlates,
      serviceCharge: serviceChargeEnabled ? subtotal * 0.10 : 0,
      vat: vatEnabled ? subtotal * (serviceChargeEnabled ? 1.10 : 1) * 0.07 : 0 }
  }, [people, counts, vatEnabled, serviceChargeEnabled])

  return { people, addPerson, removePerson, activePerson, setActivePerson,
    counts, changePlate, resetAll, vatEnabled, setVatEnabled,
    serviceChargeEnabled, setServiceChargeEnabled, calculate }
}
