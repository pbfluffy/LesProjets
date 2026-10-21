import { useMemo, useState } from 'react'
import { useLangContext } from '../LangContext'
import PostCard from './PostCard'
import styles from './ui.module.css'

// The marketplace and handyman pages share this: residency filter (the
// villager / outsider split), category chips and a text search over a live
// list of posts.
export default function Board({
  kind, collectionName, posts, loading, my, ratings,
  categories, categoryField, categoryPrefix,
  emptyText, addLabel, onAdd, onEdit,
}) {
  const { t } = useLangContext()
  const [residency, setResidency] = useState('all') // 'all' | 'resident' | 'outsider'
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return posts.filter((p) => {
      if (residency === 'resident' && !p.isResident) return false
      if (residency === 'outsider' && p.isResident) return false
      if (category && p[categoryField] !== category) return false
      if (q) {
        const itemNames = (p.items || []).map((it) => it.name)
        const hay = [p.name, p.description, ...itemNames].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [posts, residency, category, search, categoryField])

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

        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${category === '' ? styles.chipActive : ''}`}
            onClick={() => setCategory('')}
          >
            {t.allCategories}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.chip} ${category === c ? styles.chipActive : ''}`}
              onClick={() => setCategory(category === c ? '' : c)}
            >
              {t[categoryPrefix + c]}
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
            <PostCard key={p.id} kind={kind} collectionName={collectionName} post={p} my={my} ratings={ratings} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  )
}
