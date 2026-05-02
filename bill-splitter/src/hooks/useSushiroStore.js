import { useState, useCallback } from 'react'

const INITIAL_PLATES = [
  { id: 'silver', label: 'Silver', color: '#B0B0B0', price: 40, count: 0 },
  { id: 'gold', label: 'Gold', color: '#D4AF37', price: 60, count: 0 },
  { id: 'black', label: 'Black', color: '#3C3C3C', price: 80, count: 0 },
  { id: 'red', label: 'Red', color: '#CC3333', price: 120, count: 0 },
  { id: 'blue', label: 'Blue (พิเศษ)', color: '#2266CC', price: 160, count: 0 },
]

export function useSushiroStore() {
  const [plates, setPlates] = useState(INITIAL_PLATES)
  const [people, setPeople] = useState(2)
  const [vatEnabled, setVatEnabled] = useState(false)
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false)

  const changePlate = useCallback((id, delta) => {
    setPlates(prev => prev.map(p => p.id === id ? { ...p, count: Math.max(0, p.count + delta) } : p))
  }, [])

  const resetPlates = useCallback(() => { setPlates(INITIAL_PLATES.map(p => ({ ...p, count: 0 }))) }, [])
  const changePeople = useCallback((delta) => { setPeople(prev => Math.max(1, prev + delta)) }, [])

  const calculate = useCallback(() => {
    const subtotal = plates.reduce((sum, p) => sum + p.count * p.price, 0)
    let multiplier = 1
    if (serviceChargeEnabled) multiplier *= 1.10
    if (vatEnabled) multiplier *= 1.07
    const grandTotal = subtotal * multiplier
    return { subtotal, serviceCharge: serviceChargeEnabled ? subtotal * 0.10 : 0, vat: vatEnabled ? subtotal * (serviceChargeEnabled ? 1.10 : 1) * 0.07 : 0, grandTotal, perPerson: grandTotal / people, totalPlates: plates.reduce((s, p) => s + p.count, 0) }
  }, [plates, people, vatEnabled, serviceChargeEnabled])

  return { plates, changePlate, resetPlates, people, changePeople, vatEnabled, setVatEnabled, serviceChargeEnabled, setServiceChargeEnabled, calculate }
}
