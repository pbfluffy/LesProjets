import { useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { updatePost, deletePost, deletePrivateAddress } from '../hooks/usePosts'
import { useAuthContext } from '../hooks/useAuth'
import { photosOf, deletePhotos } from '../photo'
import { isStale, updatedLabel, STALE_DAYS } from '../freshness'
import { postUrl, shareToLine } from '../share'
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

// Average (read-only), the latest written reviews, and — for anyone but the
// poster — a 1–5 picker showing their own rating, plus an optional short
// comment once they've picked stars.
function Stars({ postId, ratings, canPick, askLabel }) {
  const { t } = useLangContext()
  const { requireSignIn } = useAuthContext()
  const { avg, count, mine, myComment, reviews } = ratings.get(postId)
  const [hover, setHover] = useState(0)
  const [thanks, setThanks] = useState(false)
  const [draft, setDraft] = useState(null) // comment being written; null = closed
  const [allReviews, setAllReviews] = useState(false)

  function done() {
    setThanks(true)
    setTimeout(() => setThanks(false), 2000)
  }
  function failed(e) {
    console.error('[village] rating failed:', e?.code)
    alert(t.saveFailed)
  }

  function pick(n) {
    if (!requireSignIn()) return // rating needs a LINE account (one vote each)
    ratings.rate(postId, n).then(() => {
      done()
      if (!myComment) setDraft('') // invite a short comment after first stars
    }).catch(failed)
  }

  function sendComment() {
    ratings.comment(postId, draft || '').then(() => {
      setDraft(null)
      done()
    }).catch(failed)
  }

  const shownReviews = allReviews ? reviews : reviews.slice(0, 2)

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

      {shownReviews.length > 0 && (
        <ul className={styles.reviews}>
          {shownReviews.map((r) => (
            <li key={r.id}>
              <span className={styles.reviewStars}>{'★'.repeat(r.stars)}</span>{' '}
              <span>“{r.comment}”</span>
              {r.name && <span className={styles.reviewName}> — {r.name}</span>}
            </li>
          ))}
          {reviews.length > 2 && (
            <li>
              <button type="button" className={styles.linkBtn} onClick={() => setAllReviews(!allReviews)}>
                {allReviews ? t.reviewsLess : interp(t.reviewsAll, { n: reviews.length })}
              </button>
            </li>
          )}
        </ul>
      )}

      {canPick && (
        <div className={styles.ratingPick} onMouseLeave={() => setHover(0)}>
          <span>{thanks ? t.ratingThanks : mine ? t.ratingYours : askLabel}</span>
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

      {canPick && mine > 0 && draft === null && (
        <button type="button" className={styles.linkBtn} onClick={() => setDraft(myComment)}>
          {myComment ? t.reviewEdit : t.reviewWrite}
        </button>
      )}
      {canPick && draft !== null && (
        <div className={styles.reviewBox}>
          <input
            maxLength={200}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.reviewPh}
          />
          <button type="button" className={styles.primaryBtn} onClick={sendComment}>{t.reviewSend}</button>
          <button type="button" className={styles.linkBtn} onClick={() => setDraft(null)}>{t.cancel}</button>
        </div>
      )}
    </div>
  )
}

// Opens a LINE chat with the poster (the LINE app on phones). Personal LINE
// IDs use the ~ profile link; LINE Official Account IDs start with "@" and
// need it kept, on a different link.
function lineUrl(id) {
  const v = id.trim()
  return v.startsWith('@')
    ? 'https://line.me/R/ti/p/' + encodeURIComponent(v)
    : 'https://line.me/ti/p/~' + encodeURIComponent(v)
}

// One card for both kinds: `kind` is 'shop' (a marketplace seller, with the
// items they sell listed inside the card) or 'provider' (a handyman).
// The poster gets Edit / Delete, plus a per-item sold toggle on shops;
// admins get Delete.
export default function PostCard({ kind, collectionName, post, ratings, onEdit, compact = false, onOpen }) {
  const { t, lang } = useLangContext()
  const { user, isAdmin } = useAuthContext()
  const isOwner = !!user && user.uid === post.ownerUid
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
      deletePrivateAddress(post.id).catch(() => {}) // none saved for outsiders
      if (isOwner) deletePhotos(photosOf(post)) // the Worker only deletes the uploader's own
      ratings.removeAll(post.id).catch(() => {})
    }).catch((e) => {
      console.error('[village] delete failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  // Name, tags and a link straight to this post, into a LINE chat or group.
  function handleShare() {
    const tagText = tags.map((c) => t[tagPrefix + c]).join(', ')
    shareToLine(`🏘️ ${t.appName}\n${post.name}${tagText ? ' — ' + tagText : ''}\n${postUrl(post.id)}`)
  }

  // "Still open": an empty update just sets updatedAt (usePosts.updatePost).
  function bump() {
    updatePost(collectionName, post.id, {}).catch((e) => {
      console.error('[village] bump failed:', e?.code)
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

  // Board / home view of a shop: a short summary with a peek at its items;
  // tapping anywhere but a button opens the shop page with every item.
  if (compact) {
    const shopRating = ratings.get(post.id)
    const cover = photos[0] || items.find((it) => it.photo)?.photo
    const forSale = items.filter((it) => !it.sold).length
    const open = (e) => { if (!e.target.closest('a, button')) onOpen(post) }
    return (
      <article
        className={`${styles.card} ${styles.shopCard}`}
        id={'post-' + post.id}
        onClick={open}
        onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onOpen(post)}
        role="link"
        tabIndex={0}
        aria-label={interp(t.shopOpen, { name: post.name })}
      >
        {cover && (
          <div className={styles.photoWrap}>
            <img className={styles.photo} src={cover} alt="" loading="lazy" />
            {photos.length + items.filter((it) => it.photo).length > 1 && (
              <span className={styles.photoCount}>📷 {photos.length + items.filter((it) => it.photo).length}</span>
            )}
          </div>
        )}
        <div className={styles.cardBody}>
          <div className={styles.cardTags}>
            <ResidencyBadge isResident={post.isResident} />
            {post.isResident && post.verified && <span className={`${styles.badge} ${styles.badgeVerified}`}>✓ {t.verified}</span>}
            {tags.map((c) => <span key={c} className={styles.tag}>{t[tagPrefix + c]}</span>)}
          </div>
          <h3 className={styles.cardTitle}>{post.name}</h3>
          {shopRating.count > 0 && (
            <div className={styles.ratingSummary}>
              <span className={styles.starsStatic} style={{ '--fill': `${(shopRating.avg / 5) * 100}%` }} aria-hidden="true">★★★★★</span>
              <strong>{shopRating.avg.toFixed(1)}</strong>
              <span>{interp(t.ratingCount, { n: shopRating.count })}</span>
            </div>
          )}
          {post.description && <p className={`${styles.desc} ${styles.clamp2}`}>{post.description}</p>}

          <div className={styles.itemPreview}>
            <div className={styles.previewThumbs}>
              {items.slice(0, 4).map((it, i) => (
                it.photo
                  ? <img key={i} src={it.photo} alt="" loading="lazy" className={it.sold ? styles.previewSold : ''} />
                  : <span key={i} className={styles.previewEmpty}>🛍️</span>
              ))}
            </div>
            <span className={styles.previewText}>
              {interp(t.shopItemCount, { n: items.length })}
              {forSale < items.length && <small> · {interp(t.shopForSale, { n: forSale })}</small>}
            </span>
            <span className={styles.seeAll}>{t.shopSeeAll} ›</span>
          </div>

          <div className={styles.actions}>
            {post.phone && (
              <a className={styles.contactBtn} href={'tel:' + post.phone.replace(/[^\d+]/g, '')}>
                📞 {t.call}
              </a>
            )}
            {post.line && (
              <a className={`${styles.contactBtn} ${styles.lineBtn}`} href={lineUrl(post.line)} target="_blank" rel="noopener noreferrer">
                💬 {t.line}
              </a>
            )}
          </div>
          <span className={styles.meta}>🕒 {updatedLabel(post, t, lang)}</span>
          {isOwner && isStale(post) && <span className={styles.staleBadge}>{t.staleShort}</span>}
        </div>
      </article>
    )
  }

  return (
    <article className={styles.card} id={'post-' + post.id}>
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
          {post.isResident && post.verified && <span className={`${styles.badge} ${styles.badgeVerified}`}>✓ {t.verified}</span>}
          {tags.map((c) => <span key={c} className={styles.tag}>{t[tagPrefix + c]}</span>)}
        </div>

        <h3 className={styles.cardTitle}>{post.name}</h3>
        <Stars postId={post.id} ratings={ratings} canPick={!isOwner} askLabel={isShop ? t.ratingAskShop : t.ratingAsk} />
        {post.description && <p className={styles.desc}>{post.description}</p>}

        {isShop && items.length > 0 && (
          <>
          <h4 className={styles.itemsHead}>{interp(t.shopItemsHead, { n: items.length })}</h4>
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
          </>
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
          <button type="button" className={styles.contactBtn} onClick={handleShare}>↗ {t.shareLine}</button>
        </div>

        <span className={styles.meta}>🕒 {updatedLabel(post, t, lang)}</span>

        {isOwner && isStale(post) && (
          <div className={styles.staleNote}>
            <span>{interp(t.staleNote, { n: STALE_DAYS })}</span>
            <button type="button" className={styles.secondaryBtn} onClick={bump}>✓ {t.stillOpen}</button>
          </div>
        )}

        {(isOwner || isAdmin) && (
          <div className={styles.ownerActions}>
            {isOwner && <button type="button" className={styles.linkBtn} onClick={() => onEdit(post)}>{t.edit}</button>}
            <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={handleDelete}>
              {isOwner ? t.delete : '🛡️ ' + t.delete}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
