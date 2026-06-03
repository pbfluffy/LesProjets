import { useMemo, useState } from 'react'
import { useTrips } from '../hooks/useTrips'
import { useSharedTrip } from '../hooks/useSharedTrip'
import { computeTier } from '../data/computeTier'
import { STRINGS, interp } from '../i18n/strings'
import { buildTripShareUrl, buildCollabTripUrl } from '../shareTrip'
import PawTierBadge from './PawTierBadge'
import EmptyState from './EmptyState'
import './TripBuilder.css'

// A trip is a short ordered chain of pet-friendly stops (the design doc
// targets 3-5). Cap kept generous so the shared Line message stays readable.
const MAX_STOPS = 8

export default function TripBuilder({ places = [], lang = 'en', onOpenPlace }) {
  const s = STRINGS[lang]
  const {
    trips,
    createTrip,
    renameTrip,
    deleteTrip,
    addPlace,
    removePlace,
    movePlace,
    promoteToShared,
  } = useTrips()

  const [selectedTripId, setSelectedTripId] = useState(null)
  const [newName, setNewName] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [toast, setToast] = useState('')
  const [promoting, setPromoting] = useState(false)

  // id -> place, for resolving the ids stored on a trip
  const placeById = useMemo(() => {
    const map = new Map()
    for (const p of places) if (p.id) map.set(p.id, p)
    return map
  }, [places])

  const placeName = (p) => p.name?.[lang] || p.name?.en || p.id
  const placeMeta = (p) => {
    const type = s.types[p.type] || p.type
    return p.neighborhood ? `${type} · ${p.neighborhood}` : type
  }

  const flashToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  const handleCreate = () => {
    const trip = createTrip(newName)
    setNewName('')
    setSelectedTripId(trip.id)
  }

  // Always re-read the selected trip from the live array so edits show up.
  const selectedTrip = selectedTripId
    ? trips.find((t) => t.id === selectedTripId)
    : null

  // #97 Phase 3 — collaborative trips. The hook is called UNCONDITIONALLY
  // (null tripId when the open trip isn't shared) so hook order is stable. When
  // the trip is shared it subscribes live to sharedTrips/<remoteId>, so this
  // device sees other members' edits and writes flow back as debounced LWW.
  const isShared = !!(selectedTrip && selectedTrip.shared && selectedTrip.remoteId)
  const shared = useSharedTrip(isShared ? selectedTrip.remoteId : null)
  const live = isShared && shared.remote ? shared.remote : null

  // Effective trip content: the live remote doc wins when shared, else local.
  const stops = live ? (Array.isArray(live.placeIds) ? live.placeIds : []) : (selectedTrip ? selectedTrip.placeIds : [])
  const tripName = live ? (live.name || '') : (selectedTrip ? selectedTrip.name : '')
  const memberCount = live && Array.isArray(live.members) ? live.members.length : 0

  // P4 — resolve a uid to a display name from the live doc's memberNames map.
  // The current user reads as "You"; unknown members fall back to a generic.
  const nameFor = (uid) => {
    if (!uid) return s.trip.collabSomeone
    if (shared.user && uid === shared.user.uid) return s.trip.collabYou
    const nm = live && live.memberNames ? live.memberNames[uid] : null
    return nm || s.trip.collabSomeone
  }

  // ─────────────────────────────────────────── Mutators (route by share state)
  const canEditShared = !!shared.user
  const doAddPlace = (placeId) => {
    if (stops.includes(placeId)) return
    if (isShared) {
      shared.update({ placeIds: [...stops, placeId] })
      if (shared.user) shared.recordAdds({ [placeId]: shared.user.uid })
    } else addPlace(selectedTrip.id, placeId)
  }
  const doRemovePlace = (placeId) => {
    if (isShared) shared.update({ placeIds: stops.filter((x) => x !== placeId) })
    else removePlace(selectedTrip.id, placeId)
  }
  const doMovePlace = (index, dir) => {
    const j = index + dir
    if (j < 0 || j >= stops.length) return
    if (isShared) {
      const next = [...stops]
      ;[next[index], next[j]] = [next[j], next[index]]
      shared.update({ placeIds: next })
    } else {
      movePlace(selectedTrip.id, index, dir)
    }
  }
  const doRename = (name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return
    if (isShared) shared.update({ name: trimmed })
    else renameTrip(selectedTrip.id, trimmed)
  }

  // Owner promotes a local trip to a collaborative shared doc, then copies the
  // ?ctrip= link. The local trip id is reused as the shared doc id / share code.
  const handleMakeCollab = async () => {
    if (!shared.user) {
      flashToast(s.trip.collabSignIn)
      return
    }
    if (promoting) return
    setPromoting(true)
    try {
      const id = await shared.create({
        id: selectedTrip.id,
        name: selectedTrip.name,
        placeIds: selectedTrip.placeIds,
      })
      if (id) {
        promoteToShared(selectedTrip.id, id)
        try {
          await navigator.clipboard.writeText(buildCollabTripUrl(id))
          flashToast(s.trip.copied)
        } catch {
          flashToast(buildCollabTripUrl(id))
        }
      } else {
        flashToast(s.trip.collabSyncError)
      }
    } finally {
      setPromoting(false)
    }
  }

  const handleShareCollabLink = async () => {
    const url = buildCollabTripUrl(selectedTrip.remoteId)
    if (navigator.share) {
      try {
        await navigator.share({ title: s.trip.shareTitle, text: tripName, url })
        return
      } catch (e) {
        if (e && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      flashToast(s.trip.copied)
    } catch {
      flashToast(url)
    }
  }

  // ─────────────────────────────────────────── Trip list view
  if (!selectedTrip) {
    return (
      <div className="ph-trip-wrap">
        <div className="ph-trip-new">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={s.trip.namePlaceholder}
            maxLength={50}
            aria-label={s.trip.createTitle}
          />
          <button type="button" className="mono" onClick={handleCreate}>
            {s.trip.create}
          </button>
        </div>

        {trips.length === 0 ? (
          <EmptyState icon="🧳" title={s.trip.empty} subtitle={s.trip.emptySub} />
        ) : (
          <div className="ph-trip-list">
            {trips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                className="ph-trip-card surface surface-hover"
                onClick={() => setSelectedTripId(trip.id)}
              >
                <div className="ph-trip-card-body">
                  <div className="ph-trip-card-name">
                    {trip.name}
                    {trip.shared && (
                      <span className="ph-trip-collab-tag" aria-label={s.trip.collabLive}>
                        👥
                      </span>
                    )}
                  </div>
                  <div className="ph-trip-card-meta mono">
                    📍 {trip.placeIds.length}
                  </div>
                </div>
                <span className="ph-trip-card-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────── Trip detail view
  const atCap = stops.length >= MAX_STOPS

  const buildShareText = () => {
    const lines = [`🐾 ${tripName}`, '']
    stops.forEach((id, i) => {
      const p = placeById.get(id)
      if (!p) return
      const paws = '🐾'.repeat(computeTier(p).paws)
      lines.push(`${i + 1}. ${placeName(p)} ${paws}`)
      if (p.googleMapsUrl) lines.push(`   ${p.googleMapsUrl}`)
    })
    lines.push('', `🐾 ${s.trip.shareFooter}`)
    return lines.join('\n')
  }

  const handleShare = async () => {
    const text = buildShareText()
    const url = buildTripShareUrl({ name: tripName, placeIds: stops })
    if (navigator.share) {
      try {
        await navigator.share({ title: s.trip.shareTitle, text, url })
        return
      } catch (e) {
        if (e && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      flashToast(s.trip.copied)
    } catch {
      flashToast(url)
    }
  }

  const handleDelete = () => {
    if (window.confirm(s.trip.deleteConfirm)) {
      deleteTrip(selectedTrip.id)
      setSelectedTripId(null)
    }
  }

  const buildMapsUrl = () => {
    if (stops.length === 0) return null
    const points = []
    stops.forEach((id) => {
      const p = placeById.get(id)
      if (p && Array.isArray(p.coords) && p.coords.length === 2) {
        points.push(p.coords[0] + ',' + p.coords[1])
      }
    })
    if (points.length === 0) return null
    if (points.length === 1) {
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(points[0])
    }
    const origin = points[0]
    const destination = points[points.length - 1]
    const waypoints = points.slice(1, -1).join('|')
    let url = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(origin) + '&destination=' + encodeURIComponent(destination)
    if (waypoints) url += '&waypoints=' + encodeURIComponent(waypoints)
    return url
  }
  const mapsUrl = buildMapsUrl()

  const needle = pickerSearch.trim().toLowerCase()
  const pickerResults = places.filter((p) => {
    if (!p.id || stops.includes(p.id)) return false
    if (!needle) return true
    const hay = `${p.name?.en || ''} ${p.name?.th || ''} ${
      p.neighborhood || ''
    }`.toLowerCase()
    return hay.includes(needle)
  })
  const somethingToAdd = places.some((p) => p.id && !stops.includes(p.id))

  // Shared trips are read-from-remote; block edits until the snapshot is live
  // and the user is signed in (writes need an auth uid).
  const editsLocked = isShared && (!canEditShared || shared.status !== 'live')

  return (
    <div className="ph-trip-wrap">
      <div className="ph-trip-detail-bar">
        <button
          type="button"
          className="ph-trip-back"
          onClick={() => setSelectedTripId(null)}
        >
          {s.trip.back}
        </button>
        {live && (
          <span className="ph-trip-owner-badge" title={s.trip.collabOwner}>
            <span aria-hidden="true">👑</span> {nameFor(live.ownerUid)}
          </span>
        )}
        {isShared && (
          <span className="ph-trip-collab-status">
            <span
              className={`ph-trip-live-dot ${shared.status === 'live' ? 'is-live' : ''}`}
              aria-hidden="true"
            />
            <span className="mono">
              {shared.status === 'live'
                ? `${s.trip.collabLive} · ${memberCount} ${s.trip.collabMembers}`
                : shared.status === 'error' || shared.status === 'denied'
                  ? s.trip.collabSyncError
                  : '…'}
            </span>
          </span>
        )}
      </div>

      <input
        key={selectedTrip.id}
        type="text"
        className="ph-trip-name-input"
        defaultValue={tripName}
        maxLength={50}
        aria-label={s.trip.rename}
        onBlur={(e) => doRename(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        disabled={editsLocked}
      />

      {isShared && !canEditShared && (
        <p className="ph-trip-hint">{s.trip.collabSignIn}</p>
      )}

      {stops.length === 0 ? (
        <EmptyState icon="📍" title={s.trip.emptyStops} />
      ) : (
        <div className="ph-trip-stops">
          {stops.map((id, i) => {
            const p = placeById.get(id)
            return (
              <div key={id} className="ph-trip-stop surface">
                <span className="ph-trip-stop-index" aria-hidden="true">
                  {i + 1}
                </span>

                {p ? (
                  <button
                    type="button"
                    className="ph-trip-stop-body"
                    onClick={() => onOpenPlace?.(p)}
                  >
                    <div className="ph-trip-stop-name">{placeName(p)}</div>
                    <div className="ph-trip-stop-meta mono">{placeMeta(p)}</div>
                    <div className="ph-trip-stop-badge">
                      <PawTierBadge venue={p} lang={lang} />
                    </div>
                    {isShared && live && live.addedBy && live.addedBy[id] && (
                      <div className="ph-trip-stop-by mono">
                        {interp(s.trip.collabAddedBy, {
                          name: nameFor(live.addedBy[id]),
                        })}
                      </div>
                    )}
                  </button>
                ) : (
                  <span className="ph-trip-stop-missing">
                    {s.trip.unavailable}
                  </span>
                )}

                <div className="ph-trip-stop-controls">
                  <button
                    type="button"
                    className="ph-trip-arrow-btn"
                    onClick={() => doMovePlace(i, -1)}
                    disabled={i === 0 || editsLocked}
                    aria-label={s.trip.moveUp}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="ph-trip-arrow-btn"
                    onClick={() => doMovePlace(i, 1)}
                    disabled={i === stops.length - 1 || editsLocked}
                    aria-label={s.trip.moveDown}
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  className="ph-trip-remove-btn"
                  onClick={() => doRemovePlace(id)}
                  aria-label={s.trip.remove}
                  disabled={editsLocked}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        className="ph-trip-add"
        onClick={() => {
          setPickerSearch('')
          setPickerOpen(true)
        }}
        disabled={atCap || editsLocked}
      >
        {atCap ? interp(s.trip.full, { n: MAX_STOPS }) : s.trip.addStop}
      </button>

      {stops.length > 0 && stops.length < 3 && (
        <p className="ph-trip-hint">{s.trip.hint}</p>
      )}

      {/* #97 Phase 3 — promote to collaborative, or share the live link. */}
      {isShared ? (
        <button
          type="button"
          className="ph-trip-share"
          onClick={handleShareCollabLink}
        >
          {s.trip.collabShareLink}
        </button>
      ) : (
        <button
          type="button"
          className="ph-trip-collab-btn"
          onClick={handleMakeCollab}
          disabled={promoting || stops.length === 0}
        >
          {s.trip.makeCollab}
        </button>
      )}

      <button
        type="button"
        className="ph-trip-share"
        onClick={handleShare}
        disabled={stops.length === 0}
        style={{ marginTop: 8 }}
      >
        {s.trip.share}
      </button>

      <a
        className="ph-trip-share"
        href={mapsUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: 8, ...(!mapsUrl ? { pointerEvents: 'none', opacity: 0.5 } : {}) }}
        onClick={!mapsUrl ? (e) => e.preventDefault() : undefined}
      >
        {s.trip.openInMaps}
      </a>

      {toast && <div className="ph-trip-toast">{toast}</div>}

      <button
        type="button"
        className="ph-trip-delete mono"
        onClick={handleDelete}
      >
        {s.trip.delete}
      </button>

      {pickerOpen && (
        <div
          className="ph-trip-picker-overlay"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="ph-trip-picker"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={s.trip.pickerTitle}
          >
            <div className="ph-trip-picker-head">
              <h3 className="ph-trip-picker-title">{s.trip.pickerTitle}</h3>
              <button
                type="button"
                className="ph-trip-picker-close"
                onClick={() => setPickerOpen(false)}
                aria-label={s.trip.done}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              className="ph-trip-picker-search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder={s.trip.pickerSearch}
              aria-label={s.trip.pickerSearch}
            />

            <div className="ph-trip-picker-list">
              {pickerResults.length === 0 ? (
                <p className="ph-trip-picker-empty">
                  {somethingToAdd ? s.trip.pickerEmpty : s.trip.pickerAllAdded}
                </p>
              ) : (
                pickerResults.map((p) => (
                  <div key={p.id} className="ph-trip-picker-row">
                    <div className="ph-trip-picker-row-body">
                      <div className="ph-trip-picker-row-name">
                        {placeName(p)}
                      </div>
                      <div className="ph-trip-picker-row-meta mono">
                        {placeMeta(p)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`ph-trip-picker-add ${atCap ? 'is-added' : ''}`}
                      onClick={() => !atCap && doAddPlace(p.id)}
                      disabled={atCap}
                    >
                      {s.trip.add}
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="ph-trip-picker-done"
              onClick={() => setPickerOpen(false)}
            >
              {s.trip.done}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
