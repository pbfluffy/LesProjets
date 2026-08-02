// Turns a lat/lng into a short, human-readable place name via OpenStreetMap's
// free Nominatim reverse-geocoding API — no API key, no backend proxy needed.
// Best-effort only: any failure (network, rate limit, no result) resolves to
// null rather than throwing, since a missing location name should never block
// saving a sighting. Called once per report and cached on the dog/sighting
// record (see useDogs.js) rather than re-geocoded on every view.
//
// Nominatim's usage policy asks for an identifying User-Agent or Referer —
// browsers block scripts from setting a custom User-Agent, but do send the
// page's own Referer automatically, which satisfies it for a low-volume,
// one-request-per-report client like this.
const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat, lng, lang = 'en') {
  try {
    const url = `${ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=${lang === 'th' ? 'th' : 'en'}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const a = data.address || {}
    // Most specific "you are here" component first (road/soi, then
    // neighbourhood/quarter — Bangkok's subdistricts commonly come back as
    // "quarter" rather than "neighbourhood"), falling back to whatever
    // broader area Nominatim did return if none of those are present.
    const primary = a.road || a.neighbourhood || a.quarter || a.suburb || a.village || null
    const locality = a.suburb || a.city_district || a.town || a.city || null
    const parts = [primary, locality && locality !== primary ? locality : null].filter(Boolean)
    if (parts.length) return parts.join(', ')
    return data.display_name || null
  } catch (err) {
    console.warn('[majon] reverse geocode failed:', err)
    return null
  }
}
