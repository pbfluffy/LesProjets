export default function Header({ theme, onToggleTheme }) {
  return (
    <div className="header">
      <div className="header-inner">
        <div className="mark">฿</div>
        <div className="brand">
          <h1>ProteinVault</h1>
          <div className="sub">bangkok · shop directory</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </div>
  )
}
