import { useMemo, useState } from 'react'
import { useLangContext } from '../LangContext'
import PostCard from './PostCard'
import styles from './ui.module.css'

// The marketplace and handyman pages share this: residency filter (the
// villager / outsider split), tag chips and a text search over a live
// list of posts. A post can carry several tags (a shop may sell food and
// plants), but the filter picks one tag at a time and shows every post that has it.
export default function Board({
  kind, collectionName, posts, loading, ratings,
  tags, tagField, tagPrefix,
  emptyText, addLabel, onAdd, onEdit,
}) {
  const { t } = useLangContext()
  const [residency, setResidency] = useState('all') // 'all' | 'resident' | 'outsider'
  const [picked, setPicked] = useState('') // one tag; '' = all
  const [search, setSearch] = useState('')

  // Handymen can be sorted by rating (best first; unrated ones last).
  const [sort, setSort] = useState('newest') // 'newest' | 'rating'
  const canSortByRating = kind === 'provider'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = posts.filter((p) => {
      if (residency === 'resident' && !p.isResident) return false
      if (residency === 'outsider' && p.isResident) return false
      if (picked && !(p[tagField] || []).includes(picked)) return false
      if (q) {
        const itemNames = (p.items || []).map((it) => it.name)
        const hay = [p.name, p.description, ...itemNames].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    if (!canSortByRating || sort !== 'rating') return list
    return list.slice().sort((a, b) => {
      const ra = ratings.get(a.id)
      const rb = ratings.get(b.id)
      return (rb.avg - ra.avg) || (rb.count - ra.count)
    })
  }, [posts, residency, picked, search, tagField, sort, canSortByRating, ratings])

  return (
    <section>
      <div className={styles.boardTop}>
        <button type="button" className={styles.primaryBtn} onClick={onAdd}>{addLabel}</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.segment} role="group">
          {[
            ['all', t.filterAll],
            ['resident', '🏡 ' + t.resident],
            ['outsider', '🚗 ' + t.outsider],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={residency === key}
              className={`${styles.segmentBtn} ${residency === key ? styles.segmentBtnActive : ''}`}
              onClick={() => setResidency(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="search"
          className={styles.search}
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {canSortByRating && (
          <div className={styles.sortRow}>
            <span>{t.sortBy}</span>
            {[['newest', t.sortNewest], ['rating', '★ ' + t.sortRating]].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                className={`${styles.chip} ${sort === key ? styles.chipActive : ''}`}
                onClick={() => setSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.chipsWrap}>
          <button
            type="button"
            className={`${styles.chip} ${picked === '' ? styles.chipActive : ''}`}
            onClick={() => setPicked('')}
          >
            {t.allCategories}
          </button>
          {tags.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={picked === c}
              className={`${styles.chip} ${picked === c ? styles.chipActive : ''}`}
              onClick={() => setPicked(picked === c ? '' : c)}
            >
              {t[tagPrefix + c]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>{t.loading}</p>
      ) : posts.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>{t.noMatches}</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((p) => (
            <PostCard key={p.id} kind={kind} collectionName={collectionName} post={p} ratings={ratings} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  )
}
