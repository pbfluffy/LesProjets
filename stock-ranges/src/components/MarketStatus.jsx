import { useMemo } from 'react'
import { useLang } from '../LangContext.jsx'
import { getMarketStatus } from '../marketHours.js'
import styles from './MarketStatus.module.css'

// Formats a Date in the viewer's own local time (not ET — most of this
// app's audience isn't going to want to mentally convert from Eastern),
// omitting the weekday when it's today so "opens at 9:30 PM" reads clean
// instead of "opens Mon 9:30 PM" when today already is Monday.
function formatLocal(date, now, lang) {
  const locale = lang === 'th' ? 'th-TH' : 'en-US'
  const sameDay = date.toDateString() === now.toDateString()
  return date.toLocaleString(locale, {
    weekday: sameDay ? undefined : 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Recomputed on the same 30s tick App.jsx already runs for "updated Xm
// ago" — cheap (no network, just date arithmetic), so no extra timer
// needed. `now` is a timestamp (ms) so the memo only redoes the work once
// a minute actually changes, not on every unrelated re-render.
export default function MarketStatus({ now }) {
  const { s, lang } = useLang()
  const status = useMemo(() => getMarketStatus(new Date(now)), [Math.floor(now / 60000)]) // eslint-disable-line react-hooks/exhaustive-deps

  const label = status.open
    ? `${s.marketOpenLabel} · ${s.marketClosesAt} ${formatLocal(status.closesAt, new Date(now), lang)}`
    : `${s.marketClosedLabel} · ${s.marketOpensAt} ${formatLocal(status.nextOpen, new Date(now), lang)}`

  return (
    <div className={styles.status} data-open={status.open}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </div>
  )
}
