import { useLang } from '../LangContext.jsx'
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

// `status` comes from App.jsx, which computes getMarketStatus() once and
// shares it with both this display and the watchlist/wallet cards' "last
// close" labeling — one source of truth instead of every consumer
// recomputing its own. `now` is the same timestamp (ms) App.jsx already
// ticks every 30s for "updated Xm ago".
export default function MarketStatus({ status, now }) {
  const { s, lang } = useLang()
  const nowDate = new Date(now)

  const label = status.open
    ? `${s.marketOpenLabel} · ${s.marketClosesAt} ${formatLocal(status.closesAt, nowDate, lang)}`
    : `${s.marketClosedLabel} · ${s.marketOpensAt} ${formatLocal(status.nextOpen, nowDate, lang)}`

  return (
    <div className={styles.status} data-open={status.open}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </div>
  )
}
