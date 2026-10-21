import { useMemo, useState } from 'react'
import { useLangContext } from '../LangContext'
import PostCard from './PostCard'
import styles from './ui.module.css'

// The marketplace and handyman pages share this: residency filter (the
// villager / outsider split), tag chips and a text search over a live
// list of posts. Tags work like tagging, not one-of: pick several and a post
// matches if it has any of them (a shop can sell food and plants).
export default function Board({
  kind, collectionName, posts, loading, my, ratings,
  tags, tagField, tagPrefix,
  emptyText, addLabel, onAdd, onEdit,
}) {
  const { t } = useLangContext()
  const [residency, setResidency] = useState('all') // 'all' | 'resident' | 'outsider'
  const [picked, setPicked] = useState([]) // selected tags; empty = all
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return posts.filter((p) => {
      if (residency === 'resident' && !p.isResident) return false
      if (residency === 'outsider' && p.isResident) return false
      if (picked.length && !(p[tagField] || []).some((c) => picked.includes(c))) return false
      if (q) {
        const itemNames = (p.items || []).map((it) => it.name)
        const hay = [p.name, p.description, ...itemNames].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [posts, residency, picked, search, tagField])

  const toggle = (c) => setPicked((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

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

        <div className={styles.chipsWrap}>
          <button
            type="button"
            className={`${styles.chip} ${picked.length === 0 ? styles.chipActive : ''}`}
            onClick={() => setPicked([])}
          >
            {t.allCategories}
          </button>
          {tags.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={picked.includes(c)}
              className={`${styles.chip} ${picked.includes(c) ? styles.chipActive : ''}`}
              onClick={() => toggle(c)}
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
            <PostCard key={p.id} kind={kind} collectionName={collectionName} post={p} my={my} ratings={ratings} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  )
}
