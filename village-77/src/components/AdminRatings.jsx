import { useMemo, useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { withItemIds } from '../hooks/usePosts'
import Icon from './Icon'
import { useAuthContext } from '../hooks/useAuth'
import { logAdmin } from '../adminLog'
import styles from './ui.module.css'

const PAGE = 50 // rows shown before "show more"

// Admin tab → รีวิว: every rating in one list — shop / handyman ratings
// (with their comment, if any) and stars on single items — newest first,
// filterable by type, stars and post, each with a Delete. For cleaning up a
// fake burst of 1★ or 5★ without banning anyone.
export default function AdminRatings({ ratings, itemRatings, shops, providers, onOpenPost }) {
  const { t, lang } = useLangContext()
  const { user } = useAuthContext()
  const [kind, setKind] = useState('all') // 'all' | 'post' | 'item'
  const [stars, setStars] = useState(0) // 0 = any
  const [postId, setPostId] = useState('')
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(PAGE)

  // postId -> { name, isShop, items: itemId -> name }
  const posts = useMemo(() => {
    const m = {}
    for (const p of shops) {
      m[p.id] = { name: p.name, isShop: true, items: Object.fromEntries(withItemIds(p.items || []).map((it) => [it.id, it.name])) }
    }
    for (const p of providers) m[p.id] = { name: p.name, isShop: false, items: {} }
    return m
  }, [shops, providers])

  const all = useMemo(() => [...ratings.postRatings(), ...itemRatings], [ratings, itemRatings])
  // Item stars saved before names were kept: borrow the name from the same
  // person's shop / handyman rating, if they left one.
  const nameByUid = Object.fromEntries(all.filter((r) => r.name).map((r) => [r.raterUid, r.name]))
  const raterName = (r) => r.name || nameByUid[r.raterUid] || ''
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all
      .filter((r) => (kind === 'all' || r.kind === kind)
        && (!stars || r.stars === stars)
        && (!postId || r.postId === postId)
        && (!q || [raterName(r), r.comment, posts[r.postId]?.name, posts[r.postId]?.items[r.itemId]]
          .filter(Boolean).join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
  }, [all, kind, stars, postId, search, posts])

  // Posts that have ratings, for the dropdown (most rated first).
  const ratedPosts = useMemo(() => {
    const n = {}
    for (const r of all) n[r.postId] = (n[r.postId] || 0) + 1
    return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }))
  }, [all])

  const when = (ts) => ts?.toDate?.().toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) || ''

  function remove(r) {
    if (!window.confirm(interp(t.ratingDeleteConfirm, { name: raterName(r) || t.adminNoName, n: r.stars }))) return
    ratings.removeRating(r).then(() => logAdmin(user, 'deleteRating', {
      detail: raterName(r) + ' · ' + r.stars + '★ · ' + (posts[r.postId]?.name || '') + (r.comment ? ' · “' + r.comment + '”' : ''),
      postId: r.postId, targetUid: r.raterUid,
    }), (e) => {
      console.error('[village] delete rating failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <>
      <div className={styles.adminFilters}>
        <div className={styles.segment} role="group">
          {[['all', t.filterAll], ['post', t.ratingKindPost], ['item', t.ratingKindItem]].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={kind === key}
              className={`${styles.segmentBtn} ${kind === key ? styles.segmentBtnActive : ''}`}
              onClick={() => { setKind(key); setShown(PAGE) }}>
              {label}
            </button>
          ))}
        </div>
        <div className={styles.chipsWrap}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={stars === n}
              className={`${styles.chip} ${stars === n ? styles.chipActive : ''}`}
              onClick={() => { setStars(n); setShown(PAGE) }}>
              {n ? <>{n}<Icon name="star" size={12} filled /></> : t.filterAll}
            </button>
          ))}
        </div>
        <select className={styles.adminSelect} value={postId} onChange={(e) => { setPostId(e.target.value); setShown(PAGE) }}>
          <option value="">{t.ratingAllPosts}</option>
          {ratedPosts.map(({ id, count }) => (
            <option key={id} value={id}>{(posts[id]?.name || t.ratingPostGone) + ' (' + count + ')'}</option>
          ))}
        </select>
        <input type="search" className={styles.search} placeholder={t.ratingSearchPh} value={search}
          onChange={(e) => { setSearch(e.target.value); setShown(PAGE) }} />
      </div>

      <p className={styles.hint} style={{ margin: '4px 0 8px' }}>{interp(t.ratingCountShown, { n: rows.length })}</p>

      {rows.length === 0 ? (
        <p className={styles.empty}>{t.noMatches}</p>
      ) : (
        <ul className={styles.adminList}>
          {rows.slice(0, shown).map((r) => {
            const post = posts[r.postId]
            return (
              <li key={r.kind + r.id} className={styles.adminRow}>
                <div className={styles.adminMain}>
                  <span className={styles.ratingRowStars} aria-label={interp(t.ratingStars, { n: r.stars })}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Icon key={n} name="star" size={14} filled={n <= r.stars} className={n <= r.stars ? styles.starIcon : styles.starOff} />
                    ))}
                  </span>
                  {r.comment && <span>“{r.comment}”</span>}
                  <span className={styles.meta}>
                    {raterName(r) || t.adminNoName}{r.updatedAt && ' · ' + when(r.updatedAt)}
                  </span>
                  <span className={styles.meta}>
                    {post ? (
                      <button type="button" className={styles.linkBtn} onClick={() => onOpenPost(r.postId)}>
                        {post.isShop ? t.navMarket : t.navServices}: {post.name}
                      </button>
                    ) : t.ratingPostGone}
                    {r.kind === 'item' && <> · {t.ratingKindItem}: {post?.items[r.itemId] || t.ratingItemGone}</>}
                  </span>
                </div>
                <div className={styles.adminActions}>
                  <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => remove(r)}>{t.delete}</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {rows.length > shown && (
        <button type="button" className={styles.secondaryBtn} style={{ marginTop: 12 }} onClick={() => setShown(shown + PAGE)}>
          {interp(t.showMore, { n: rows.length - shown })}
        </button>
      )}
    </>
  )
}
