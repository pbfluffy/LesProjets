import PawTierBadge from './PawTierBadge'
import PumbaBadge from './PumbaBadge'
import PolicyChips from './PolicyChips'
import { STRINGS } from '../i18n/strings'
import './PlaceCard.css'

export default function PlaceCard({ venue, lang = 'en', onOpen }) {
  const s = STRINGS[lang]
  const name = venue.name?.[lang] || venue.name?.en || venue.id
  const typeLabel = s.types[venue.type] || venue.type

  return (
    <button
      className="ph-card surface surface-hover"
      onClick={() => onOpen?.(venue)}
      aria-label={name}
    >
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
    </button>
  )
}
