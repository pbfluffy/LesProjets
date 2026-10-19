import { useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { updatePost, deletePost } from '../hooks/usePosts'
import styles from './ui.module.css'

export function ResidencyBadge({ isResident }) {
  const { t } = useLangContext()
  return (
    <span className={`${styles.badge} ${isResident ? styles.badgeResident : styles.badgeOutsider}`}>
      {isResident ? '🏡 ' + t.resident : '🚗 ' + t.outsider}
    </span>
  )
}

function formatPrice(price, t, lang) {
  if (price === null || price === undefined) return t.priceAsk
  if (price === 0) return t.priceFree
  return '฿' + price.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')
}

// LINE accepts a plain ID via the ~ profile link (opens the app on phones).
function lineUrl(id) {
  return 'https://line.me/ti/p/~' + encodeURIComponent(id.replace(/^@?/, ''))
}

// One card for both kinds: `kind` is 'listing' (marketplace) or 'provider'
// (handyman). Owners get edit / delete (and sold toggle for listings).
export default function PostCard({ kind, collectionName, post, my, onEdit }) {
  const { t, lang } = useLangContext()
  const isOwner = my.isMine(post.id)
  const isListing = kind === 'listing'
  const tag = isListing ? t['cat_' + post.category] : t['trade_' + post.trade]
  const photos = post.photos || []
  const [shown, setShown] = useState(0) // index of the photo scrolled into view
  const [zoomed, setZoomed] = useState(null)

  function onStripScroll(e) {
    const el = e.currentTarget
    setShown(Math.round(el.scrollLeft / el.clientWidth))
  }

  function handleDelete() {
    if (!window.confirm(t.deleteConfirm)) return
    deletePost(collectionName, post.id).then(() => my.removeMine(post.id)).catch((e) => {
      console.error('[village] delete failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  function toggleSold() {
    updatePost(collectionName, post.id, { sold: !post.sold }).catch((e) => {
      console.error('[village] sold toggle failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <article className={`${styles.card} ${post.sold ? styles.cardSold : ''}`}>
      {photos.length > 0 && (
        <div className={styles.photoWrap}>
          <div className={styles.photoStrip} onScroll={onStripScroll}>
            {photos.map((url, i) => (
              <img
                key={i}
                className={styles.photo}
                src={url}
                alt={interp(t.photoOf, { i: i + 1, n: photos.length })}
                loading="lazy"
                onClick={() => setZoomed(url)}
              />
            ))}
          </div>
          {post.sold && <span className={styles.soldStamp}>{t.sold}</span>}
          {photos.length > 1 && <span className={styles.photoCount}>{shown + 1}/{photos.length}</span>}
        </div>
      )}
      {zoomed && (
        <div className={styles.lightbox} onClick={() => setZoomed(null)}>
          <img src={zoomed} alt="" />
        </div>
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardTags}>
          <ResidencyBadge isResident={post.isResident} />
          {tag && <span className={styles.tag}>{tag}</span>}
          {post.sold && !photos.length && <span className={styles.tag}>{t.sold}</span>}
        </div>

        <h3 className={styles.cardTitle}>{isListing ? post.title : post.name}</h3>
        {isListing && <div className={styles.price}>{formatPrice(post.price, t, lang)}</div>}
        {post.description && <p className={styles.desc}>{post.description}</p>}

        <div className={styles.meta}>
          {isListing && post.name && <span>{interp(t.postedBy, { name: post.name })}</span>}
          {post.address && <span>📍 {post.address}</span>}
        </div>

        <div className={styles.actions}>
          {post.phone && (
            <a className={styles.contactBtn} href={'tel:' + post.phone.replace(/[^\d+]/g, '')}>
              📞 {t.call} {post.phone}
            </a>
          )}
          {post.line && (
            <a className={`${styles.contactBtn} ${styles.lineBtn}`} href={lineUrl(post.line)} target="_blank" rel="noopener noreferrer">
              💬 {t.line}
            </a>
          )}
        </div>

        {isOwner && (
          <div className={styles.ownerActions}>
            <button type="button" className={styles.linkBtn} onClick={() => onEdit(post)}>{t.edit}</button>
            {isListing && (
              <button type="button" className={styles.linkBtn} onClick={toggleSold}>
                {post.sold ? t.markAvailable : t.markSold}
              </button>
            )}
            <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={handleDelete}>{t.delete}</button>
          </div>
        )}
      </div>
    </article>
  )
}
