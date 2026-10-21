import { useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { updatePost, deletePost, deletePrivateAddress } from '../hooks/usePosts'
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

// Average (read-only) and, for anyone but the poster, a 1–5 picker that
// shows this phone's own rating and can change it.
function Stars({ postId, ratings, canPick }) {
  const { t } = useLangContext()
  const { avg, count, mine } = ratings.get(postId)
  const [hover, setHover] = useState(0)
  const [thanks, setThanks] = useState(false)

  function pick(n) {
    ratings.rate(postId, n).then(() => {
      setThanks(true)
      setTimeout(() => setThanks(false), 2000)
    }).catch((e) => {
      console.error('[village] rating failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <div className={styles.rating}>
      <div className={styles.ratingSummary}>
        {count > 0 ? (
          <>
            <span className={styles.starsStatic} style={{ '--fill': `${(avg / 5) * 100}%` }} aria-hidden="true">★★★★★</span>
            <strong>{avg.toFixed(1)}</strong>
            <span>{interp(t.ratingCount, { n: count })}</span>
          </>
        ) : (
          <span>{t.ratingNone}</span>
        )}
      </div>
      {canPick && ratings.canRate && (
        <div className={styles.ratingPick} onMouseLeave={() => setHover(0)}>
          <span>{thanks ? t.ratingThanks : mine ? t.ratingYours : t.ratingAsk}</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.starBtn} ${n <= (hover || mine) ? styles.starOn : ''}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => pick(n)}
              aria-label={interp(t.ratingStars, { n })}
              aria-pressed={mine === n}
            >
              ★
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// LINE accepts a plain ID via the ~ profile link (opens the app on phones).
function lineUrl(id) {
  return 'https://line.me/ti/p/~' + encodeURIComponent(id.replace(/^@?/, ''))
}

// One card for both kinds: `kind` is 'shop' (a marketplace seller, with the
// items they sell listed inside the card) or 'provider' (a handyman).
// The device that created the post gets Edit / Delete, plus a per-item
// sold toggle on shops.
export default function PostCard({ kind, collectionName, post, my, ratings, onEdit }) {
  const { t, lang } = useLangContext()
  const isOwner = my.isMine(post.id)
  const isShop = kind === 'shop'
  const tags = (isShop ? post.categories : post.trades) || []
  const tagPrefix = isShop ? 'cat_' : 'trade_'
  const photos = post.photos || []
  const items = post.items || []
  const [shown, setShown] = useState(0) // index of the photo scrolled into view
  const [zoomed, setZoomed] = useState(null)

  function onStripScroll(e) {
    const el = e.currentTarget
    setShown(Math.round(el.scrollLeft / el.clientWidth))
  }

  function handleDelete() {
    if (!window.confirm(t.deleteConfirm)) return
    deletePost(collectionName, post.id).then(() => {
      my.removeMine(post.id)
      deletePrivateAddress(post.id).catch(() => {}) // none saved for outsiders
      if (!isShop) ratings.removeAll(post.id).catch(() => {})
    }).catch((e) => {
      console.error('[village] delete failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  function toggleSold(i) {
    const next = items.map((it, j) => (j === i ? { ...it, sold: !it.sold } : it))
    updatePost(collectionName, post.id, { items: next }).catch((e) => {
      console.error('[village] sold toggle failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <article className={styles.card}>
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
          {tags.map((c) => <span key={c} className={styles.tag}>{t[tagPrefix + c]}</span>)}
        </div>

        <h3 className={styles.cardTitle}>{post.name}</h3>
        {!isShop && <Stars postId={post.id} ratings={ratings} canPick={!isOwner} />}
        {post.description && <p className={styles.desc}>{post.description}</p>}

        {isShop && items.length > 0 && (
          <ul className={styles.items}>
            {items.map((it, i) => (
              <li key={i} className={`${styles.item} ${it.sold ? styles.itemSold : ''}`}>
                {it.photo ? (
                  <img className={styles.itemPhoto} src={it.photo} alt="" loading="lazy" onClick={() => setZoomed(it.photo)} />
                ) : (
                  <span className={`${styles.itemPhoto} ${styles.itemPhotoEmpty}`}>🛍️</span>
                )}
                <span className={styles.itemName}>{it.name}</span>
                <span className={styles.itemPrice}>{it.sold ? t.sold : formatPrice(it.price, t, lang)}</span>
                {isOwner && (
                  <button type="button" className={styles.itemToggle} onClick={() => toggleSold(i)}>
                    {it.sold ? t.markAvailable : t.markSold}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}


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
            <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={handleDelete}>{t.delete}</button>
          </div>
        )}
      </div>
    </article>
  )
}
