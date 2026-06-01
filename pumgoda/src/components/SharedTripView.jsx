import { useMemo } from 'react'
import { STRINGS, interp } from '../i18n/strings'
import PawTierBadge from './PawTierBadge'

// #97 Phase 2 — read-only view of a trip shared via ?trip=. The recipient sees
// the itinerary resolved against their OWN fetched places (a place that's been
// removed shows as unavailable) and can clone it into their own trips.
export default function SharedTripView({ shared, places = [], lang = 'en', onClone, onClose }) {
  const s = STRINGS[lang]
  const t = s.sharedTrip

  const placeById = useMemo(() => {
    const map = new Map()
    for (const p of places) if (p.id) map.set(p.id, p)
    return map
  }, [places])

  const placeName = (p) => p.name?.[lang] || p.name?.en || p.id
  const ids = Array.isArray(shared.placeIds) ? shared.placeIds : []
  const resolvedCount = ids.filter((id) => placeById.has(id)).length

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200, padding: 16,
  }
  const sheetStyle = {
    background: 'var(--bg)', borderRadius: 16, padding: '20px 16px 24px',
    maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            style={{ border: 'none', background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)' }}>{t.subtitle}</p>
        <div style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 12px' }}>
          🐾 {shared.name || t.untitled}
        </div>

        {ids.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{t.emptyStops}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ids.map((id, i) => {
              const p = placeById.get(id)
              return (
                <div
                  key={id + '_' + i}
                  className="surface"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10 }}
                >
                  <span aria-hidden="true" style={{ fontWeight: 700, color: 'var(--muted)', flexShrink: 0, width: 18, textAlign: 'center' }}>
                    {i + 1}
                  </span>
                  {p ? (
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{placeName(p)}</span>
                      <span style={{ display: 'block', marginTop: 2 }}>
                        <PawTierBadge venue={p} lang={lang} />
                      </span>
                    </span>
                  ) : (
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                      {t.unavailable}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onClone}
          style={{
            width: '100%', marginTop: 16, padding: '12px 16px', border: 'none',
            borderRadius: 10, background: 'var(--accent)', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer', font: 'inherit',
          }}
        >
          {t.clone}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', marginTop: 8, padding: '10px 16px',
            border: '0.5px solid var(--border)', borderRadius: 10,
            background: 'transparent', color: 'inherit', fontSize: 14, cursor: 'pointer', font: 'inherit',
          }}
        >
          {t.close}
        </button>

        {resolvedCount < ids.length && (
          <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            {interp(t.someUnavailable, { n: ids.length - resolvedCount })}
          </p>
        )}
      </div>
    </div>
  )
}
