import { STRINGS } from '../i18n/strings'
import './FilterBar.css'

const TYPES = ['cafe', 'restaurant', 'hotel', 'park', 'mall', 'beach', 'vet', 'pet_shop', 'grooming']
const POLICIES = ['indoor_allowed', 'no_size_limit', 'pet_menu', 'off_leash_zone', 'overnight', 'no_fee', 'no_stroller_needed']

export default function FilterBar({ lang, filters, setRegion, toggleType, togglePolicy }) {
  const s = STRINGS[lang]

  return (
    <div className="ph-filters">
      {/* Region segmented control */}
      <div className="ph-region">
        {['all', 'bangkok_metro', 'weekend_escape'].map((r) => (
          <button
            key={r}
            className={`ph-region-btn mono ${filters.region === r ? 'is-active' : ''}`}
            onClick={() => setRegion(r)}
          >
            {s.regions[r]}
          </button>
        ))}
      </div>

      {/* Venue type chips */}
      <div className="hscroll">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`pill ph-chip ${filters.types.includes(t) ? 'is-active' : ''}`}
            onClick={() => toggleType(t)}
          >
            {s.types[t]}
          </button>
        ))}
      </div>

      {/* Policy chips */}
      <div className="hscroll">
        {POLICIES.map((p) => (
          <button
            key={p}
            className={`pill ph-chip ${filters.policies.includes(p) ? 'is-active' : ''}`}
            onClick={() => togglePolicy(p)}
          >
            {s.policy[p]}
          </button>
        ))}
      </div>
    </div>
  )
}
