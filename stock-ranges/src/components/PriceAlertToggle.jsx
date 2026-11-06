import { useEffect, useRef, useState } from 'react'
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

const ERROR_VISIBLE_MS = 8000

export default function PriceAlertToggle({ config, onToggle }) {
  const { s } = useLang()
  // The request in flight — { direction, next } — or null. The tapped button
  // shows its new state straight away (and pulses) instead of looking dead
  // until the Worker answers; if the save fails it simply goes back. All the
  // buttons stay locked while one is in flight — onToggle resends the *other*
  // settings' current values alongside whichever one changed (they share one
  // KV entry), so a second tap landing before the first resolves would race
  // against a stale snapshot of those values and could silently revert them.
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const errorTimer = useRef(null)
  useEffect(() => () => clearTimeout(errorTimer.current), [])

  const move = pending?.direction === 'move' ? pending.next : (config?.move || 0)
  const isOn = (direction) => (pending?.direction === direction ? !!pending.next : !!config?.[direction])
  const locked = pending !== null

  function showError(message) {
    setError(message)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(''), ERROR_VISIBLE_MS)
  }

  async function handleClick(direction) {
    if (locked) return
    setError('')
    const next = direction === 'move' ? nextMoveStep(config?.move || 0) : !config?.[direction]
    setPending({ direction, next })
    let ok = false
    try {
      ok = await onToggle(direction, next)
    } catch {
      ok = false
    }
    setPending(null)
    if (!ok) {
      showError(typeof Notification !== 'undefined' && Notification.permission === 'denied'
        ? s.alertPermissionError
        : s.alertError)
    }
  }

  function buttonProps(direction, active, label) {
    return {
      type: 'button',
      className: styles.toggle,
      'data-zone': direction,
      'data-active': active,
      'data-pending': pending?.direction === direction,
      // aria-disabled (not `disabled`) while locked: the tapped button keeps
      // its normal look so the tap visibly registered, and the others aren't
      // greyed out as if the whole row had died.
      'aria-disabled': locked,
      'aria-busy': pending?.direction === direction,
      'aria-pressed': active,
      'aria-label': label,
      title: label,
      onClick: () => handleClick(direction),
    }
  }

  return (
    <span className={styles.wrap}>
      <button {...buttonProps('buy', isOn('buy'), s.alertBuyLabel)}>
        <Icon name="bell" size={12} strokeWidth={2.25} />
        <span className={styles.label}>{s.alertBuyShort}</span>
      </button>
      <button {...buttonProps('sell', isOn('sell'), s.alertSellLabel)}>
        <Icon name="bell" size={12} strokeWidth={2.25} />
        <span className={styles.label}>{s.alertSellShort}</span>
      </button>
      <button {...buttonProps('move', move > 0, move > 0 ? s.alertMoveOn.replace('{pct}', move) : s.alertMoveLabel)}>
        <Icon name="bell" size={12} strokeWidth={2.25} />
        <span className={styles.label}>{move > 0 ? `±${move}%` : s.alertMoveShort}</span>
      </button>
      {error && <span className={styles.error} role="alert">{error}</span>}
    </span>
  )
}
