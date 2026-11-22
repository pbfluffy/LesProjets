import { useEffect, useRef, useState } from 'react'
import { fetchGoldNews } from '../stockApi.js'
import { useLang } from '../LangContext.jsx'
import styles from './GoldNews.module.css'

const MOVE_KEYS = [['day', 'goldNewsDay'], ['week', 'goldNewsWeek'], ['month', 'goldNewsMonth']]

function timeAgo(ts, now, s) {
  const h = Math.max(0, Math.round((now - ts) / 3600e3))
  if (h < 1) return s.goldNewsJustNow
  if (h < 24) return s.goldNewsHoursAgo.replace('{n}', h)
  return s.goldNewsDaysAgo.replace('{n}', Math.round(h / 24))
}

// "Why gold moved": the recent gold move plus a short summary of the news
// headlines behind it (Worker /gold-news, see worker/src/goldNews.js), with
// the headlines as sources. Hidden entirely if the route fails or isn't
// deployed yet — the price cards don't depend on it.
export default function GoldNews({ refreshKey }) {
  const { s, lang } = useLang()
  const [data, setData] = useState(null)
  const prevRefreshKey = useRef(refreshKey)

  useEffect(() => {
    let cancelled = false
    const bypassCache = prevRefreshKey.current !== refreshKey
    prevRefreshKey.current = refreshKey
    fetchGoldNews({ bypassCache }).then((d) => { if (!cancelled) setData(d) })
    return () => { cancelled = true }
  }, [refreshKey])

  if (!data) return null
  const now = Date.now()
  const summary = data.summary?.[lang] || data.summary?.en

  return (
    <section className={styles.card} aria-labelledby="gold-news-title">
      <h2 id="gold-news-title" className={styles.title}>{s.goldNewsTitle}</h2>

      <div className={styles.moves}>
        {MOVE_KEYS.map(([k, label]) => {
          const v = data.moves?.[k]
          if (v == null) return null
          const dir = v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat'
          return (
            <span key={k} className={styles.move} data-direction={dir}>
              {s[label]} {v > 0 ? '+' : ''}{v.toFixed(2)}%
            </span>
          )
        })}
      </div>

      <p className={styles.summary}>
        {summary || (data.headlines.length ? s.goldNewsNoSummary : s.goldNewsNoNews)}
      </p>

      {/* Each factor from the news and how it pushes the price (▲ up / ▼ down).
          `drivers` is absent from responses cached before it existed. */}
      {Array.isArray(data.drivers) && data.drivers.length > 0 && (
        <div className={styles.drivers}>
          <h3 className={styles.driversTitle}>{s.goldNewsDriversTitle}</h3>
          <ul>
            {data.drivers.map((d, i) => {
              const text = d[lang] || d.en
              return (
                <li key={i} className={styles.driver}>
                  <span className={styles.effect} data-direction={d.effect} aria-label={d.effect === 'up' ? s.goldNewsPushesUp : s.goldNewsPushesDown} title={d.effect === 'up' ? s.goldNewsPushesUp : s.goldNewsPushesDown}>
                    {d.effect === 'up' ? '▲' : '▼'}
                  </span>
                  <div>
                    <div className={styles.factor}>{text.factor}</div>
                    <div className={styles.why}>{text.why}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {data.headlines.length > 0 && (
        <details className={styles.sources}>
          <summary>{s.goldNewsSources.replace('{n}', data.headlines.length)}</summary>
          <ul>
            {data.headlines.map((h) => (
              <li key={h.title}>
                {h.link
                  ? <a href={h.link} target="_blank" rel="noopener noreferrer">{h.title}</a>
                  : <span>{h.title}</span>}
                <span className={styles.meta}>{h.publisher} · {timeAgo(h.ts, now, s)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className={styles.footnote}>
        {s.goldNewsFootnote}{data.updatedAt ? ` · ${s.goldNewsUpdated} ${timeAgo(data.updatedAt, now, s)}` : ''}
      </div>
    </section>
  )
}
