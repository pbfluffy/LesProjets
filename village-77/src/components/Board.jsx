import { useMemo, useState } from 'react'
import { useLangContext } from '../LangContext'
import PostCard from './PostCard'
import Icon from './Icon'
import { useCategoriesContext } from '../hooks/useCategories'
import { useFavoritesContext } from '../hooks/useFavorites'
import styles from './ui.module.css'

// The marketplace and handyman pages share this: residency filter (the
// villager / outsider split), tag chips and a text search over a live
// list of posts. A post can carry several tags (a shop may sell food and
// plants), but the filter picks one tag at a time and shows every post that has it.
export default function Board({
  kind, collectionName, posts, loading, ratings,
  tagField,
  emptyText, addLabel, onAdd, onEdit, onOpenPost,
}) {
  const { t } = useLangContext()
  const cats = useCategoriesContext()
  const tags = cats.listFor(kind).map((c) => c.key) // admin-editable list
  const [residency, setResidency] = useState('all') // 'all' | 'resident' | 'outsider'
  const [picked, setPicked] = useState('') // one tag; '' = all
  const [search, setSearch] = useState('')
  // ♥ only the saved ones; the chip shows once something is saved.
  const favs = useFavoritesContext()
  const [savedOnly, setSavedOnly] = useState(false)
  const showSaved = savedOnly && favs.ids.length > 0

  // Sort by rating (best first; unrated ones last).
  const [sort, setSort] = useState('newest') // 'newest' | 'rating'
  const canSortByRating = true // shops and handymen both have ratings

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = posts.filter((p) => {
      if (residency === 'resident' && !p.isResident) return false
      if (residency === 'outsider' && p.isResident) return false
      if (picked && !(p[tagField] || []).includes(picked)) return false
      if (showSaved && !favs.ids.includes(p.id)) return false
      if (q) {
        const itemNames = (p.items || []).map((it) => it.name)
        const hay = [p.name, p.description, ...itemNames].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    // Handymen who switched themselves to "busy" go to the bottom.
    const busy = (p) => (p.available === false ? 1 : 0)
    if (!canSortByRating || sort !== 'rating') return list.slice().sort((a, b) => busy(a) - busy(b))
    return list.slice().sort((a, b) => {
      const ra = ratings.get(a.id)
      const rb = ratings.get(b.id)
      return (busy(a) - busy(b)) || (rb.avg - ra.avg) || (rb.count - ra.count)
    })
  }, [posts, residency, picked, search, tagField, sort, canSortByRating, ratings, showSaved, favs.ids])

  return (
    <section>
      <div className={styles.boardTop}>
        <button type="button" data-tour="add" className={styles.primaryBtn} onClick={onAdd}>{addLabel}</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.segment} role="group" data-tour="residency">
          {[
            ['all', t.filterAll],
            ['resident', <><Icon name="home" size={13} strokeWidth={2.4} />{t.resident}</>],
            ['outsider', <><Icon name="pin" size={13} strokeWidth={2.4} />{t.outsider}</>],
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
            {favs.ids.length > 0 && (
              <button
                type="button"
                aria-pressed={showSaved}
                className={`${styles.chip} ${showSaved ? styles.chipActive : ''}`}
                onClick={() => setSavedOnly(!showSaved)}
              >
                ♥ {t.savedPosts}
              </button>
            )}
          </div>
        )}

        <div className={styles.chipsRow}>
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
              {cats.label(kind, c)}
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
            <PostCard key={p.id} kind={kind} collectionName={collectionName} post={p} ratings={ratings} onEdit={onEdit}
              compact onOpen={(post) => onOpenPost(post.id)} />
          ))}
        </div>
      )}
    </section>
  )
}
