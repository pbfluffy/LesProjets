// fetchPlaces — Sheet CSV → normalized place objects with localStorage caching.
//
// Flow:
//   1. localStorage cache hit & fresh? → return cached
//   2. Fetch CSV → parse → normalize → cache → return
//   3. Network failure → return bundled fallback JSON

import Papa from 'papaparse'
import { SHEET_CSV_URL, CACHE_TTL_MS, LS_KEYS } from '../config'
import { isTrue } from './computeTier'
import fallbackPlaces from './places.fallback.json'

// Map raw CSV row → typed place object
function normalize(row) {
  return {
    id: row.id,
    name: { en: row.name_en, th: row.name_th },
    type: row.type,
    region: row.region,
    province: row.province,
    neighborhood: row.neighborhood,
    coords:
      row.lat && row.lng ? [parseFloat(row.lat), parseFloat(row.lng)] : null,
    address: { en: row.address_en, th: row.address_th },
    googleMapsUrl: row.google_maps_url,
    phone: row.phone,
    website: row.website,
    instagram: row.instagram,
    hours: row.hours,
    policy: {
      indoor_allowed: isTrue(row.indoor_allowed),
      no_size_limit: isTrue(row.no_size_limit),
      size_limit_kg: row.size_limit_kg ? parseFloat(row.size_limit_kg) : null,
      water_bowl: isTrue(row.water_bowl),
      no_fee: isTrue(row.no_fee),
      fee_baht: row.fee_baht ? parseFloat(row.fee_baht) : null,
      pet_menu: isTrue(row.pet_menu),
      off_leash_zone: isTrue(row.off_leash_zone),
      pet_bed_toys: isTrue(row.pet_bed_toys),
      pet_pool_play_grooming: isTrue(row.pet_pool_play_grooming),
      overnight: isTrue(row.overnight),
      staff_welcoming: isTrue(row.staff_welcoming),
    },
    // Flatten the policy booleans onto the venue too so computeTier() can read them
    indoor_allowed: isTrue(row.indoor_allowed),
    no_size_limit: isTrue(row.no_size_limit),
    water_bowl: isTrue(row.water_bowl),
    no_fee: isTrue(row.no_fee),
    pet_menu: isTrue(row.pet_menu),
    off_leash_zone: isTrue(row.off_leash_zone),
    pet_bed_toys: isTrue(row.pet_bed_toys),
    pet_pool_play_grooming: isTrue(row.pet_pool_play_grooming),
    overnight: isTrue(row.overnight),
    staff_welcoming: isTrue(row.staff_welcoming),
    pumba: {
      verified: isTrue(row.pumba_verified),
      visitDate: row.pumba_visit_date || null,
      photoUrl: row.pumba_photo_url || null,
    },
    priceTier: row.price_tier,
    notes: { en: row.notes_en, th: row.notes_th },
    tags: (row.tags || '')
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean),
    lastVerified: row.last_verified || null,
    source: row.source,
  }
}

// Filter helper for hiding the seed/template rows whose IDs start with "sample-".
// Off by default; flip the includeSamples flag below to hide them later.
function isRealPlace(p) {
  return p.id && !p.id.startsWith('sample-')
}

function readCache() {
  try {
    const raw = localStorage.getItem(LS_KEYS.PLACES)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(places) {
  try {
    localStorage.setItem(
      LS_KEYS.PLACES,
      JSON.stringify({ ts: Date.now(), data: places })
    )
  } catch {
    // Cache failures are non-fatal; localStorage may be full or disabled
  }
}

export async function fetchPlaces({ force = false, includeSamples = true } = {}) {
  if (!force) {
    const cached = readCache()
    if (cached) {
      return { places: cached, source: 'cache' }
    }
  }

  try {
    const res = await fetch(SHEET_CSV_URL)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const csv = await res.text()
    const { data, errors } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    })
    if (errors.length > 0) console.warn('PapaParse warnings:', errors)

    const normalized = data.map(normalize)
    const places = includeSamples ? normalized : normalized.filter(isRealPlace)
    writeCache(places)
    return { places, source: 'network' }
  } catch (err) {
    console.warn('Pumgoda: falling back to bundled JSON.', err)
    return { places: fallbackPlaces, source: 'fallback' }
  }
}
