export default function Header({ cartCount, theme, onToggleTheme }) {
  return (
    <div className="header">
      <div className="header-inner">
        <div className="mark">฿</div>
        <div className="brand">
          <h1>ProteinVault</h1>
          <div className="sub">bangkok · updated daily</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <div className="cart-badge mono">Cart ({cartCount})</div>
        </div>
      </div>
    </div>
  )
}
