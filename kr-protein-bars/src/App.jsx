import { useMemo, useState } from 'react'
import { useTheme, useLang } from './hooks/useThemeLang'
import { promos, STORES } from './data/promos.js'
import styles from './App.module.css'

const STRINGS = {
  en: {
    title: 'Protein Bar Deals',
    subtitle: 'South Korea convenience stores · CU, GS25, 7-Eleven, emart24',
    placeholderNotice:
      'Researched July 31, 2026 — real products/prices, checked directly against each store\'s own site (dated where the store publishes one), sourced per entry (see the link on each card). Anything only findable on a third-party tracker was left out rather than kept unverified — that\'s why 7-Eleven has no entries right now.',
    thbNote: 'THB prices in parentheses are a reference conversion at the Aug 1, 2026 mid-market rate (1 KRW ≈ ฿0.0232), not a live rate.',
    searchPlaceholder: 'Search brand or product…',
    all: 'All',
    sortLabel: 'Sort',
    sortEnding: 'Ending soonest',
    sortValue: 'Best value (₩ / g protein)',
    noResults: 'No promos match that search.',
    promoLabel: { '1+1': '1+1', '2+1': '2+1', percent: (n) => `${n}% off`, none: 'No promo' },
    protein: 'protein',
    proteinUnknown: 'protein content not confirmed',
    perBar: 'per bar',
    effectivePrice: 'Effective price',
    perGram: '₩/g protein',
    endsIn: (d) => (d === 0 ? 'Ends today' : d === 1 ? 'Ends tomorrow' : `Ends in ${d}d`),
    ended: 'Promo ended',
    noEndDate: 'Ongoing',
    unconfirmed: 'Not confirmed active this month — check in store',
    source: 'Source',
  },
  ko: {
    title: '단백질 바 할인 정보',
    subtitle: '한국 편의점 · CU, GS25, 7-Eleven, emart24',
    placeholderNotice:
      '2026년 7월 31일 조사 — 실제 상품/가격이며, 각 매장 자체 사이트에서 직접 확인했습니다(날짜를 공개하는 매장은 날짜도 표시). 카드마다 출처 링크가 있습니다. 제3자 트래커에서만 확인된 항목은 검증되지 않은 채로 남겨두는 대신 제외했습니다 — 그래서 세븐일레븐은 현재 등록된 항목이 없습니다.',
    thbNote: '괄호 안 THB 가격은 2026년 8월 1일 중간시장환율(1 KRW ≈ ฿0.0232) 기준 참고용 환산이며, 실시간 환율이 아닙니다.',
    searchPlaceholder: '브랜드 또는 상품명 검색…',
    all: '전체',
    sortLabel: '정렬',
    sortEnding: '종료 임박순',
    sortValue: '가성비순 (₩ / 단백질 g)',
    noResults: '검색 결과가 없습니다.',
    promoLabel: { '1+1': '1+1', '2+1': '2+1', percent: (n) => `${n}% 할인`, none: '할인 없음' },
    protein: '단백질',
    proteinUnknown: '단백질 함량 미확인',
    perBar: '1개 기준',
    effectivePrice: '실질 가격',
    perGram: '₩/단백질 g',
    endsIn: (d) => (d === 0 ? '오늘 마감' : d === 1 ? '내일 마감' : `${d}일 남음`),
    ended: '할인 종료',
    noEndDate: '상시 판매',
    unconfirmed: '이번 달 진행 여부 미확인 — 매장에서 확인 필요',
    source: '출처',
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

// Mid-market rate as of Aug 1, 2026 (xe.com) — a reference conversion, not a
// real-time feed, so it drifts over time. Update the constant if it's been a
// while since this was last checked.
const KRW_TO_THB_RATE = 0.02316
function formatThb(krwAmount) {
  return `฿${(krwAmount * KRW_TO_THB_RATE).toFixed(1)}`
}

// Sort tier: confirmed-and-active first, then not-confirmed-live, then
// confirmed-but-ended last — regardless of which sort mode is picked, so a
// stale/unconfirmed entry never outranks something we know is live.
function tierOf(p) {
  if (!p.confirmed) return 1
  return p.daysLeft != null && p.daysLeft < 0 ? 2 : 0
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
        pricePerGram: p.proteinG ? effectiveUnitPriceKrw(p) / p.proteinG : null,
        daysLeft: daysLeft(p.endDate),
      }))

    list = [...list].sort((a, b) => {
      const at = tierOf(a)
      const bt = tierOf(b)
      if (at !== bt) return at - bt
      if (sort === 'value') {
        if (a.pricePerGram == null) return b.pricePerGram == null ? 0 : 1
        if (b.pricePerGram == null) return -1
        return a.pricePerGram - b.pricePerGram
      }
      if (a.daysLeft == null) return b.daysLeft == null ? 0 : 1
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
        <p className={styles.thbNote}>{t.thbNote}</p>

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
              const ended = p.confirmed && p.daysLeft != null && p.daysLeft < 0
              const promoText =
                p.promo === 'percent' ? t.promoLabel.percent(p.percentOff) : t.promoLabel[p.promo] || p.promo
              return (
                <li key={p.id} className={`${styles.card} ${ended ? styles.cardEnded : ''} ${!p.confirmed ? styles.cardUnconfirmed : ''}`}>
                  <div className={styles.cardTop}>
                    <span className={styles.storeTag}>{p.store}</span>
                    <span className={`${styles.promoTag} ${p.promo === 'none' ? styles.promoNone : ''}`}>{promoText}</span>
                  </div>
                  <div className={styles.cardName}>{p.brand} — {p.name}</div>
                  <div className={styles.cardMeta}>
                    {p.proteinG != null ? `${p.proteinG}g ${t.protein} · ` : ''}
                    {formatKrw(p.priceKrw)} ({formatThb(p.priceKrw)}) {t.perBar}
                  </div>
                  <div className={styles.priceRow}>
                    <span>{t.effectivePrice}: <b>{formatKrw(p.effectivePrice)}</b> <span className={styles.faint}>({formatThb(p.effectivePrice)})</span></span>
                    <span className={styles.faint}>
                      {p.pricePerGram != null ? `${p.pricePerGram.toFixed(0)} ${t.perGram}` : t.proteinUnknown}
                    </span>
                  </div>
                  <div className={styles.endRow}>
                    {!p.confirmed
                      ? t.unconfirmed
                      : ended
                        ? t.ended
                        : p.daysLeft == null
                          ? t.noEndDate
                          : t.endsIn(p.daysLeft)}
                  </div>
                  {p.notes && <div className={styles.notes}>{p.notes}</div>}
                  {p.sourceUrl && (
                    <a className={styles.sourceLink} href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {t.source} ↗
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
