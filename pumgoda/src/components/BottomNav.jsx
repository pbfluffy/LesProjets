import { STRINGS } from '../i18n/strings'
import './BottomNav.css'

const TABS = [
  { key: 'list', icon: '📋' },
  { key: 'map', icon: '🗺️' },
  { key: 'trips', icon: '🧳' },
  { key: 'saved', icon: '♥' },
]

export default function BottomNav({ active, onChange, lang }) {
  const s = STRINGS[lang]
  return (
    <nav className="ph-nav" aria-label="Primary">
      <div className="ph-nav-inner">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`ph-nav-btn ${active === t.key ? 'is-active' : ''}`}
            onClick={() => onChange(t.key)}
          >
            <span className="ph-nav-icon" aria-hidden="true">{t.icon}</span>
            <span className="ph-nav-label mono">{s.tabs[t.key]}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
