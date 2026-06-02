import { useMemo, useState } from 'react'
import { useSharedTrip } from '../hooks/useSharedTrip'
import { STRINGS, interp } from '../i18n/strings'
import PawTierBadge from './PawTierBadge'

// #97 Phase 3 — landing view when the app is opened via ?ctrip=<id>. Unlike the
// Phase 2 read-only SharedTripView (which decodes a self-contained ?trip=
// snapshot), this subscribes LIVE to sharedTrips/<id>. A signed-in non-member
// can "Join + edit" (B1 self-join), after which the trip is mirrored into their
// own trips list as a collaborative trip and edits sync both ways.
export default function JoinCollabView({ tripId, places = [], lang = 'en', onJoined, onClose }) {
  const s = STRINGS[lang]
  const t = s.trip
  const st = s.sharedTrip
  const [joining, setJoining] = useState(false)

  const shared = useSharedTrip(tripId)
  const remote = shared.remote

  const placeById = useMemo(() => {
    const map = new Map()
    for (const p of places) if (p.id) map.set(p.id, p)
    return map
  }, [places])

  const placeName = (p) => p.name?.[lang] || p.name?.en || p.id
  const ids = remote && Array.isArray(remote.placeIds) ? remote.placeIds : []
  const resolvedCount = ids.filter((id) => placeById.has(id)).length

  const handleJoin = async () => {
    if (!shared.user || joining) return
    setJoining(true)
    try {
      const ok = await shared.join()
      if (ok) {
        onJoined({ id: tripId, name: remote ? remote.name : '', placeIds: ids })
      }
    } finally {
      setJoining(false)
    }
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200, padding: 16,
  }
  const sheetStyle = {
    background: 'var(--bg)', borderRadius: 16, padding: '20px 16px 24px',
    maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto',
  }

  const loading = shared.status === 'loading' || shared.status === 'idle'
  const failed = shared.status === 'error' || shared.status === 'denied'

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{t.collabJoinTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={st.close}
            style={{ border: 'none', background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)' }}>{t.collabJoinSub}</p>

        {loading && (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '20px 0' }}>…</p>
        )}

        {failed && (
          <p style={{ fontSize: 13, color: 'var(--accent)', padding: '12px 0' }}>{t.collabSyncError}</p>
        )}

        {!loading && !failed && remote && (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 12px' }}>
              🐾 {remote.name || st.untitled}
            </div>

            {ids.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{st.emptyStops}</p>
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
                          {st.unavailable}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!shared.user ? (
              <p style={{ margin: '16px 0 0', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                {t.collabSignIn}
              </p>
            ) : shared.isMember ? (
              <button
                type="button"
                onClick={() => onJoined({ id: tripId, name: remote.name, placeIds: ids })}
                style={{
                  width: '100%', marginTop: 16, padding: '12px 16px', border: 'none',
                  borderRadius: 10, background: 'var(--accent)', color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer', font: 'inherit',
                }}
              >
                {t.collabJoined}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                style={{
                  width: '100%', marginTop: 16, padding: '12px 16px', border: 'none',
                  borderRadius: 10, background: 'var(--accent)', color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: joining ? 'default' : 'pointer',
                  opacity: joining ? 0.6 : 1, font: 'inherit',
                }}
              >
                {t.collabJoin}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%', marginTop: 8, padding: '10px 16px',
                border: '0.5px solid var(--border)', borderRadius: 10,
                background: 'transparent', color: 'inherit', fontSize: 14, cursor: 'pointer', font: 'inherit',
              }}
            >
              {st.close}
            </button>

            {resolvedCount < ids.length && (
              <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                {interp(st.someUnavailable, { n: ids.length - resolvedCount })}
              </p>
            )}
          </>
        )}

        {failed && (
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%', marginTop: 16, padding: '10px 16px',
              border: '0.5px solid var(--border)', borderRadius: 10,
              background: 'transparent', color: 'inherit', fontSize: 14, cursor: 'pointer', font: 'inherit',
            }}
          >
            {st.close}
          </button>
        )}
      </div>
    </div>
  )
}
