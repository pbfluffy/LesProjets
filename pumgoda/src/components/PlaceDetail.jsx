import { useEffect, useState } from 'react'
import PawTierBadge from './PawTierBadge'
import PumbaBadge from './PumbaBadge'
import { STRINGS, interp } from '../i18n/strings'
import { useTrips } from '../hooks/useTrips'
import VoteButtons from './VoteButtons'
import './PlaceDetail.css'

export default function PlaceDetail({ venue, lang, onClose, onToggleSave, isSaved }) {
  const s = STRINGS[lang]
  const name = venue.name?.[lang] || venue.name?.en || venue.id
  const address = venue.address?.[lang] || venue.address?.en
  const notes = venue.notes?.[lang] || venue.notes?.en

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
            {s.types[venue.type] || venue.type}
            {venue.neighborhood ? ` · ${venue.neighborhood}` : ''}
            {venue.province ? ` · ${venue.province}` : ''}
            {venue.priceTier ? ` · ${venue.priceTier}` : ''}
          </div>
          <div className="ph-detail-badges">
            <PawTierBadge venue={venue} lang={lang} size="lg" />
            <PumbaBadge venue={venue} lang={lang} />
          </div>
        </div>

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

        {/* Pumba verification — only shown if verified, with date + optional photo */}
        {venue.pumba?.verified && (
          <section className="ph-section">
            <h3 className="ph-section-title">{s.detail.sections.verification}</h3>
            <div className="ph-verify-row">
              {venue.pumba.photoUrl && (
                <img
                  className="ph-pumba-photo"
                  src={venue.pumba.photoUrl}
                  alt="Pumba at venue"
                  loading="lazy"
                />
              )}
              {venue.pumba.visitDate && (
                <p className="ph-verify-date mono">
                  {interp(s.card.lastVerified, { date: venue.pumba.visitDate })}
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

        {/* Hours */}
        {venue.hours && (
          <section className="ph-section">
            <h3 className="ph-section-title">{s.detail.sections.hours}</h3>
            <p className="ph-hours mono">{venue.hours}</p>
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
      </div>
    </div>
  )
}
