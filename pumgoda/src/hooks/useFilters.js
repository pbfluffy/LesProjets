import { useState, useMemo } from 'react'

const DEFAULT = {
  region: 'all', // 'all' | 'bangkok_metro' | 'weekend_escape'
  types: [], // subset of: cafe, restaurant, hotel, park, mall, beach, vet, pet_shop, grooming
  policies: [], // subset of: indoor_allowed, no_size_limit, water_bowl, pet_menu, off_leash_zone, no_fee, overnight, no_stroller_needed
  sort: 'paws', // 'paws' | 'newest' | 'nearby'
}

export function useFilters() {
  const [filters, setFilters] = useState(DEFAULT)

  const update = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const toggleInArray = (key, value) =>
    setFilters((f) => {
      const arr = f[key]
      return {
        ...f,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  const reset = () => setFilters(DEFAULT)

  return {
    filters,
    setRegion: (region) => update({ region }),
    toggleType: (t) => toggleInArray('types', t),
    togglePolicy: (p) => toggleInArray('policies', p),
    setSort: (sort) => update({ sort }),
    reset,
  }
}

// Apply filters to a places array. Pure — easy to test.
export function applyFilters(places, filters) {
  return places.filter((p) => {
    if (filters.region !== 'all' && p.region !== filters.region) return false
    if (filters.types.length > 0 && !filters.types.includes(p.type)) return false
    if (filters.policies.length > 0) {
      for (const policy of filters.policies) {
        if (policy === 'no_stroller_needed') {
          if (p.policy?.stroller_required === true) return false
          continue
        }
        if (!p.policy?.[policy]) return false
      }
    }
    return true
  })
}
