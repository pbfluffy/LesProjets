import './Header.css'
import Avatar from './Avatar'

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
  onSuggestClick,
  suggestLabel,
  // #34 — optional account button + popover. When `accountLabels` is undefined
  // the account UI is not rendered at all, preserving prior behavior.
  user,
  popoverOpen,
  onTogglePopover,
  onSignIn,
  onSignOut,
  signingIn,
  popoverWrapRef,
  syncStatus,
  accountLabels,
}) {
  return (
    <header className="ph-header">
      <div className="ph-header-inner">
        <div className="ph-header-left">
          <a href="../" className="ph-ctrl ph-ctrl-icon" aria-label="Back to portfolio" title="Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </a>
          <span className="ph-logo">{brand}</span>
        </div>
        <div className="ph-controls">
          <button
            className="ph-ctrl"
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
          <button
            type="button"
            className="ph-ctrl ph-ctrl-icon"
            onClick={onSuggestClick}
            aria-label={suggestLabel || 'Suggest a place'}
            title={suggestLabel || 'Suggest a place'}
          >
            ＋
          </button>
          <button
            className="ph-ctrl ph-ctrl-icon"
            onClick={onShare}
            aria-label={shareLabel || 'Share'}
            title={shareLabel || 'Share'}
          >
            ↗
          </button>
          {accountLabels && (
            <>
              <span className="ph-header-divider" aria-hidden="true" />
              <div style={{ position: 'relative' }} ref={popoverWrapRef}>
              {/* Feature #66 — sync status dot (top-right of avatar button) */}
              {syncStatus && syncStatus !== 'idle' && (
                <span
                  aria-hidden="true"
                  title={'Sync: ' + syncStatus}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background:
                      syncStatus === 'syncing' ? '#f5c542' :
                      syncStatus === 'synced' ? '#2e7d32' :
                      syncStatus === 'error' ? '#d32f2f' :
                      '#888',
                    border: '2px solid var(--bg, #fff)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
              )}
              <button
                className="ph-ctrl ph-ctrl-icon"
                onClick={onTogglePopover}
                title={user ? user.email : accountLabels.signIn}
                aria-label={accountLabels.signIn}
                style={
                  user
                    ? { padding: 0, overflow: 'hidden', borderRadius: '50%', aspectRatio: '1 / 1' }
                    : undefined
                }
              >
                {user ? (
                  <Avatar
                    name={user.displayName || user.email || ''}
                    photoURL={user.photoURL}
                    size={28}
                  />
                ) : (
                  '👤'
                )}
              </button>
              {popoverOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: 12,
                    minWidth: 220,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    textAlign: 'left',
                  }}
                >
                  {user ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, wordBreak: 'break-all' }}>
                        {user.displayName || 'User'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, wordBreak: 'break-all' }}>
                        {user.email}
                      </div>
                      <button
                        onClick={onSignOut}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '0.5px solid var(--border)',
                          background: 'transparent',
                          color: 'inherit',
                          borderRadius: 6,
                          cursor: 'pointer',
                          font: 'inherit',
                        }}
                      >
                        {accountLabels.signOut}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                        {accountLabels.signIn}
                      </div>
                      <button
                        onClick={onSignIn}
                        disabled={signingIn}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'var(--accent, #ff6b35)',
                          color: 'white',
                          borderRadius: 6,
                          cursor: signingIn ? 'default' : 'pointer',
                          font: 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        {signingIn ? accountLabels.signingIn : accountLabels.continueWithGoogle}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
