import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './PriceAlertToggle.module.css'

// Per-ticker push-notification toggles — buy-zone entry, sell-zone entry,
// and a "% move" alert that cycles Off → 3% → 5% → 10% → Off. Only rendered
// when signed in, since the Worker's /alerts route is auth-gated to a
// Firebase identity. Clicking any of them for the first time on any ticker
// is what triggers the Notification-permission request + push subscription
// (via onToggle, wired in App.jsx) — there's nothing to set up ahead of time.
const MOVE_STEPS = [0, 3, 5, 10]
function nextMoveStep(current) {
  const i = MOVE_STEPS.indexOf(current || 0)
  return MOVE_STEPS[(i + 1) % MOVE_STEPS.length] // an unknown stored value falls back to off → 3
}

export default function PriceAlertToggle({ config, onToggle }) {
  const { s } = useLang()
  // Which button's request is in flight, or null. All buttons disable
  // whenever ANY is busy (not just the one clicked) — onToggle resends
  // the *other* settings' current values alongside whichever one changed
  // (they share one KV entry), so a second click landing before the first
  // resolves would race against a stale snapshot of those values and
  // could silently revert them.
  const [busy, setBusy] = useState(null) // 'buy' | 'sell' | 'move' | null
  const [error, setError] = useState('')
  const move = config?.move || 0

  async function handleClick(direction) {
    setError('')
    setBusy(direction)
    const next = direction === 'move' ? nextMoveStep(move) : !config?.[direction]
    const ok = await onToggle(direction, next)
    setBusy(null)
    if (!ok) {
      setError(typeof Notification !== 'undefined' && Notification.permission === 'denied'
        ? s.alertPermissionError
        : s.alertError)
    }
  }

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.toggle}
        data-zone="buy"
        data-active={!!config?.buy}
        disabled={busy !== null}
        onClick={() => handleClick('buy')}
        aria-pressed={!!config?.buy}
        aria-label={s.alertBuyLabel}
        title={s.alertBuyLabel}
      >
        <Icon name="bell" size={12} strokeWidth={2.25} />
        <span className={styles.label}>{s.alertBuyShort}</span>
      </button>
      <button
        type="button"
        className={styles.toggle}
        data-zone="sell"
        data-active={!!config?.sell}
        disabled={busy !== null}
        onClick={() => handleClick('sell')}
        aria-pressed={!!config?.sell}
        aria-label={s.alertSellLabel}
        title={s.alertSellLabel}
      >
        <Icon name="bell" size={12} strokeWidth={2.25} />
        <span className={styles.label}>{s.alertSellShort}</span>
      </button>
      <button
        type="button"
        className={styles.toggle}
        data-zone="move"
        data-active={move > 0}
        disabled={busy !== null}
        onClick={() => handleClick('move')}
        aria-pressed={move > 0}
        aria-label={move > 0 ? s.alertMoveOn.replace('{pct}', move) : s.alertMoveLabel}
        title={move > 0 ? s.alertMoveOn.replace('{pct}', move) : s.alertMoveLabel}
      >
        <Icon name="bell" size={12} strokeWidth={2.25} />
        <span className={styles.label}>{move > 0 ? `±${move}%` : s.alertMoveShort}</span>
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </span>
  )
}
