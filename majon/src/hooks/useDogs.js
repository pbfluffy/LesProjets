import { useEffect, useState } from 'react'
import {
  db, doc, collection, addDoc, updateDoc, query, orderBy, serverTimestamp, onSnapshot,
} from '../firebase'
import { haversineMeters } from '../haversine'

const COLLECTION = 'strayDogs'

// Live list of every reported dog — small hobby-scale collection, so a single
// whole-collection subscription (used for both the map and candidate
// matching) is simpler and more robust than building geo range queries.
export function useDogs() {
  const [dogs, setDogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        setDogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[majon] useDogs snapshot error:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  return { dogs, loading }
}

export function useSightings(dogId) {
  const [sightings, setSightings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dogId) {
      setSightings([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(collection(db, COLLECTION, dogId, 'sightings'), orderBy('reportedAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSightings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[majon] useSightings snapshot error:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [dogId])

  return { sightings, loading }
}

export async function createDogWithSighting({ user, photoUrl, tags, lat, lng, name, note, friendliness }) {
  const dogRef = await addDoc(collection(db, COLLECTION), {
    name: name?.trim() || null,
    createdBy: user.uid,
    createdByName: user.displayName || null,
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    lastLat: lat,
    lastLng: lng,
    latestPhotoUrl: photoUrl,
    latestTags: tags || null,
  })
  await addDoc(collection(db, COLLECTION, dogRef.id, 'sightings'), {
    photoUrl,
    tags: tags || null,
    lat,
    lng,
    reportedBy: user.uid,
    reportedByName: user.displayName || null,
    reportedAt: serverTimestamp(),
    note: note?.trim() || null,
    friendliness: friendliness || null,
  })
  return dogRef.id
}

export async function addSightingToDog({ dogId, user, photoUrl, tags, lat, lng, note, friendliness }) {
  await addDoc(collection(db, COLLECTION, dogId, 'sightings'), {
    photoUrl,
    tags: tags || null,
    lat,
    lng,
    reportedBy: user.uid,
    reportedByName: user.displayName || null,
    reportedAt: serverTimestamp(),
    note: note?.trim() || null,
    friendliness: friendliness || null,
  })
  await updateDoc(doc(db, COLLECTION, dogId), {
    lastSeenAt: serverTimestamp(),
    lastLat: lat,
    lastLng: lng,
    latestPhotoUrl: photoUrl,
    latestTags: tags || null,
  })
}

const FRIENDLINESS_LEVELS = ['friendly', 'neutral', 'cautious']

// Majority vote across a dog's sightings — crowd-sourced temperament, not a
// single reporter's opinion. Returns null label when no one has rated it yet.
export function summarizeFriendliness(sightings) {
  const counts = { friendly: 0, neutral: 0, cautious: 0 }
  let total = 0
  for (const s of sightings) {
    if (FRIENDLINESS_LEVELS.includes(s.friendliness)) {
      counts[s.friendliness] += 1
      total += 1
    }
  }
  if (total === 0) return { label: null, counts, total }
  const label = FRIENDLINESS_LEVELS.reduce((a, b) => (counts[b] > counts[a] ? b : a))
  return { label, counts, total }
}

export async function renameDog(dogId, name) {
  await updateDoc(doc(db, COLLECTION, dogId), { name: name?.trim() || null })
}

const TAG_FIELDS = ['colorPrimary', 'pattern', 'size', 'earType', 'tailType', 'sexGuess']

// Simple weighted tag-overlap score — not ML, just a count of matching
// descriptive fields (case-insensitive), used to rank nearby candidates.
function tagOverlapScore(a, b) {
  if (!a || !b) return 0
  let score = 0
  for (const field of TAG_FIELDS) {
    const av = (a[field] || '').toString().trim().toLowerCase()
    const bv = (b[field] || '').toString().trim().toLowerCase()
    if (av && bv && av === bv) score += 1
  }
  return score
}

// Candidates = dogs with a last-known position within radiusMeters, ranked by
// distance first (closest = most likely) then by tag-overlap score.
export function findCandidates(dogs, { lat, lng, tags }, radiusMeters = 500, max = 5) {
  return dogs
    .map((dog) => {
      if (typeof dog.lastLat !== 'number' || typeof dog.lastLng !== 'number') return null
      const distance = haversineMeters({ lat, lng }, { lat: dog.lastLat, lng: dog.lastLng })
      if (distance > radiusMeters) return null
      return { dog, distance, tagScore: tagOverlapScore(tags, dog.latestTags) }
    })
    .filter(Boolean)
    .sort((a, b) => (b.tagScore - a.tagScore) || (a.distance - b.distance))
    .slice(0, max)
}
