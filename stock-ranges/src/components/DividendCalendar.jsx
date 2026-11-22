import { useLang } from '../LangContext.jsx'
import { formatPrice, maskPrice } from '../format.js'
import styles from './DividendCalendar.module.css'

function monthKey(unixSeconds) {
  const d = new Date(unixSeconds * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Chronological view of ex-dividend (XD) dates across the whole portfolio —
// Yahoo's historical-events endpoint keys dividends by ex-date, so rows are
// placed by XD. Where the Worker's /dividends route has Nasdaq data
// (Nasdaq-listed symbols only), each row also shows its payment date, and a
// dividend the company has already declared replaces the estimate. Other
// upcoming entries are estimated from each holding's typical cadence (see
// estimateNextDividend in wallet.js), so they're tagged as estimated rather
// than presented as fact, and have no pay date.
export default function DividendCalendar({ entries, currency, masked }) {
  const { s, lang } = useLang()
  if (entries.length === 0) return null

  const locale = lang === 'th' ? 'th-TH' : 'en-US'
  const now = Date.now()
  const groups = new Map()
  entries.forEach((e) => {
    const key = monthKey(e.date)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{s.dividendCalendarTitle}</div>
      {[...groups.entries()].map(([key, items]) => {
        const label = new Date(items[0].date * 1000).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
        return (
          <div key={key} className={styles.group}>
            <div className={styles.groupLabel}>{label}</div>
            <ul className={styles.list}>
              {items.map((e, i) => (
                <li key={`${e.symbol}-${e.date}-${i}`} className={styles.row} data-past={e.kind === 'past'}>
                  <span className={styles.date}>
                    {new Date(e.date * 1000).toLocaleDateString(locale, { day: 'numeric' })}
                  </span>
                  <span className={styles.symbol}>{e.symbol}</span>
                  {e.kind === 'estimated' && <span className={styles.estimatedTag}>{s.dividendEstimatedTag}</span>}
                  {e.kind === 'declared' && <span className={styles.estimatedTag} data-kind="declared">{s.dividendDeclaredTag}</span>}
                  {e.kind === 'past' && <span className={styles.estimatedTag}>{s.dividendPastTag}</span>}
                  {e.payDate && (
                    <span className={styles.payDate} data-paid={e.payDate * 1000 <= now}>
                      {(e.payDate * 1000 <= now ? s.dividendPaidOn : s.dividendPaysOn)
                        .replace('{date}', new Date(e.payDate * 1000).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }))}
                    </span>
                  )}
                  <span className={styles.amount}>{masked ? maskPrice(currency) : formatPrice(e.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
