import { STRINGS } from '../i18n/strings'
import './FilterBar.css'

const TYPES = ['cafe', 'restaurant', 'hotel', 'park', 'mall', 'beach', 'vet', 'pet_shop', 'grooming']
const POLICIES = ['no_stroller_needed', 'indoor_allowed', 'no_size_limit', 'pet_menu', 'off_leash_zone', 'no_fee']
const PUMBA_IMG = `${import.meta.env.BASE_URL}pumba.png`

export default function FilterBar({ lang, filters, setRegion, toggleType, togglePolicy, clearFilters, collapsed }) {
  const s = STRINGS[lang]
  const activeCount =
    (filters.region !== 'all' ? 1 : 0) +
    filters.types.length +
    filters.policies.length
  const pumbaActive = filters.policies.includes('pumba_verified')

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
        {activeCount > 0 && clearFilters && (
          <button
            type="button"
            className="ph-clear mono"
            onClick={clearFilters}
            aria-label={lang === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}
          >
            {lang === 'th' ? 'ล้าง' : 'Clear'}
          </button>
        )}
      </div>

      {!collapsed && (<>
      {/* Venue type chips */}
      <div className="hscroll hscroll-wrap">
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
      <div className="hscroll hscroll-wrap">
        <button
          type="button"
          className={`pill ph-chip ph-chip-pumba ${pumbaActive ? 'is-active' : ''}`}
          onClick={() => togglePolicy('pumba_verified')}
        >
          <img src={PUMBA_IMG} alt="" />
          {lang === 'th' ? 'พุมบ้าเคยมา' : 'Pumba was here'}
        </button>
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
      </>)}
    </div>
  )
}
