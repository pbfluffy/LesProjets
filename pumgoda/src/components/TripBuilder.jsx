import { useMemo, useState } from 'react'
import { useTrips } from '../hooks/useTrips'
import { computeTier } from '../data/computeTier'
import { STRINGS, interp } from '../i18n/strings'
import { buildTripShareUrl } from '../shareTrip'
import PawTierBadge from './PawTierBadge'
import EmptyState from './EmptyState'
import './TripBuilder.css'

// A trip is a short ordered chain of pet-friendly stops (the design doc
// targets 3-5). Cap kept generous so the shared Line message stays readable.
const MAX_STOPS = 8

// App URL without query/hash — appended to the shared trip text.
function appUrl() {
  return window.location.href.split('?')[0].split('#')[0]
}

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
  } = useTrips()

  const [selectedTripId, setSelectedTripId] = useState(null)
  const [newName, setNewName] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [toast, setToast] = useState('')

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
                  <div className="ph-trip-card-name">{trip.name}</div>
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
  const stops = selectedTrip.placeIds
  const atCap = stops.length >= MAX_STOPS

  const buildShareText = () => {
    const lines = [`🐾 ${selectedTrip.name}`, '']
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
    const url = buildTripShareUrl(selectedTrip)
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

  // Places not already in the trip, filtered by the picker search box.
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
      </div>

      <input
        key={selectedTrip.id}
        type="text"
        className="ph-trip-name-input"
        defaultValue={selectedTrip.name}
        maxLength={50}
        aria-label={s.trip.rename}
        onBlur={(e) => renameTrip(selectedTrip.id, e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />

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
                    onClick={() => movePlace(selectedTrip.id, i, -1)}
                    disabled={i === 0}
                    aria-label={s.trip.moveUp}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="ph-trip-arrow-btn"
                    onClick={() => movePlace(selectedTrip.id, i, 1)}
                    disabled={i === stops.length - 1}
                    aria-label={s.trip.moveDown}
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  className="ph-trip-remove-btn"
                  onClick={() => removePlace(selectedTrip.id, id)}
                  aria-label={s.trip.remove}
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
        disabled={atCap}
      >
        {atCap ? interp(s.trip.full, { n: MAX_STOPS }) : s.trip.addStop}
      </button>

      {stops.length > 0 && stops.length < 3 && (
        <p className="ph-trip-hint">{s.trip.hint}</p>
      )}

      <button
        type="button"
        className="ph-trip-share"
        onClick={handleShare}
        disabled={stops.length === 0}
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
                      onClick={() => !atCap && addPlace(selectedTrip.id, p.id)}
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
