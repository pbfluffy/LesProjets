import { useState } from 'react'
import { useLangContext, NEWS_KINDS } from '../LangContext'
import { useAuthContext } from '../hooks/useAuth'
import { deletePost } from '../hooks/usePosts'
import { photosOf, deletePhotos } from '../photo'
import { postUrl, shareToLine } from '../share'
import { updatedLabel } from '../freshness'
import styles from './ui.module.css'

const KIND_ICON = { general: '📢', lost: '🔍', event: '🎉', outage: '⚡', safety: '⚠️' }

export function NewsCard({ post, onEdit }) {
  const { t, lang } = useLangContext()
  const { user, isAdmin } = useAuthContext()
  const isOwner = !!user && user.uid === post.ownerUid
  const [zoomed, setZoomed] = useState(null)

  function handleDelete() {
    if (!window.confirm(t.deleteConfirm)) return
    deletePost('villageNews', post.id).then(() => {
      if (isOwner) deletePhotos(photosOf(post))
    }).catch((e) => {
      console.error('[village] news delete failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <article className={`${styles.card} ${styles.newsCard}`} id={'post-' + post.id}>
      <div className={styles.cardBody}>
        <div className={styles.cardTags}>
          <span className={`${styles.tag} ${styles['news_' + post.kind] || ''}`}>
            {KIND_ICON[post.kind] || '📢'} {t['news_' + post.kind]}
          </span>
        </div>
        <h3 className={styles.cardTitle}>{post.title}</h3>
        {post.body && <p className={styles.desc}>{post.body}</p>}
        {post.photos?.length > 0 && (
          <div className={styles.newsPhotos}>
            {post.photos.map((url) => (
              <img key={url} src={url} alt="" loading="lazy" onClick={() => setZoomed(url)} />
            ))}
          </div>
        )}
        <span className={styles.meta}>
          {post.authorName && <>✍️ {post.authorName} · </>}🕒 {updatedLabel(post, t, lang)}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.contactBtn}
            onClick={() => shareToLine(`🏘️ ${t.appName} · ${t['news_' + post.kind]}\n${post.title}\n${postUrl(post.id)}`)}
          >
            ↗ {t.shareLine}
          </button>
        </div>
        {(isOwner || isAdmin) && (
          <div className={styles.ownerActions}>
            {isOwner && <button type="button" className={styles.linkBtn} onClick={() => onEdit(post)}>{t.edit}</button>}
            <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={handleDelete}>
              {isOwner ? t.delete : '🛡️ ' + t.delete}
            </button>
          </div>
        )}
      </div>
      {zoomed && (
        <div className={styles.lightbox} onClick={() => setZoomed(null)}>
          <img src={zoomed} alt="" />
        </div>
      )}
    </article>
  )
}

// ประกาศหมู่บ้าน: lost & found, events, outages… newest first.
export default function NewsBoard({ posts, loading, onAdd, onEdit }) {
  const { t } = useLangContext()
  const [kind, setKind] = useState('')
  const shown = kind ? posts.filter((p) => p.kind === kind) : posts

  return (
    <section>
      <div className={styles.boardTop}>
        <button type="button" className={styles.primaryBtn} onClick={onAdd}>{t.newsAdd}</button>
      </div>

      <div className={`${styles.chipsWrap} ${styles.filters}`}>
        <button type="button" className={`${styles.chip} ${kind === '' ? styles.chipActive : ''}`} onClick={() => setKind('')}>
          {t.filterAll}
        </button>
        {NEWS_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            className={`${styles.chip} ${kind === k ? styles.chipActive : ''}`}
            onClick={() => setKind(kind === k ? '' : k)}
          >
            {KIND_ICON[k]} {t['news_' + k]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.empty}>{t.loading}</p>
      ) : posts.length === 0 ? (
        <p className={styles.empty}>{t.newsEmpty}</p>
      ) : shown.length === 0 ? (
        <p className={styles.empty}>{t.noMatches}</p>
      ) : (
        <div className={styles.newsList}>
          {shown.map((p) => <NewsCard key={p.id} post={p} onEdit={onEdit} />)}
        </div>
      )}
    </section>
  )
}
