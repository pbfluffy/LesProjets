import { useEffect, useState } from 'react'
import {
  db, doc, collection, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp, onSnapshot, writeBatch,
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

export async function createDogWithSighting({ user, photoUrl, tags, lat, lng, name, note, friendliness, anonymous }) {
  const displayName = anonymous ? null : (user.displayName || null)
  const dogRef = await addDoc(collection(db, COLLECTION), {
    name: name?.trim() || null,
    createdBy: user.uid,
    createdByName: displayName,
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
    reportedByName: displayName,
    reportedAt: serverTimestamp(),
    note: note?.trim() || null,
    friendliness: friendliness || null,
  })
  return dogRef.id
}

export async function addSightingToDog({ dogId, user, photoUrl, tags, lat, lng, note, friendliness, anonymous }) {
  const displayName = anonymous ? null : (user.displayName || null)
  await addDoc(collection(db, COLLECTION, dogId, 'sightings'), {
    photoUrl,
    tags: tags || null,
    lat,
    lng,
    reportedBy: user.uid,
    reportedByName: displayName,
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

// Deletes a sighting the caller reported. If it was the dog's only sighting,
// the dog itself is removed too (a dog with zero sightings has nothing to
// show on the map); otherwise the dog's denormalized "latest" fields are
// recomputed from whichever remaining sighting is now most recent.
//
// Re-fetches the sightings subcollection fresh from the server after
// deleting, rather than trusting a caller-supplied "remaining" list — the
// caller's list comes from a live onSnapshot listener that can still be a
// step behind (e.g. deleting a second report before the first deletion's
// snapshot update has arrived), which would recompute "latest" from a
// sighting that was itself already deleted, or skip cleaning up the dog
// doc when it should have been removed.
export async function deleteSighting(dogId, sightingId) {
  await deleteDoc(doc(db, COLLECTION, dogId, 'sightings', sightingId))

  const snap = await getDocs(collection(db, COLLECTION, dogId, 'sightings'))
  if (snap.empty) {
    await deleteDoc(doc(db, COLLECTION, dogId))
    return { dogDeleted: true }
  }

  const remaining = snap.docs.map((d) => d.data())
  const toMs = (s) => (s.reportedAt?.toMillis ? s.reportedAt.toMillis() : 0)
  const latest = remaining.reduce((a, b) => (toMs(b) > toMs(a) ? b : a))
  await updateDoc(doc(db, COLLECTION, dogId), {
    lastSeenAt: latest.reportedAt,
    lastLat: latest.lat,
    lastLng: latest.lng,
    latestPhotoUrl: latest.photoUrl,
    latestTags: latest.tags || null,
  })
  return { dogDeleted: false }
}

// Splits one sighting out of dogId into a brand-new dog — the fix for a
// sighting that got attached to the wrong dog, whether through a bad AI/
// candidate match during the normal report flow or "report another
// sighting" on the wrong entry. Symmetric to mergeDogs, but for a single
// sighting instead of a whole dog, and creating rather than removing.
//
// Single sightings read (not a separate getDoc) doubles as both the target
// sighting's data AND the "what's left" set for recomputing dogId's latest
// fields, avoiding a second round trip and the same read-then-stale-write
// race deleteSighting's comment describes.
export async function detachSighting(dogId, sightingId) {
  const snap = await getDocs(collection(db, COLLECTION, dogId, 'sightings'))
  const target = snap.docs.find((d) => d.id === sightingId)
  if (!target) return { dogDeleted: false }
  const data = target.data()
  const remaining = snap.docs.filter((d) => d.id !== sightingId)

  const batch = writeBatch(db)
  const newDogRef = doc(collection(db, COLLECTION))
  batch.set(newDogRef, {
    name: null,
    createdBy: data.reportedBy,
    createdByName: data.reportedByName || null,
    createdAt: serverTimestamp(),
    lastSeenAt: data.reportedAt,
    lastLat: data.lat,
    lastLng: data.lng,
    latestPhotoUrl: data.photoUrl,
    latestTags: data.tags || null,
  })
  batch.set(doc(collection(db, COLLECTION, newDogRef.id, 'sightings')), data)
  batch.delete(target.ref)

  let dogDeleted = false
  if (remaining.length === 0) {
    dogDeleted = true
    batch.delete(doc(db, COLLECTION, dogId))
  } else {
    const toMs = (s) => (s.reportedAt?.toMillis ? s.reportedAt.toMillis() : 0)
    const latest = remaining.map((d) => d.data()).reduce((a, b) => (toMs(b) > toMs(a) ? b : a))
    batch.update(doc(db, COLLECTION, dogId), {
      lastSeenAt: latest.reportedAt,
      lastLat: latest.lat,
      lastLng: latest.lng,
      latestPhotoUrl: latest.photoUrl,
      latestTags: latest.tags || null,
    })
  }

  await batch.commit()
  return { dogDeleted, newDogId: newDogRef.id }
}

// Merges sourceId into targetId: moves every sighting across (as new docs —
// original sighting IDs aren't referenced anywhere else, so there's no need
// to preserve them) and deletes the source dog entirely. This is how
// duplicate entries for the same dog (created when the AI/location match
// missed, or someone picked "it's a new dog" by mistake) get fixed after
// the fact — the community has no other way to correct that once it happens.
//
// Uses a single atomic batch for the move+delete, then recomputes the
// target's denormalized "latest" fields the same way deleteSighting does,
// from a fresh read of its now-combined sightings.
export async function mergeDogs(sourceId, targetId) {
  if (sourceId === targetId) return

  const sourceSnap = await getDocs(collection(db, COLLECTION, sourceId, 'sightings'))
  const batch = writeBatch(db)
  sourceSnap.docs.forEach((d) => {
    batch.set(doc(collection(db, COLLECTION, targetId, 'sightings')), d.data())
    batch.delete(d.ref)
  })
  batch.delete(doc(db, COLLECTION, sourceId))
  await batch.commit()

  const targetSnap = await getDocs(collection(db, COLLECTION, targetId, 'sightings'))
  const all = targetSnap.docs.map((d) => d.data())
  const toMs = (s) => (s.reportedAt?.toMillis ? s.reportedAt.toMillis() : 0)
  const latest = all.reduce((a, b) => (toMs(b) > toMs(a) ? b : a))
  await updateDoc(doc(db, COLLECTION, targetId), {
    lastSeenAt: latest.reportedAt,
    lastLat: latest.lat,
    lastLng: latest.lng,
    latestPhotoUrl: latest.photoUrl,
    latestTags: latest.tags || null,
  })
}

// Flags live under strayDogs/{dogId}/flags — read is admin-only per the
// Firestore rules (see README's "One-time setup"), so this hook only
// subscribes when `enabled` (the caller checks isAdmin first); otherwise
// it would just get a permission-denied error for every other visitor.
export function useFlags(dogId, enabled) {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!dogId || !enabled) {
      setFlags([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = onSnapshot(
      collection(db, COLLECTION, dogId, 'flags'),
      (snap) => {
        setFlags(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[majon] useFlags snapshot error:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [dogId, enabled])

  return { flags, loading }
}

export async function flagDog(dogId, { user, reason, note }) {
  await addDoc(collection(db, COLLECTION, dogId, 'flags'), {
    reason,
    note: note?.trim() || null,
    reportedBy: user.uid,
    reportedByName: user.displayName || null,
    reportedAt: serverTimestamp(),
  })
}

export async function dismissFlag(dogId, flagId) {
  await deleteDoc(doc(db, COLLECTION, dogId, 'flags', flagId))
}

// Admin moderation action: removes a dog entirely (every sighting, every
// flag, and the dog doc itself) — distinct from deleteSighting, which only
// lets a reporter remove their own single report.
export async function deleteDogEntirely(dogId) {
  const [sightingsSnap, flagsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTION, dogId, 'sightings')),
    getDocs(collection(db, COLLECTION, dogId, 'flags')),
  ])
  const batch = writeBatch(db)
  sightingsSnap.docs.forEach((d) => batch.delete(d.ref))
  flagsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, COLLECTION, dogId))
  await batch.commit()
}

const FRIENDLINESS_LEVELS = ['friendly', 'neutral', 'cautious']

// Shared color mapping so the report-flow selector and the dog detail page
// use the same friendly=green / neutral=amber / cautious=red convention as
// the rest of the app's tinted-text-on-tinted-background badges.
const FRIENDLINESS_COLORS = { friendly: 'green', neutral: 'amber', cautious: 'red' }
export function friendlinessColor(level) {
  return FRIENDLINESS_COLORS[level] || null
}

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

const TAG_FIELDS = ['colorPrimary', 'pattern', 'size', 'earType', 'tailType', 'sexGuess', 'breedGuess']

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

// Location-only shortlist — the input to the AI visual-compare step
// (compareDogPhotos), which does real photo-to-photo comparison instead of
// the text-tag matching below. Kept as its own function (rather than just
// calling findCandidates with no tags) so the two matching strategies stay
// clearly distinct in the code, not coupled by an implicit "null tags skips
// scoring" side effect.
export function findNearbyDogs(dogs, { lat, lng }, radiusMeters = 500, max = 5) {
  return dogs
    .map((dog) => {
      if (typeof dog.lastLat !== 'number' || typeof dog.lastLng !== 'number') return null
      const distance = haversineMeters({ lat, lng }, { lat: dog.lastLat, lng: dog.lastLng })
      if (distance > radiusMeters) return null
      return { dog, distance }
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, max)
}

// Fallback candidates when the AI compare call fails — dogs with a
// last-known position within radiusMeters, ranked by distance first
// (closest = most likely) then by text-tag overlap score.
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
