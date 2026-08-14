import { useLang } from '../LangContext.jsx'
import { formatPrice, maskPrice } from '../format.js'
import styles from './DividendCalendar.module.css'

function monthKey(unixSeconds) {
  const d = new Date(unixSeconds * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Chronological view of dividend payments across the whole portfolio —
// past events are Yahoo's actual paid-dividend history, upcoming ones are
// estimated from each holding's typical cadence (see estimateNextDividend
// in wallet.js). Anything not yet paid is a guess, never a scheduled date,
// so it's tagged as estimated rather than presented as fact.
export default function DividendCalendar({ entries, currency, masked }) {
  const { s, lang } = useLang()
  if (entries.length === 0) return null

  const locale = lang === 'th' ? 'th-TH' : 'en-US'
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
                <li key={`${e.symbol}-${e.date}-${i}`} className={styles.row}>
                  <span className={styles.date}>
                    {new Date(e.date * 1000).toLocaleDateString(locale, { day: 'numeric' })}
                  </span>
                  <span className={styles.symbol}>{e.symbol}</span>
                  {e.kind === 'estimated' && <span className={styles.estimatedTag}>{s.dividendEstimatedTag}</span>}
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
