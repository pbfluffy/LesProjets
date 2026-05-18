import { computeTier } from '../data/computeTier'
import './PawTierBadge.css'

export default function PawTierBadge({ venue, lang = 'en', size = 'sm' }) {
  const { paws, en, th, heart } = computeTier(venue)
  const label = lang === 'th' ? th : en
  const className = `ph-tier ph-tier-${paws} ph-tier-${size}`
  return (
    <span className={className} title={label}>
      <span className="ph-tier-paws" aria-hidden="true">
        {'🐾'.repeat(paws)}
      </span>
      {heart && (
        <span className="ph-tier-heart" aria-hidden="true">
          ♥
        </span>
      )}
      <span className="ph-tier-label">{label}</span>
    </span>
  )
}
