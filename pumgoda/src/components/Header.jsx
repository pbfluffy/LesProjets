import './Header.css'

export default function Header({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  brand,
  onShare,
  onRefresh,
  isRefreshing,
  shareLabel,
  refreshLabel,
  suggestUrl,
  suggestLabel,
}) {
  return (
    <header className="ph-header">
      <div className="ph-header-inner">
        <div className="ph-header-left">
          <a href="../" className="ph-ctrl ph-home mono" aria-label="Back to portfolio">
            ← Home
          </a>
          <span className="ph-logo">{brand}</span>
        </div>
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
          <button
            className={`ph-ctrl ph-ctrl-icon${isRefreshing ? ' is-spinning' : ''}`}
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={refreshLabel || 'Refresh'}
            title={refreshLabel || 'Refresh'}
          >
            ⟳
          </button>
          {suggestUrl && (
            <a
              className="ph-ctrl ph-ctrl-icon"
              href={suggestUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={suggestLabel || 'Suggest a place'}
              title={suggestLabel || 'Suggest a place'}
            >
              ＋
            </a>
          )}
          <button
            className="ph-ctrl ph-ctrl-icon"
            onClick={onShare}
            aria-label={shareLabel || 'Share'}
            title={shareLabel || 'Share'}
          >
            ↗
          </button>
        </div>
      </div>
    </header>
  )
}
