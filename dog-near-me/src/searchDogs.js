import { localizedBreed } from './breedLabel'

// Shared by the map's search box and DogDetail's merge-target picker —
// matches on name or AI breed guess, case-insensitive substring. Matches
// against the localized breed label (e.g. "พันทาง"), not just the raw
// English tag value — otherwise searching in Thai for the exact term shown
// on screen would silently find nothing.
export function searchDogs(dogs, query, { excludeId, lang } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return dogs
    .filter((d) => d.id !== excludeId)
    .filter((d) => {
      const name = (d.name || '').toLowerCase()
      const breed = (localizedBreed(d.latestTags?.breedGuess, lang) || '').toLowerCase()
      return name.includes(q) || breed.includes(q)
    })
    .slice(0, 8)
}
