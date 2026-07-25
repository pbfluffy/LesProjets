import { useEffect, useState } from 'react'
import PawTierBadge from './PawTierBadge'
import PumbaBadge from './PumbaBadge'
import { STRINGS, interp } from '../i18n/strings'
import { normalizeHours, formatHours, isOpenNow } from '../data/hours'
import { useTrips } from '../hooks/useTrips'
import VoteButtons from './VoteButtons'
import './PlaceDetail.css'
import { shareToLine, isInLine } from '../liff.js'

export default function PlaceDetail({ venue, lang, onClose, onToggleSave, isSaved }) {
  const s = STRINGS[lang]
  const name = venue.name?.[lang] || venue.name?.en || venue.name?.th || venue.id
  const address = venue.address?.[lang] || venue.address?.en
  const notes = venue.notes?.[lang] || venue.notes?.en
  const hoursDisplay = formatHours(normalizeHours(venue), lang) || venue.hours || null
  const venueOpen = isOpenNow(venue)

  const { trips, createTrip, addPlace, removePlace } = useTrips()
  const [tripPanelOpen, setTripPanelOpen] = useState(false)
  const [newTripName, setNewTripName] = useState('')
  const venueTripCount = trips.filter((t) => t.placeIds.includes(venue.id)).length

  const handleCreateAndAdd = () => {
    const trip = createTrip(newTripName)
    addPlace(trip.id, venue.id)
    setNewTripName('')
  }

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const policyRows = [
    ['indoor_allowed', s.policy.indoor_allowed],
    ['no_size_limit', s.policy.no_size_limit],
    ['no_stroller_needed', s.policy.no_stroller_needed],
    ['water_bowl', s.policy.water_bowl],
    ['pet_menu', s.policy.pet_menu],
    ['off_leash_zone', s.policy.off_leash_zone],
    ['no_fee', s.policy.no_fee],
    ['overnight', s.policy.overnight],
  ]

  return (
    <div className="ph-detail">
      <div className="ph-detail-bar">
        <button className="ph-back" onClick={onClose}>{s.detail.back}</button>
        <button
          className={`ph-save mono ${isSaved ? 'is-saved' : ''}`}
          onClick={() => onToggleSave?.(venue.id)}
        >
          {isSaved ? `♥ ${s.detail.unsave}` : `♡ ${s.detail.save}`}
        </button>
      </div>

      <div className="ph-detail-body">
        <div className="ph-detail-head">
          <h2 className="ph-detail-name">{name}</h2>
          <div className="ph-detail-meta mono">
            {s.types[venue.type?.toLowerCase().replace(/[\s-]+/g, '_')] || venue.type}
            {venue.neighborhood ? ` · ${venue.neighborhood}` : ''}
            {venue.province ? ` · ${venue.province}` : ''}
            {venue.priceTier ? ` · ${venue.priceTier}` : ''}
          </div>
          <div className="ph-detail-badges">
            <PawTierBadge venue={venue} lang={lang} size="lg" />
            <PumbaBadge venue={venue} lang={lang} />
          </div>
        </div>

        <PhotoStrip
          photos={[venue.pumba?.photoUrl, ...(Array.isArray(venue.photos) ? venue.photos : [])]}
          verifiedUrl={venue.pumba?.photoUrl || null}
          label={name}
        />

        {/* Add this place to a trip */}
        <div className="ph-pd-trip">
          <button
            type="button"
            className={'ph-pd-trip-btn ' + (tripPanelOpen ? 'is-open' : '')}
            onClick={() => setTripPanelOpen((o) => !o)}
            aria-expanded={tripPanelOpen}
          >
            🧳 {s.trip.addToTrip}
            {venueTripCount > 0 && (
              <span className="ph-pd-trip-count">{venueTripCount}</span>
            )}
          </button>

          {tripPanelOpen && (
            <div className="ph-pd-trip-panel">
              <div className="ph-pd-trip-new">
                <input
                  type="text"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                  placeholder={s.trip.namePlaceholder}
                  maxLength={50}
                />
                <button type="button" onClick={handleCreateAndAdd}>
                  {s.trip.create}
                </button>
              </div>

              {trips.length > 0 && (
                <div className="ph-pd-trip-list">
                  {trips.map((t) => {
                    const inTrip = t.placeIds.includes(venue.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={'ph-pd-trip-row ' + (inTrip ? 'is-in' : '')}
                        onClick={() =>
                          inTrip
                            ? removePlace(t.id, venue.id)
                            : addPlace(t.id, venue.id)
                        }
                      >
                        <span className="ph-pd-trip-check" aria-hidden="true">
                          {inTrip ? '✓' : '+'}
                        </span>
                        <span className="ph-pd-trip-name">{t.name}</span>
                        <span className="ph-pd-trip-meta">📍 {t.placeIds.length}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification — last-verified date; Pumba's own photo (if any) is merged into the strip above */}
        {(venue.pumba?.verified || venue.lastVerified) && (
          <section className="ph-section">
            <h3 className="ph-section-title">{s.detail.sections.verification}</h3>
            <div className="ph-verify-row">
              {venue.lastVerified && (
                <p className="ph-verify-date mono">
                  {interp(s.card.lastVerified, { date: venue.lastVerified })}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Policy block — the highest-signal section */}
        <section className="ph-section">
          <h3 className="ph-section-title">{s.detail.sections.policy}</h3>
          <ul className="ph-policy-grid">
            {policyRows.map(([key, label]) => {
              // no_stroller_needed inverts stroller_required (true = no stroller needed = good)
              const isYes = key === 'no_stroller_needed'
                ? !venue.policy?.stroller_required
                : !!venue.policy?.[key]
              return (
                <li key={key} className={isYes ? 'is-yes' : 'is-no'}>
                  <span className="ph-policy-icon">{isYes ? '✓' : '·'}</span>
                  <span>{label}</span>
                </li>
              )
            })}
          </ul>
          {venue.policy?.size_limit_kg && (
            <p className="ph-policy-note mono">
              {interp(s.card.petsLimit, { kg: venue.policy.size_limit_kg })}
            </p>
          )}
          {venue.policy?.fee_baht && (
            <p className="ph-policy-note mono">
              {interp(s.card.fee, { baht: venue.policy.fee_baht })}
            </p>
          )}
        </section>

        {/* Community confidence */}
        <VoteButtons placeId={venue.id} lang={lang} />

        {/* Hours (#108: structured bilingual render, falls back to raw text) */}
        {hoursDisplay && (
          <section className="ph-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="ph-section-title">{s.detail.sections.hours}</h3>
              {venueOpen === true && <span className="ph-open-badge">{s.hours.openNow}</span>}
            </div>
            <div className="ph-hours mono">
              {hoursDisplay.split(' · ').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        {(venue.phone || venue.website || venue.instagram || address) && (
          <section className="ph-section">
            <h3 className="ph-section-title">{s.detail.sections.contact}</h3>
            <div className="ph-contact">
              {address && <p>{address}</p>}
              {venue.phone && (
                <a href={`tel:${venue.phone}`} className="ph-contact-link">
                  📞 {venue.phone}
                </a>
              )}
              {venue.website && (
                <a
                  href={venue.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ph-contact-link"
                >
                  🌐 {s.detail.visitWebsite}
                </a>
              )}
              {venue.instagram && (
                <a
                  href={`https://instagram.com/${String(venue.instagram).replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ph-contact-link"
                >
                  📷 {venue.instagram}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Notes */}
        {notes && (
          <section className="ph-section">
            <h3 className="ph-section-title">{s.detail.sections.notes}</h3>
            <p className="ph-notes">{notes}</p>
          </section>
        )}

        {/* Open in Maps */}
        {venue.googleMapsUrl && (
          <a
            className="ph-cta"
            href={venue.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {s.detail.openInMaps} ↗
          </a>
        )}

        {/* Share via Line */}
        <button
          className="ph-cta"
          style={{ background: '#06C755', color: '#fff', border: 'none', cursor: 'pointer', width: '100%', marginTop: 8 }}
          onClick={async () => {
            // Bug fix: this used to hardcode the generic pumgoda/ URL, so every
            // shared place unfurled/opened as the homepage. Build the same
            // ?place=<id> deep link the app itself now reads on load — the
            // pumgoda-og-meta Worker rewrites the preview card for this URL.
            let placeUrl
            try {
              const u = new URL(window.location.href)
              u.searchParams.set('place', venue.id)
              u.hash = ''
              placeUrl = u.toString()
            } catch {
              placeUrl = 'https://pumbafluffycorgi.com/pumgoda/?place=' + encodeURIComponent(venue.id)
            }
            const foundLine = lang === 'th' ? `พบที่ Pumgoda · ${placeUrl}` : `Found on Pumgoda · ${placeUrl}`
            const lines = [
              `🐾 ${name}`,
              address ? address : '',
              venue.googleMapsUrl ? venue.googleMapsUrl : '',
              '',
              foundLine,
            ].filter(l => l !== undefined)
            await shareToLine(lines.join('\n'))
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" style={{display:'inline',verticalAlign:'middle',marginRight:6}}><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          {lang === 'th' ? 'แชร์ใน Line' : 'Share via Line'}
        </button>
      </div>
    </div>
  )
}

function PhotoStrip({ photos = [], label = 'Photos', verifiedUrl = null }) {
  const all = Array.isArray(photos) ? [...new Set(photos.filter(Boolean))] : []
  const [open, setOpen] = useState(-1)
  const [broken, setBroken] = useState(() => new Set())
  const list = all.filter((u) => !broken.has(u))
  const markBroken = (u) => setBroken((b) => (b.has(u) ? b : new Set(b).add(u)))
  useEffect(() => {
    if (open < 0) return
    if (open >= list.length) { setOpen(list.length ? list.length - 1 : -1); return }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); setOpen(-1) }
      else if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + list.length) % list.length)
      else if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % list.length)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, list.length])
  if (!list.length) return null
  const close = () => setOpen(-1)
  const prev = (e) => { e.stopPropagation(); setOpen((i) => (i - 1 + list.length) % list.length) }
  const next = (e) => { e.stopPropagation(); setOpen((i) => (i + 1) % list.length) }
  return (
    <div className="ph-strip-wrap">
      <div className="ph-strip">
        {list.map((u, i) => (
          <StripThumb
            key={u}
            src={u}
            alt={`${label} ${i + 1}`}
            verified={u === verifiedUrl}
            onOpen={() => setOpen(i)}
            onBroken={() => markBroken(u)}
          />
        ))}
      </div>
      {open >= 0 && (
        <div className="ph-lightbox" onClick={close} role="dialog" aria-modal="true">
          <button className="ph-lb-close" onClick={close} aria-label="Close">×</button>
          {list.length > 1 && (
            <button className="ph-lb-nav ph-lb-prev" onClick={prev} aria-label="Previous">‹</button>
          )}
          <img
            className="ph-lb-img"
            src={list[open]}
            alt={`${label} ${open + 1}`}
            onClick={(e) => e.stopPropagation()}
            onError={() => markBroken(list[open])}
          />
          {list.length > 1 && (
            <button className="ph-lb-nav ph-lb-next" onClick={next} aria-label="Next">›</button>
          )}
          {list.length > 1 && <div className="ph-lb-count mono">{open + 1} / {list.length}</div>}
        </div>
      )}
    </div>
  )
}

// A plain onError only catches a clean HTTP error; a URL that isn't actually
// an image (e.g. a social-media post link pasted into the photos field by
// mistake) can just hang forever instead, so a timeout backstops it and
// reports itself broken to the parent either way.
function StripThumb({ src, alt, verified, onOpen, onBroken }) {
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    setStatus('loading')
    const t = setTimeout(() => setStatus((s) => (s === 'loaded' ? s : 'failed')), 6000)
    return () => clearTimeout(t)
  }, [src])
  useEffect(() => {
    if (status === 'failed') onBroken()
  }, [status, onBroken])
  if (status === 'failed') return null
  return (
    <button type="button" className="ph-strip-item" onClick={onOpen}>
      <img src={src} alt={alt} loading="lazy" onLoad={() => setStatus('loaded')} onError={() => setStatus('failed')} />
      {verified && <span className="ph-strip-verified" title="Pumba's verified visit">🐾</span>}
    </button>
  )
}
