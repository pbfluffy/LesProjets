import './Header.css'

export default function Header({ lang, onToggleLang, theme, onToggleTheme, brand }) {
  return (
    <header className="ph-header">
      <div className="ph-header-inner">
        <span className="ph-logo">{brand}</span>
        <div className="ph-controls">
          <button
            className="ph-ctrl mono"
            onClick={onToggleLang}
            aria-label="Toggle language"
          >
            {lang === 'th' ? 'EN' : 'TH'}
          </button>
          <button
            className="ph-ctrl"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
