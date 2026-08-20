import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './PriceAlertToggle.module.css'

// Two per-ticker push-notification toggles (buy-zone entry / sell-zone
// entry) — only rendered when signed in, since the Worker's /alerts route
// is auth-gated to a Firebase identity. Clicking either for the first
// time on any ticker is what triggers the Notification-permission
// request + push subscription (via onToggle, wired in App.jsx) — there's
// nothing to set up ahead of time.
export default function PriceAlertToggle({ config, onToggle }) {
  const { s } = useLang()
  const [busy, setBusy] = useState(null) // 'buy' | 'sell' | null
  const [error, setError] = useState('')

  async function handleClick(direction) {
    setError('')
    setBusy(direction)
    const next = !config?.[direction]
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
        disabled={busy === 'buy'}
        onClick={() => handleClick('buy')}
        aria-pressed={!!config?.buy}
        aria-label={s.alertBuyLabel}
        title={s.alertBuyLabel}
      >
        <Icon name="bell" size={12} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={styles.toggle}
        data-zone="sell"
        data-active={!!config?.sell}
        disabled={busy === 'sell'}
        onClick={() => handleClick('sell')}
        aria-pressed={!!config?.sell}
        aria-label={s.alertSellLabel}
        title={s.alertSellLabel}
      >
        <Icon name="bell" size={12} strokeWidth={2.25} />
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </span>
  )
}
