import { useMemo, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import { useLocalStorage } from './hooks/useLocalStorage'
import { privileges, CATEGORIES, TIERS } from './data/privileges.js'
import styles from './App.module.css'

const STRINGS = {
  th: {
    title: 'สิทธิพิเศษเดือนเกิด',
    subtitle: 'เช็กลิสต์สิทธิพิเศษวันเกิด/เดือนเกิดของแบรนด์ในไทย เรียงจากของฟรีจริงไปหาของที่มีเงื่อนไขเพิ่ม',
    disclaimer:
      'รายการนี้คัดเฉพาะแบรนด์ที่มีหน้าเว็บ/ช่องทางทางการระบุเงื่อนไขชัดเจน ตรวจสอบทีละแบรนด์ด้วยมือ (ไม่ใช่ดึงข้อมูลอัตโนมัติ) — จึงเป็นลิสต์สั้นและปรับปรุงเป็นระยะ ไม่ใช่ฐานข้อมูลที่ครบทุกแบรนด์ในตลาด ก่อนไปใช้สิทธิ์ควรกดลิงก์แหล่งที่มาเพื่อเช็กเงื่อนไขปัจจุบันอีกครั้ง เพราะเงื่อนไขของแต่ละแบรนด์เปลี่ยนได้ตลอดเวลา',
    searchPlaceholder: 'ค้นหาแบรนด์…',
    all: 'ทั้งหมด',
    category: { cafe: 'คาเฟ่', restaurant: 'ร้านอาหาร', buffet: 'บุฟเฟ่ต์', fastfood: 'ฟาสต์ฟู้ด' },
    noResults: 'ไม่พบแบรนด์ที่ตรงกับการค้นหา',
    gateLabel: 'เงื่อนไขสมาชิก',
    claimLabel: 'วิธีรับสิทธิ์',
    sourceLabel: 'แหล่งที่มา',
    verifiedLabel: 'ตรวจสอบล่าสุด',
    confidenceOfficial: 'ยืนยันจากหน้าทางการ',
    confidenceSocial: 'ยืนยันจากโซเชียลทางการ',
    checkedHint: 'ติ๊กถูกเมื่อไปใช้สิทธิ์แล้ว — บันทึกไว้ในเครื่องนี้เท่านั้น',
  },
  en: {
    title: 'Birthday Month Privileges',
    subtitle: "Checklist of Thai brands' birthday-month perks, sorted from actually-free down to more conditions",
    disclaimer:
      "This list only includes brands with an official page or channel stating clear terms, checked by hand one brand at a time — not scraped automatically. That makes it short and periodically refreshed, not a comprehensive market database. Click through to the source link to confirm current terms before you go, since brands change these often.",
    searchPlaceholder: 'Search brand…',
    all: 'All',
    category: { cafe: 'Cafe', restaurant: 'Restaurant', buffet: 'Buffet', fastfood: 'Fast Food' },
    noResults: 'No brands match that search.',
    gateLabel: 'Membership requirement',
    claimLabel: 'How to claim',
    sourceLabel: 'Source',
    verifiedLabel: 'Last verified',
    confidenceOfficial: 'Confirmed from official page',
    confidenceSocial: 'Confirmed via official social account',
    checkedHint: 'Check off once you\'ve claimed it — saved on this device only',
  },
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useLocalStorage('birthday_privileges_checked', [])
  const [expanded, setExpanded] = useState(() => new Set())
  const t = STRINGS[lang] || STRINGS.th

  const checkedSet = useMemo(() => new Set(checked), [checked])

  function toggleChecked(id) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = privileges
      .filter((p) => category === 'all' || p.category === category)
      .filter((p) => !q || p.brand.toLowerCase().includes(q))
    return TIERS.map((tier) => ({
      tier,
      items: filtered.filter((p) => p.tier === tier.key),
    })).filter((g) => g.items.length > 0)
  }, [category, search])

  const totalCount = grouped.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
        <div className={styles.controls}>
          <button className={styles.ctrlBtn} onClick={() => setLang(lang === 'th' ? 'en' : 'th')}>
            {lang === 'th' ? 'EN' : 'TH'}
          </button>
          <button className={styles.ctrlBtn} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.disclaimer}>{t.disclaimer}</p>

        <div className={styles.filterRow}>
          <div className={styles.chips}>
            <button
              className={`${styles.chip} ${category === 'all' ? styles.chipActive : ''}`}
              onClick={() => setCategory('all')}
            >
              {t.all}
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`${styles.chip} ${category === c ? styles.chipActive : ''}`}
                onClick={() => setCategory(c)}
              >
                {t.category[c] || c}
              </button>
            ))}
          </div>
        </div>

        <input
          className={styles.searchInput}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
        />

        <p className={styles.checkedHint}>{t.checkedHint}</p>

        {totalCount === 0 ? (
          <p className={styles.muted}>{t.noResults}</p>
        ) : (
          grouped.map(({ tier, items }) => (
            <section key={tier.key} className={styles.tierSection}>
              <h2 className={`${styles.tierHeading} ${styles['tier' + tier.color]}`}>
                {tier.label[lang] || tier.label.en}
              </h2>
              <ul className={styles.checklist}>
                {items.map((p) => {
                  const isChecked = checkedSet.has(p.id)
                  const isOpen = expanded.has(p.id)
                  return (
                    <li key={p.id} className={`${styles.row} ${isChecked ? styles.rowChecked : ''}`}>
                      <div className={styles.rowMain}>
                        <button
                          type="button"
                          className={styles.checkbox}
                          role="checkbox"
                          aria-checked={isChecked}
                          onClick={() => toggleChecked(p.id)}
                        >
                          {isChecked ? '✓' : ''}
                        </button>
                        <button type="button" className={styles.rowText} onClick={() => toggleExpanded(p.id)}>
                          <span className={styles.brand}>{p.brand}</span>
                          <span className={styles.itemSummary}>{p.item[lang] || p.item.en}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.expandBtn}
                          aria-label={isOpen ? 'collapse' : 'expand'}
                          onClick={() => toggleExpanded(p.id)}
                        >
                          {isOpen ? '▲' : '▼'}
                        </button>
                      </div>
                      {isOpen && (
                        <div className={styles.detail}>
                          <div className={styles.detailRow}>
                            <span className={styles.rowLabel}>{t.gateLabel}</span>
                            <span>{p.gate[lang] || p.gate.en}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.rowLabel}>{t.claimLabel}</span>
                            <span>{p.howToClaim[lang] || p.howToClaim.en}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.rowLabel}>{tier.key}</span>
                            <span>{p.tierReason[lang] || p.tierReason.en}</span>
                          </div>
                          <div className={styles.detailFooter}>
                            <span className={`${styles.confidenceTag} ${p.confidence === 'official' ? styles.confOfficial : styles.confSocial}`}>
                              {p.confidence === 'official' ? t.confidenceOfficial : t.confidenceSocial}
                            </span>
                            <a className={styles.sourceLink} href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                              {t.sourceLabel}: {p.sourceLabel} ↗
                            </a>
                            <span className={styles.verified}>{t.verifiedLabel}: {p.lastVerified}</span>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
