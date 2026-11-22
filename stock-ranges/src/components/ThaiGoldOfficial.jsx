import { useEffect, useRef, useState } from 'react'
import { fetchThaiGoldPrice } from '../stockApi.js'
import { useLang } from '../LangContext.jsx'
import styles from './ThaiGoldOfficial.module.css'

const fmt = (v, digits = 2) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—')

function Change({ label, value }) {
  if (value == null) return null
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  return (
    <span className={styles.change} data-direction={dir}>
      {label} {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '·'} {fmt(Math.abs(value), 0)}
    </span>
  )
}

// The Gold Traders Association's (สมาคมค้าทองคำ) posted price for 96.5% gold,
// per baht-weight — what Thai gold shops actually quote — via the Worker's
// /thai-gold route (worker/src/thaiGold.js). Shown above the app's own
// spot-based estimate; hidden if the route fails.
export default function ThaiGoldOfficial({ refreshKey }) {
  const { s, lang } = useLang()
  const [data, setData] = useState(null)
  const prevRefreshKey = useRef(refreshKey)

  useEffect(() => {
    let cancelled = false
    const bypassCache = prevRefreshKey.current !== refreshKey
    prevRefreshKey.current = refreshKey
    fetchThaiGoldPrice({ bypassCache }).then((d) => { if (!cancelled) setData(d) })
    return () => { cancelled = true }
  }, [refreshKey])

  if (!data) return null
  const when = new Date(data.announcedAt * 1000).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', year: lang === 'th' ? 'numeric' : undefined, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  })

  return (
    <section className={styles.card} aria-labelledby="thai-gold-official-title">
      <h2 id="thai-gold-official-title" className={styles.title}>{s.goldOfficialTitle}</h2>
      <div className={styles.sub}>
        {s.goldOfficialSub} · {s.goldOfficialAnnounced.replace('{when}', when).replace('{round}', data.round)}
      </div>

      <div className={styles.grid}>
        <div className={styles.kind}>{s.goldOfficialBar}</div>
        <div className={styles.cell}>
          <span className={styles.label}>{s.goldOfficialBuy}</span>
          <span className={styles.price}>{fmt(data.bar.buy)}</span>
        </div>
        <div className={styles.cell}>
          <span className={styles.label}>{s.goldOfficialSell}</span>
          <span className={styles.price}>{fmt(data.bar.sell)}</span>
        </div>

        <div className={styles.kind}>{s.goldOfficialOrnament}</div>
        <div className={styles.cell}>
          <span className={styles.label}>{s.goldOfficialTaxBase}</span>
          <span className={styles.price}>{fmt(data.ornament.taxBase)}</span>
        </div>
        <div className={styles.cell}>
          <span className={styles.label}>{s.goldOfficialSell}</span>
          <span className={styles.price}>{fmt(data.ornament.sell)}</span>
        </div>
      </div>

      <div className={styles.changes}>
        <Change label={s.goldOfficialVsPrevious} value={data.changeFromPrevious} />
        <Change label={s.goldOfficialVsYesterday} value={data.changeFromYesterday} />
      </div>

      <div className={styles.footnote}>
        {s.goldOfficialFootnote}{' '}
        <a href="https://www.goldtraders.or.th/" target="_blank" rel="noopener noreferrer">goldtraders.or.th</a>
      </div>
    </section>
  )
}
