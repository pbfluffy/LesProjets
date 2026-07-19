// Shared by the map's search box and DogDetail's merge-target picker —
// matches on name or AI breed guess, case-insensitive substring.
export function searchDogs(dogs, query, { excludeId } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return dogs
    .filter((d) => d.id !== excludeId)
    .filter((d) => {
      const name = (d.name || '').toLowerCase()
      const breed = (d.latestTags?.breedGuess || '').toLowerCase()
      return name.includes(q) || breed.includes(q)
    })
    .slice(0, 8)
}
