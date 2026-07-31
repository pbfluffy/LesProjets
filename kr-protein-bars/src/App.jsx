import { useMemo, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import { promos, STORES } from './data/promos.js'
import styles from './App.module.css'

const STRINGS = {
  en: {
    title: 'Protein Bar Deals',
    subtitle: 'South Korea convenience stores · CU, GS25, 7-Eleven, emart24, ministop',
    placeholderNotice:
      'All entries below are sample placeholder data — edit src/data/promos.js with real promos you find in-store.',
    searchPlaceholder: 'Search brand or product…',
    all: 'All',
    sortLabel: 'Sort',
    sortEnding: 'Ending soonest',
    sortValue: 'Best value (₩ / g protein)',
    noResults: 'No promos match that search.',
    promoLabel: { '1+1': '1+1', '2+1': '2+1', percent: (n) => `${n}% off`, none: 'No promo' },
    protein: 'protein',
    perBar: 'per bar',
    effectivePrice: 'Effective price',
    perGram: '₩/g protein',
    endsIn: (d) => (d === 0 ? 'Ends today' : d === 1 ? 'Ends tomorrow' : `Ends in ${d}d`),
    ended: 'Promo ended',
    noEndDate: 'Ongoing',
  },
  ko: {
    title: '단백질 바 할인 정보',
    subtitle: '한국 편의점 · CU, GS25, 7-Eleven, emart24, ministop',
    placeholderNotice:
      '아래 항목은 모두 예시 데이터입니다 — src/data/promos.js 파일을 실제로 발견한 할인 정보로 바꿔주세요.',
    searchPlaceholder: '브랜드 또는 상품명 검색…',
    all: '전체',
    sortLabel: '정렬',
    sortEnding: '종료 임박순',
    sortValue: '가성비순 (₩ / 단백질 g)',
    noResults: '검색 결과가 없습니다.',
    promoLabel: { '1+1': '1+1', '2+1': '2+1', percent: (n) => `${n}% 할인`, none: '할인 없음' },
    protein: '단백질',
    perBar: '1개 기준',
    effectivePrice: '실질 가격',
    perGram: '₩/단백질 g',
    endsIn: (d) => (d === 0 ? '오늘 마감' : d === 1 ? '내일 마감' : `${d}일 남음`),
    ended: '할인 종료',
    noEndDate: '상시 판매',
  },
}

function effectiveUnitPriceKrw(p) {
  if (p.promo === '1+1') return p.priceKrw / 2
  if (p.promo === '2+1') return (p.priceKrw * 2) / 3
  if (p.promo === 'percent' && p.percentOff) return p.priceKrw * (1 - p.percentOff / 100)
  return p.priceKrw
}

function daysLeft(endDate) {
  if (!endDate) return null
  const ms = new Date(endDate + 'T23:59:59') - new Date()
  return Math.ceil(ms / 86400000)
}

function formatKrw(n) {
  return `₩${Math.round(n).toLocaleString('en-US')}`
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useLang()
  const [store, setStore] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('ending')
  const t = STRINGS[lang] || STRINGS.en

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = promos
      .filter((p) => store === 'all' || p.store === store)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
      .map((p) => ({
        ...p,
        effectivePrice: effectiveUnitPriceKrw(p),
        pricePerGram: effectiveUnitPriceKrw(p) / p.proteinG,
        daysLeft: daysLeft(p.endDate),
      }))

    list = [...list].sort((a, b) => {
      const aEnded = a.daysLeft != null && a.daysLeft < 0
      const bEnded = b.daysLeft != null && b.daysLeft < 0
      if (aEnded !== bEnded) return aEnded ? 1 : -1
      if (sort === 'value') return a.pricePerGram - b.pricePerGram
      if (a.daysLeft == null) return 1
      if (b.daysLeft == null) return -1
      return a.daysLeft - b.daysLeft
    })
    return list
  }, [store, search, sort])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
        <div className={styles.controls}>
          <button className={styles.ctrlBtn} onClick={() => setLang(lang === 'en' ? 'ko' : 'en')}>
            {lang === 'en' ? '한국어' : 'EN'}
          </button>
          <button className={styles.ctrlBtn} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.disclaimer}>{t.placeholderNotice}</p>

        <div className={styles.filterRow}>
          <div className={styles.chips}>
            <button
              className={`${styles.chip} ${store === 'all' ? styles.chipActive : ''}`}
              onClick={() => setStore('all')}
            >
              {t.all}
            </button>
            {STORES.map((s) => (
              <button
                key={s}
                className={`${styles.chip} ${store === s ? styles.chipActive : ''}`}
                onClick={() => setStore(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <select className={styles.sortSelect} value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t.sortLabel}>
            <option value="ending">{t.sortEnding}</option>
            <option value="value">{t.sortValue}</option>
          </select>
        </div>

        <input
          className={styles.searchInput}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
        />

        {rows.length === 0 ? (
          <p className={styles.muted}>{t.noResults}</p>
        ) : (
          <ul className={styles.cardList}>
            {rows.map((p) => {
              const ended = p.daysLeft != null && p.daysLeft < 0
              const promoText =
                p.promo === 'percent' ? t.promoLabel.percent(p.percentOff) : t.promoLabel[p.promo] || p.promo
              return (
                <li key={p.id} className={`${styles.card} ${ended ? styles.cardEnded : ''}`}>
                  <div className={styles.cardTop}>
                    <span className={styles.storeTag}>{p.store}</span>
                    <span className={`${styles.promoTag} ${p.promo === 'none' ? styles.promoNone : ''}`}>{promoText}</span>
                  </div>
                  <div className={styles.cardName}>{p.brand} — {p.name}</div>
                  <div className={styles.cardMeta}>
                    {p.proteinG}g {t.protein} · {formatKrw(p.priceKrw)} {t.perBar}
                  </div>
                  <div className={styles.priceRow}>
                    <span>{t.effectivePrice}: <b>{formatKrw(p.effectivePrice)}</b></span>
                    <span className={styles.faint}>{p.pricePerGram.toFixed(0)} {t.perGram}</span>
                  </div>
                  <div className={styles.endRow}>
                    {ended ? t.ended : p.daysLeft == null ? t.noEndDate : t.endsIn(p.daysLeft)}
                  </div>
                  {p.notes && <div className={styles.notes}>{p.notes}</div>}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
