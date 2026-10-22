import { useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { updatePost, deletePost, deletePrivateAddress, withItemIds, itemKey } from '../hooks/usePosts'
import { useAuthContext } from '../hooks/useAuth'
import { useCategoriesContext } from '../hooks/useCategories'
import { useFavoritesContext } from '../hooks/useFavorites'
import ReportSheet from './ReportSheet'
import Icon from './Icon'
import { photosOf, deletePhotos } from '../photo'
import { isStale, updatedLabel, STALE_DAYS } from '../freshness'
import { postUrl, shareToLine, igUrl } from '../share'
import { isOnSale, isNewItem, salePercent } from '../deals'
import { track, useWeekStats } from '../hooks/useStats'
import styles from './ui.module.css'

export function ResidencyBadge({ isResident }) {
  const { t } = useLangContext()
  return (
    <span className={`${styles.badge} ${isResident ? styles.badgeResident : styles.badgeOutsider}`}>
      <Icon name={isResident ? 'home' : 'pin'} size={12} strokeWidth={2.4} />
      {isResident ? t.resident : t.outsider}
    </span>
  )
}

function formatPrice(price, t, lang) {
  if (price === null || price === undefined) return t.priceAsk
  if (price === 0) return t.priceFree
  return '฿' + price.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')
}

// One item's stars, under its name: the average, and (not for the shop
// owner) five small stars to tap — the filled ones are your own rating.
function ItemStars({ postId, item, ratings, canPick }) {
  const { t } = useLangContext()
  const { requireSignIn } = useAuthContext()
  const itemId = itemKey(item) // older items: an id made from the name
  const { avg, count, mine } = ratings.item(postId, itemId)
  if (!canPick && !count) return null

  function pick(n) {
    if (!requireSignIn()) return
    ratings.rateItem(postId, itemId, n).catch((e) => {
      console.error('[village] item rating failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  return (
    <span className={styles.itemStars}>
      {count > 0 && <span className={styles.itemStarsAvg}><Icon name="star" size={12} filled />{avg.toFixed(1)} ({count})</span>}
      {canPick && (
        <span role="group" aria-label={t.itemRate}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={`${styles.itemStar} ${n <= mine ? styles.itemStarOn : ''}`}
              onClick={() => pick(n)} aria-label={interp(t.ratingStars, { n })} aria-pressed={n === mine}>★</button>
          ))}
        </span>
      )}
    </span>
  )
}

// Average (read-only), the latest written reviews, and — for anyone but the
// poster — a 1–5 picker showing their own rating, plus an optional short
// comment once they've picked stars.
function Stars({ postId, ratings, canPick, askLabel }) {
  const { t } = useLangContext()
  const { requireSignIn, isAdmin } = useAuthContext()
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

  // Admin: delete one review (its stars go too — a rating is one doc).
  function removeReview(r) {
    if (!window.confirm(interp(t.reviewDeleteConfirm, { name: r.name || t.adminNoName }))) return
    ratings.remove(r.id).catch(failed)
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
              {isAdmin && (
                <>{' '}<button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={() => removeReview(r)}>🛡️ {t.delete}</button></>
              )}
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
export default function PostCard({ kind, collectionName, post, ratings, onEdit, compact = false, onOpen, badge }) {
  const { t, lang } = useLangContext()
  const { user, isAdmin, requireSignIn } = useAuthContext()
  const isOwner = !!user && user.uid === post.ownerUid
  const isShop = kind === 'shop'
  const cats = useCategoriesContext()
  // Admins can remove categories; a post's removed ones just aren't shown.
  const tags = ((isShop ? post.categories : post.trades) || []).filter((c) => cats.label(kind, c))
  const tagLabel = (c) => cats.label(kind, c)
  const photos = post.photos || []
  const items = post.items || []
  const [shown, setShown] = useState(0) // index of the photo scrolled into view
  const [zoomed, setZoomed] = useState(null)
  const [reporting, setReporting] = useState(false)

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
    const tagText = tags.map((c) => tagLabel(c)).join(', ')
    shareToLine(`🏘️ ${t.appName}\n${post.name}${tagText ? ' — ' + tagText : ''}\n${postUrl(post.id)}`)
  }

  // "Still open": an empty update just sets updatedAt (usePosts.updatePost).
  function bump() {
    updatePost(collectionName, post.id, {}).catch((e) => {
      console.error('[village] bump failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  // Call / LINE / IG taps count toward the owner's weekly stats.
  const tap = (field) => track(post.id, field, user, post.ownerUid)
  const week = useWeekStats(post.id, isOwner)
  const weekLine = week && interp(t.statsWeek, { open: week.open, taps: week.call + week.line + week.ig })

  // ♥ save for later (needs an account, so it follows them across devices).
  const favs = useFavoritesContext()
  const saved = favs.has(post.id)
  const heartBtn = (cls) => (
    <button
      type="button"
      className={`${cls} ${saved ? styles.heartOn : ''}`}
      aria-pressed={saved}
      aria-label={saved ? t.favRemove : t.favAdd}
      onClick={() => requireSignIn() && favs.toggle(post.id).catch((e) => {
        console.error('[village] favourite failed:', e?.code)
        alert(t.saveFailed)
      })}
    >
      <Icon name="heart" size={16} filled={saved} />
    </button>
  )

  // Handyman "busy right now" switch; missing counts as available.
  function toggleAvailable() {
    updatePost(collectionName, post.id, { available: post.available === false }).catch((e) => {
      console.error('[village] availability failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  function toggleSold(i) {
    const next = withItemIds(items).map((it, j) => (j === i ? { ...it, sold: !it.sold } : it))
    updatePost(collectionName, post.id, { items: next }).catch((e) => {
      console.error('[village] sold toggle failed:', e?.code)
      alert(t.saveFailed)
    })
  }

  // Board / home view: a short list row — square photo on the left, the key
  // facts on the right — so several posts fit on a phone screen. Tapping
  // anywhere but a button opens the full page (shop items, handyman reviews).
  if (compact) {
    const rating = ratings.get(post.id)
    const cover = photos[0] || items.find((it) => it.photo)?.photo
    const forSale = items.filter((it) => !it.sold).length
    const open = (e) => { if (!e.target.closest('a, button')) onOpen(post) }
    return (
      <article
        className={`${styles.card} ${styles.rowCard}`}
        id={'post-' + post.id}
        onClick={open}
        onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onOpen(post)}
        role="link"
        tabIndex={0}
        aria-label={interp(t.shopOpen, { name: post.name })}
      >
        <div className={styles.rowThumb}>
          {cover ? <img src={cover} alt="" loading="lazy" /> : <span>{isShop ? '🛍️' : '🔧'}</span>}
        </div>
        <div className={styles.rowBody}>
          <h3 className={styles.rowTitle}>{post.name}</h3>
          <div className={styles.rowBadges}>
            <ResidencyBadge isResident={post.isResident} />
            {post.isResident && post.verified && <span className={`${styles.badge} ${styles.badgeVerified}`} title={t.verified} aria-label={t.verified}><Icon name="verified" size={13} strokeWidth={2.2} /></span>}
            {!isShop && post.available === false && <span className={`${styles.badge} ${styles.badgeBusy}`}><Icon name="pause" size={12} />{t.busy}</span>}
            {tags.slice(0, 2).map((c) => <span key={c} className={styles.tag}>{tagLabel(c)}</span>)}
            {tags.length > 2 && <span className={styles.tag}>+{tags.length - 2}</span>}
          </div>
          <div className={styles.rowMeta}>
            {badge && <span className={styles.newBadge}>{badge}</span>}
            {isShop && items.some(isOnSale) && <span className={styles.saleTag}>🏷️ {t.onSale}</span>}
            {isShop && !items.some(isOnSale) && items.some(isNewItem) && <span className={styles.newTag}>🆕 {t.itemNew}</span>}
            {rating.count > 0 && (
              <span className={styles.rowRating}><Icon name="star" size={13} filled className={styles.starIcon} />{rating.avg.toFixed(1)} <small>({rating.count})</small></span>
            )}
            {isShop && (
              <span>
                {interp(t.shopItemCount, { n: items.length })}
                {forSale < items.length && <> · {interp(t.shopForSale, { n: forSale })}</>}
              </span>
            )}
            {!isShop && rating.count === 0 && <span>{t.ratingNone}</span>}
            {isShop && (post.delivery || []).includes('deliver') && <span>🚚 {t.deliveryShort}</span>}
          </div>
          <div className={styles.rowActions}>
            {post.phone && (
              <a className={styles.rowBtn} href={'tel:' + post.phone.replace(/[^\d+]/g, '')} onClick={() => tap('call')} aria-label={t.call + ' ' + post.phone}><Icon name="phone" />{t.call}</a>
            )}
            {post.line && (
              <a className={`${styles.rowBtn} ${styles.lineBtn}`} href={lineUrl(post.line)} onClick={() => tap('line')} target="_blank" rel="noopener noreferrer"><Icon name="chat" filled />{t.line}</a>
            )}
            {post.instagram && (
              <a className={`${styles.rowBtn} ${styles.igBtn}`} href={igUrl(post.instagram)} onClick={() => tap('ig')} target="_blank" rel="noopener noreferrer"><Icon name="instagram" />IG</a>
            )}
            {!isOwner && heartBtn(`${styles.rowBtn} ${styles.iconBtn}`)}
            <span className={styles.seeAll}>{isShop ? t.shopSeeAll : t.seeDetails}<Icon name="chevron" size={14} strokeWidth={2.4} /></span>
          </div>
          {isOwner && isStale(post) && <span className={styles.staleBadge}>{t.staleShort}</span>}
          {weekLine && <span className={styles.ownerStats}>📊 {weekLine}</span>}
          {isShop && isOwner && (
            <span className={styles.ownerNote}>
              {t.yourShop} ·{' '}
              <button type="button" className={styles.linkBtn} onClick={() => onEdit(post, { addItem: true })}>{t.fAddItem}</button>
            </span>
          )}
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
          {post.isResident && post.verified && <span className={`${styles.badge} ${styles.badgeVerified}`}><Icon name="verified" size={13} strokeWidth={2.2} />{t.verified}</span>}
          {!isShop && post.available === false && <span className={`${styles.badge} ${styles.badgeBusy}`}><Icon name="pause" size={12} />{t.busy}</span>}
          {tags.map((c) => <span key={c} className={styles.tag}>{tagLabel(c)}</span>)}
        </div>

        <h3 className={styles.cardTitle}>{post.name}</h3>
        {isShop && (post.delivery?.length > 0 || post.hours) && (
          <div className={styles.shopInfo}>
            {(post.delivery || []).map((d) => <span key={d} className={styles.tag}>{t['delivery_' + d]}</span>)}
            {post.hours && <span className={styles.hoursText}>⏰ {post.hours}</span>}
          </div>
        )}
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
                <span className={styles.itemName}>
                  {it.name}
                  {isNewItem(it) && <span className={styles.newTag}>🆕 {t.itemNew}</span>}
                  <ItemStars postId={post.id} item={it} ratings={ratings} canPick={!isOwner && !it.sold} />
                </span>
                <span className={styles.itemPrice}>
                  {!it.sold && isOnSale(it) && <><s className={styles.oldPrice}>{formatPrice(it.oldPrice, t, lang)}</s>{' '}</>}
                  {it.sold ? t.sold : formatPrice(it.price, t, lang)}
                  {!it.sold && isOnSale(it) && <span className={styles.saleTag}>-{salePercent(it)}%</span>}
                </span>
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
        {/* Owners often don't find Edit → + Add item, so offer it right here. */}
        {isShop && isOwner && (
          <div className={styles.addItemBox}>
            {items.length < 3 && <p className={styles.hint}>{t.addItemNudge}</p>}
            <button type="button" className={styles.primaryBtn} onClick={() => onEdit(post, { addItem: true })}>{t.fAddItem}</button>
          </div>
        )}

        <div className={styles.actions}>
          {post.phone && (
            <a className={styles.contactBtn} href={'tel:' + post.phone.replace(/[^\d+]/g, '')} onClick={() => tap('call')}>
              <Icon name="phone" size={16} />{t.call} {post.phone}
            </a>
          )}
          {post.line && (
            <a className={`${styles.contactBtn} ${styles.lineBtn}`} href={lineUrl(post.line)} onClick={() => tap('line')} target="_blank" rel="noopener noreferrer">
              <Icon name="chat" size={16} filled />{t.line}
            </a>
          )}
          {post.instagram && (
            <a className={`${styles.contactBtn} ${styles.igBtn}`} href={igUrl(post.instagram)} onClick={() => tap('ig')} target="_blank" rel="noopener noreferrer">
              <Icon name="instagram" size={16} />@{post.instagram}
            </a>
          )}
          <button type="button" className={styles.contactBtn} onClick={handleShare}><Icon name="share" size={16} />{t.shareLine}</button>
          {!isOwner && heartBtn(`${styles.contactBtn} ${styles.iconBtn}`)}
        </div>

        <span className={styles.meta}>🕒 {updatedLabel(post, t, lang)}</span>
        {week && <span className={styles.meta}>📊 {interp(t.statsWeekFull, week)}</span>}

        {isOwner && isStale(post) && (
          <div className={styles.staleNote}>
            <span>{interp(t.staleNote, { n: STALE_DAYS })}</span>
            <button type="button" className={styles.secondaryBtn} onClick={bump}>✓ {t.stillOpen}</button>
          </div>
        )}

        {!isOwner && (
          <button type="button" className={`${styles.linkBtn} ${styles.reportLink}`} onClick={() => requireSignIn() && setReporting(true)}>
            🚩 {t.reportPost}
          </button>
        )}
        {reporting && user && (
          <ReportSheet post={post} collectionName={collectionName} user={user} onClose={() => setReporting(false)} />
        )}

        {(isOwner || isAdmin) && (
          <div className={styles.ownerActions}>
            {isOwner && <button type="button" className={styles.linkBtn} onClick={() => onEdit(post)}>{t.edit}</button>}
            {!isShop && isOwner && (
              <button type="button" className={styles.linkBtn} onClick={toggleAvailable}>
                {post.available === false ? t.setAvailable : t.setBusy}
              </button>
            )}
            <button type="button" className={`${styles.linkBtn} ${styles.dangerLink}`} onClick={handleDelete}>
              {isOwner ? t.delete : '🛡️ ' + t.delete}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
