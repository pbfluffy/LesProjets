import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './PriceAlertToggle.module.css'

// Per-holding cost alerts on wallet cards: notify when the price falls below
// the user's average cost, or rises 20%+ above it. Sent by the scheduled job
// (worker/scripts/portfolio-checks.mjs) on the transition only. Same pill
// look as the watchlist's Buy / Sell zone bells (PriceAlertToggle).
export default function CostAlertToggle({ config, onToggle }) {
  const { s } = useLang()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  async function handleClick(kind) {
    setError('')
    setBusy(kind)
    const ok = await onToggle(kind, !config?.[kind])
    setBusy(null)
    if (!ok) {
      setError(typeof Notification !== 'undefined' && Notification.permission === 'denied' ? s.alertPermissionError : s.alertError)
    }
  }

  return (
    <span className={styles.wrap}>
      {[['below', 'sell', s.costAlertBelowShort, s.costAlertBelowLabel], ['gain', 'buy', s.costAlertGainShort, s.costAlertGainLabel]].map(([kind, zone, short, label]) => (
        <button
          key={kind}
          type="button"
          className={styles.toggle}
          data-zone={zone}
          data-active={!!config?.[kind]}
          disabled={busy !== null}
          onClick={() => handleClick(kind)}
          aria-pressed={!!config?.[kind]}
          aria-label={label}
          title={label}
        >
          <Icon name="bell" size={12} strokeWidth={2.25} />
          <span className={styles.label}>{short}</span>
        </button>
      ))}
      {error && <span className={styles.error}>{error}</span>}
    </span>
  )
}
