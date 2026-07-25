import { useState } from 'react'
import PawTierBadge from './PawTierBadge'
import PumbaBadge from './PumbaBadge'
import PolicyChips from './PolicyChips'
import { STRINGS } from '../i18n/strings'
import { isOpenNow } from '../data/hours'
import { useVotesCtx } from '../hooks/VotesContext'
import './PlaceCard.css'

const VOTE_SIGNALS = [
  { key: 'up', emoji: '👍' },
  { key: 'paw', emoji: '🐾' },
  { key: 'warn', emoji: '⚠️' },
]

function formatDistance(km, lang) {
  if (!Number.isFinite(km)) return null
  if (km < 1) {
    const m = Math.round(km * 1000)
    return lang === 'th' ? `${m} ม.` : `${m} m`
  }
  return lang === 'th' ? `${km.toFixed(1)} กม.` : `${km.toFixed(1)} km`
}

export default function PlaceCard({ venue, lang = 'en', onOpen, distanceKm = null }) {
  const s = STRINGS[lang]
  const { tallies } = useVotesCtx()
  const name = venue.name?.[lang] || venue.name?.en || venue.name?.th || venue.id
  const typeLabel = s.types[venue.type?.toLowerCase().replace(/[\s-]+/g, '_')] || venue.type
  const thumb = (Array.isArray(venue.photos) ? venue.photos.find(Boolean) : null) || venue.pumba?.photoUrl || null
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = Boolean(thumb) && !imgFailed
  const distanceLabel = formatDistance(distanceKm, lang)
  const open = isOpenNow(venue)

  return (
    <button
      className="ph-card surface surface-hover"
      onClick={() => onOpen?.(venue)}
      aria-label={name}
    >
      {open === true && <span className="ph-open-badge ph-open-badge-corner">{s.hours.openNow}</span>}
      <div className="ph-card-thumb">
        {showImg ? (
          <img src={thumb} alt="" loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <div className="ph-card-thumb-empty" aria-hidden="true">🐾</div>
        )}
      </div>

      <div className="ph-card-head">
        <div className="ph-card-name">{name}</div>
        <div className="ph-card-meta mono">
          {typeLabel}
          {venue.neighborhood ? ` · ${venue.neighborhood}` : ''}
          {venue.priceTier ? ` · ${venue.priceTier}` : ''}
          {distanceLabel ? ` · 📍 ${distanceLabel}` : ''}
        </div>
      </div>

      <div className="ph-card-badges">
        <PawTierBadge venue={venue} lang={lang} />
        <PumbaBadge venue={venue} lang={lang} />
      </div>

      <PolicyChips venue={venue} lang={lang} max={4} />

      {(() => {
        const counts = tallies[venue.id]
        if (!counts) return null
        const total = (counts.up || 0) + (counts.paw || 0) + (counts.warn || 0)
        if (total === 0) return null
        return (
          <div className="ph-card-votes mono" aria-label="community votes">
            {VOTE_SIGNALS.map((sig) => (
              <span key={sig.key} className="ph-card-vote">
                <span aria-hidden="true">{sig.emoji}</span>
                <span className="ph-card-vote-count">{counts[sig.key] || 0}</span>
              </span>
            ))}
          </div>
        )
      })()}
    </button>
  )
}
