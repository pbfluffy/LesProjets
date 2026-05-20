import { useState } from 'react'
import { STRINGS } from '../i18n/strings'
import './MapFilterBar.css'

const TYPES = ['cafe', 'restaurant', 'hotel', 'pet_hotel', 'park', 'mall', 'beach', 'vet', 'pet_shop', 'grooming']
const POLICIES = ['no_stroller_needed', 'indoor_allowed', 'no_size_limit', 'pet_menu', 'off_leash_zone', 'no_fee']
const PUMBA_IMG = `${import.meta.env.BASE_URL}pumba.png`

export default function MapFilterBar({ lang, filters, setRegion, toggleType, togglePolicy, clearFilters }) {
  const s = STRINGS[lang]
  const [panelOpen, setPanelOpen] = useState(false)
  const activeCount =
    (filters.region !== 'all' ? 1 : 0) +
    filters.types.length +
    filters.policies.length
  const pumbaActive = filters.policies.includes('pumba_verified')

  return (
    <div className="ph-mapfilter">
      <div className="ph-mapfilter-row">
        <button
          type="button"
          className={`ph-mapfilter-btn mono ${panelOpen ? 'is-open' : ''}`}
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
        >
          {lang === 'th' ? 'ตัวกรอง' : 'Filters'}
          {activeCount > 0 && <span className="ph-mapfilter-count">{activeCount}</span>}
        </button>
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

      {panelOpen && (
        <div className="ph-mapfilter-panel">
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
          {activeCount > 0 && clearFilters && (
            <button type="button" className="ph-clear mono" onClick={clearFilters}>
              {lang === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
