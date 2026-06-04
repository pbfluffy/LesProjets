import { useState, useEffect, useMemo } from 'react'
import { computeTier } from '../data/computeTier'
import { STRINGS } from '../i18n/strings'

const DEFAULT = {
  region: 'all', // 'all' | 'bangkok_metro' | 'weekend_escape'
  types: [], // subset of: cafe, restaurant, hotel, pet_hotel, park, mall, beach, vet, pet_shop, grooming
  policies: [], // subset of: indoor_allowed, no_size_limit, water_bowl, pet_menu, off_leash_zone, no_fee, overnight, no_stroller_needed
  minPaws: 0, // 0 = no filter; otherwise require computeTier(p).paws >= minPaws
  query: '', // free-text search across name / neighborhood
  sort: 'paws', // 'paws' | 'newest' | 'nearby'
}

// Versioned key — bump suffix if the shape of DEFAULT changes incompatibly
const STORE_KEY = 'pumgoda_filters_v1'

// Defensively coerce a possibly-stale persisted object back into a valid filter
// shape. Query is always reset (search input is ephemeral — don't surprise the
// user with yesterday's search).
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT
    return {
      region: typeof parsed.region === 'string' ? parsed.region : DEFAULT.region,
      types: Array.isArray(parsed.types) ? parsed.types.filter((t) => typeof t === 'string') : [],
      policies: Array.isArray(parsed.policies) ? parsed.policies.filter((p) => typeof p === 'string') : [],
      minPaws: typeof parsed.minPaws === 'number' ? parsed.minPaws : 0,
      sort: typeof parsed.sort === 'string' ? parsed.sort : DEFAULT.sort,
      query: '', // never persist query
    }
  } catch {
    return DEFAULT
  }
}

export function useFilters() {
  const [filters, setFilters] = useState(loadFromStorage)

  // Persist on every change. Silent on quota errors / disabled storage.
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(filters))
    } catch {
      // ignore
    }
  }, [filters])

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
    setMinPaws: (n) => update({ minPaws: n }),
    setQuery: (s) => update({ query: s }),
    reset,
    clearFilters: () => setFilters((f) => ({ ...DEFAULT, sort: f.sort })),
  }
}

// Apply filters to a places array. Pure — easy to test.
export function applyFilters(places, filters) {
  return places.filter((p) => {
    if (filters.region !== 'all' && p.region !== filters.region) return false
    if (filters.types.length > 0 && !filters.types.includes(String(p.type || '').trim().toLowerCase().replace(/\s+/g, '_'))) return false
    if (filters.policies.length > 0) {
      for (const policy of filters.policies) {
        if (policy === 'no_stroller_needed') {
          if (p.policy?.stroller_required === true) return false
          continue
        }
        if (policy === 'pumba_verified') {
          if (!p.pumba?.verified) return false
          continue
        }
        if (!p.policy?.[policy]) return false
      }
    }
    if (filters.minPaws && filters.minPaws > 0) {
      if (computeTier(p).paws < filters.minPaws) return false
    }
    if (filters.query && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase()
      // Type + policy labels (both languages) so a query like "cafe", "คาเฟ่",
      // "off-leash", or "pet menu" matches regardless of the current UI language.
      const typeKey = String(p.type || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
      const policyKeys = p.policy ? Object.keys(p.policy).filter((k) => p.policy[k] === true) : []
      const labelBits = [
        STRINGS.en.types?.[typeKey], STRINGS.th.types?.[typeKey], typeKey,
        ...policyKeys.flatMap((k) => [STRINGS.en.policy?.[k], STRINGS.th.policy?.[k], k]),
      ]
      const hay = [
        p.name?.th, p.name?.en,
        p.neighborhood,
        p.notes?.th, p.notes?.en,
        ...labelBits,
      ].filter(Boolean).join(' ').toLowerCase()
      if (hay.indexOf(q) === -1) return false
    }
    return true
  })
}
