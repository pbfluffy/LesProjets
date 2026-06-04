import PawTierBadge from './PawTierBadge'
import PumbaBadge from './PumbaBadge'
import PolicyChips from './PolicyChips'
import { STRINGS } from '../i18n/strings'
import { useVotesCtx } from '../hooks/VotesContext'
import './PlaceCard.css'

const VOTE_SIGNALS = [
  { key: 'up', emoji: '👍' },
  { key: 'paw', emoji: '🐾' },
  { key: 'warn', emoji: '⚠️' },
]

export default function PlaceCard({ venue, lang = 'en', onOpen }) {
  const s = STRINGS[lang]
  const { tallies } = useVotesCtx()
  const name = venue.name?.[lang] || venue.name?.en || venue.name?.th || venue.id
  const typeLabel = s.types[venue.type?.toLowerCase().replace(/[\s-]+/g, '_')] || venue.type
  const thumb = Array.isArray(venue.photos) ? venue.photos.find(Boolean) : null

  return (
    <button
      className="ph-card surface surface-hover"
      onClick={() => onOpen?.(venue)}
      aria-label={name}
    >
      {thumb && (
        <div className="ph-card-thumb">
          <img src={thumb} alt="" loading="eager" />
        </div>
      )}

      <div className="ph-card-head">
        <div className="ph-card-name">{name}</div>
        <div className="ph-card-meta mono">
          {typeLabel}
          {venue.neighborhood ? ` · ${venue.neighborhood}` : ''}
          {venue.priceTier ? ` · ${venue.priceTier}` : ''}
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
