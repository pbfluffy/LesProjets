import { useCallback, useEffect, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import styles from './App.module.css'

const WORKER_URL = import.meta.env.VITE_ARL_STATUS_WORKER_URL || 'http://localhost:8787/'

const STRINGS = {
  en: {
    title: 'Airport Rail Link Status',
    subtitle: 'Bangkok · Suvarnabhumi Airport Rail Link',
    disclaimer:
      "Best-effort estimate from recent news coverage — there's no official real-time API for ARL. Always confirm with the sources below before a time-sensitive trip.",
    checking: 'Checking…',
    checkNow: 'Check now',
    lastChecked: 'Last checked',
    headlinesTitle: 'Status timeline',
    noHeadlines: 'No recent Airport Rail Link news found.',
    eventLabel: { disruption: 'Disruption', resume: 'Resolved', neutral: 'Mention' },
    officialSources: 'Official sources',
    facebook: 'Facebook page',
    callCentre: 'Call centre',
    fetchError: "Couldn't reach the status check — try again in a moment.",
    badge: {
      normal: 'No recent disruption reports',
      disrupted: 'Possible disruption reported',
      unknown: "Unknown — couldn't reach the news feed",
    },
  },
  th: {
    title: 'สถานะแอร์พอร์ต เรล ลิงก์',
    subtitle: 'กรุงเทพฯ · รถไฟฟ้าแอร์พอร์ต เรล ลิงก์ สนามบินสุวรรณภูมิ',
    disclaimer:
      'ประมาณการจากข่าวล่าสุดเท่านั้น — ไม่มี API สถานะแบบเรียลไทม์อย่างเป็นทางการสำหรับ ARL กรุณายืนยันกับแหล่งข้อมูลด้านล่างก่อนเดินทางในเวลาที่สำคัญ',
    checking: 'กำลังตรวจสอบ…',
    checkNow: 'ตรวจสอบตอนนี้',
    lastChecked: 'ตรวจสอบล่าสุด',
    headlinesTitle: 'ไทม์ไลน์สถานะ',
    noHeadlines: 'ไม่พบข่าวเกี่ยวกับแอร์พอร์ต เรล ลิงก์ ในช่วงนี้',
    eventLabel: { disruption: 'ขัดข้อง', resume: 'แก้ไขแล้ว', neutral: 'กล่าวถึง' },
    officialSources: 'แหล่งข้อมูลทางการ',
    facebook: 'เพจ Facebook',
    callCentre: 'ศูนย์บริการโทรศัพท์',
    fetchError: 'ไม่สามารถตรวจสอบสถานะได้ — ลองใหม่อีกครั้ง',
    badge: {
      normal: 'ไม่พบรายงานปัญหาการเดินรถล่าสุด',
      disrupted: 'อาจมีรายงานปัญหาการเดินรถ',
      unknown: 'ไม่ทราบสถานะ — ไม่สามารถเข้าถึงฟีดข่าวได้',
    },
  },
}

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Date *and* time-of-day, not just the day — the relative "1d ago" alone
// doesn't say whether something happened at 2am or 10pm, which matters for
// a service-status timeline.
function formatDateTime(iso, lang) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const t = STRINGS[lang] || STRINGS.en

  const check = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(WORKER_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('[arl-status] check failed:', e)
      setError(t.fetchError)
    } finally {
      setLoading(false)
    }
  }, [t.fetchError])

  useEffect(() => {
    check()
  }, [check])

  const status = data?.status || 'unknown'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
        <div className={styles.controls}>
          <button className={styles.ctrlBtn} onClick={() => setLang(lang === 'en' ? 'th' : 'en')}>
            {lang === 'en' ? 'ไทย' : 'EN'}
          </button>
          <button className={styles.ctrlBtn} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={`${styles.badge} ${styles[status]}`}>
          <span className={styles.badgeDot} />
          {loading ? t.checking : t.badge[status] || t.badge.unknown}
        </div>

        <div className={styles.metaRow}>
          <span>
            {data?.checkedAt
              ? `${t.lastChecked}: ${formatDateTime(data.checkedAt, lang)} (${timeAgo(data.checkedAt)})`
              : ''}
          </span>
          <button className={styles.refreshBtn} onClick={check} disabled={loading}>
            {loading ? '…' : t.checkNow}
          </button>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <p className={styles.disclaimer}>{t.disclaimer}</p>

        <section className={styles.headlines}>
          <h2 className={styles.sectionTitle}>{t.headlinesTitle}</h2>
          {data?.headlines?.length ? (
            <ul className={styles.timeline}>
              {data.headlines.map((h) => (
                <li key={h.link} className={`${styles.timelineItem} ${styles[h.eventType] || ''}`}>
                  <span className={styles.timelineDot} />
                  {t.eventLabel[h.eventType] && (
                    <span className={styles.timelineTag}>{t.eventLabel[h.eventType]}</span>
                  )}
                  <a href={h.link} target="_blank" rel="noopener noreferrer" className={styles.headlineLink}>
                    {h.title}
                  </a>
                  <div className={styles.headlineMeta}>
                    {h.source} · {formatDateTime(h.pubDate, lang)} · {timeAgo(h.pubDate)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !loading && <p className={styles.muted}>{t.noHeadlines}</p>
          )}
        </section>

        <footer className={styles.footer}>
          <h2 className={styles.sectionTitle}>{t.officialSources}</h2>
          <a className={styles.footerLink} href="https://www.facebook.com/AirportRailLink/" target="_blank" rel="noopener noreferrer">
            {t.facebook} ↗
          </a>
          <div className={styles.footerLink}>{t.callCentre}: 02-091-1595</div>
        </footer>
      </main>
    </div>
  )
}
