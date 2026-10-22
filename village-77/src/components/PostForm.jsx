import { useEffect, useRef, useState } from 'react'
import { useLangContext, interp } from '../LangContext'
import { useCategoriesContext } from '../hooks/useCategories'
import { createPost, updatePost, savePrivateAddress, deletePrivateAddress, loadPrivateAddress, postsLeftToday, DAILY_POST_LIMIT, newItemId, withItemIds, hasHouseNumber } from '../hooks/usePosts'
import { useAuthContext } from '../hooks/useAuth'
import { uploadPhoto, PHOTO_ITEM, photosOf, deletePhotos } from '../photo'
import { igHandle } from '../share'
import Icon from './Icon'
import styles from './ui.module.css'

const MAX_ITEMS = 30
const MAX_TAGS = 10
export const DELIVERY = ['deliver', 'pickup'] // how buyers get things from a shop
// _k: a key for React while editing (not saved), so rows keep their inputs when moved.
const emptyItem = () => ({ _k: newItemId(), name: '', price: '', oldPrice: '', promo: false, photo: null, sold: false })

// Add / edit form for a marketplace shop (one seller + the items they sell)
// or a handyman. `post` is null when adding. Field names mirror
// firestore.rules (villageShops / villageProviders) — keep them in sync.
export default function PostForm({ kind, collectionName, post, user, onClose, startWithNewItem = false }) {
  const { t } = useLangContext()
  const cats = useCategoriesContext()
  const { isAdmin } = useAuthContext()
  // New posts only: everyone but admins gets DAILY_POST_LIMIT a day.
  const [limitReached, setLimitReached] = useState(false)
  useEffect(() => {
    if (post || isAdmin) return
    postsLeftToday(user).then((left) => setLimitReached(left <= 0))
  }, [post, isAdmin, user])
  const isShop = kind === 'shop'
  const maxPhotos = 4
  const [f, setF] = useState(() => ({
    name: post?.name || '',
    tags: (isShop ? post?.categories : post?.trades) || [],
    description: post?.description || '',
    phone: post?.phone || '',
    line: post?.line || '',
    instagram: post?.instagram || '',
    delivery: post?.delivery || [],
    hours: post?.hours || '',
    address: '',
    photos: post?.photos || [],
    items: post?.items?.length
      ? [...withItemIds(post.items).map((it) => ({ ...it, _k: it.id, price: it.price ?? '', oldPrice: it.oldPrice ?? '', promo: it.oldPrice != null, addedAt: it.addedAt ?? 0 })), ...(startWithNewItem ? [emptyItem()] : [])]
      : [emptyItem()],
    isResident: post ? !!post.isResident : true,
  }))
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  // Photos uploaded while this form is open, so the ones that never get
  // saved (removed again, or the form cancelled) can be deleted.
  const uploaded = useRef([])
  const createdId = useRef(null)
  // Editing a villager's post: load their saved house no. into the form.
  const [addressLoading, setAddressLoading] = useState(() => !!post?.isResident)
  const savedAddress = useRef('') // as loaded, to spot a change on save
  useEffect(() => {
    if (!post?.isResident) return
    let cancelled = false
    loadPrivateAddress(post.id).then((address) => {
      if (cancelled) return
      savedAddress.current = address
      setF((prev) => (prev.address ? prev : { ...prev, address }))
      setAddressLoading(false)
    })
    return () => { cancelled = true }
  }, [post])

  // Opened from "+ Add item": jump straight to the new, empty item.
  const lastItemName = useRef(null)
  useEffect(() => {
    if (!startWithNewItem || !lastItemName.current) return
    lastItemName.current.scrollIntoView({ block: 'center' })
    lastItemName.current.focus({ preventScroll: true })
  }, [startWithNewItem])
  const savedPhotos = useRef([]) // photos of the last successful write

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((prev) => ({ ...prev, [key]: v }))
  }

  const toggleTag = (c) => setF((prev) => ({
    ...prev,
    tags: prev.tags.includes(c) ? prev.tags.filter((x) => x !== c)
      : prev.tags.length >= MAX_TAGS ? prev.tags // firestore.rules allows 10 per post
      : [...prev.tags, c],
  }))

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []).slice(0, maxPhotos - f.photos.length)
    e.target.value = ''
    if (!files.length) return
    setProcessing(true)
    setError('')
    let failed = false
    for (const file of files) {
      try {
        const url = await uploadPhoto(file)
        uploaded.current.push(url)
        setF((prev) => prev.photos.length < maxPhotos ? { ...prev, photos: [...prev.photos, url] } : prev)
      } catch {
        failed = true
      }
    }
    if (failed) setError(t.photoFailed)
    setProcessing(false)
  }

  const removePhoto = (i) => setF((prev) => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))

  // ── Items (shops only) ──
  const setItem = (i, patch) =>
    setF((prev) => ({ ...prev, items: prev.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }))
  const addItem = () => setF((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))
  const removeItem = (i) => setF((prev) => ({ ...prev, items: prev.items.filter((_, j) => j !== i) }))
  // Move an item up (-1) or down (+1), so owners can put their best ones first.
  const moveItem = (i, dir) => setF((prev) => {
    const items = prev.items.slice()
    const j = i + dir
    if (j < 0 || j >= items.length) return prev
    ;[items[i], items[j]] = [items[j], items[i]]
    return { ...prev, items }
  })

  async function handleItemPhoto(i, e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      const url = await uploadPhoto(file, PHOTO_ITEM)
      uploaded.current.push(url)
      setItem(i, { photo: url })
    } catch {
      setError(t.photoFailed)
    }
    setProcessing(false)
  }

  // Closing without saving: drop only the photos uploaded just now.
  function cancel() {
    // A post already created by a half-failed save keeps the photos it saved.
    const kept = [...photosOf(post), ...savedPhotos.current]
    deletePhotos(uploaded.current.filter((u) => !kept.includes(u)))
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Drop categories an admin has removed since this post was made.
    const knownTags = f.tags.filter((c) => cats.label(kind, c))
    if (!knownTags.length) {
      setError(t.fTagsRequired)
      return
    }
    // Villagers must give a house no. — it's what admins check them against.
    if (f.isResident && !hasHouseNumber(f.address)) {
      setError(t.fAddressRequired)
      return
    }
    if (!f.phone.trim() && !f.line.trim() && !igHandle(f.instagram)) {
      setError(t.fContactRequired)
      return
    }
    const data = {
      name: f.name.trim(),
      description: f.description.trim(),
      phone: f.phone.trim(),
      line: f.line.trim(),
      instagram: igHandle(f.instagram),
      photos: f.photos,
      isResident: f.isResident,
    }
    // "On sale" needs a price now and a higher "was" price, or it can't show.
    const badSale = isShop && f.items.find((it) => it.name.trim() && it.promo
      && (it.price === '' || it.oldPrice === '' || Number(it.oldPrice) <= Number(it.price)))
    if (badSale) {
      setError(interp(t.fOldPriceInvalid, { name: badSale.name.trim() }))
      return
    }
    if (isShop) {
      const items = f.items
        .filter((it) => it.name.trim())
        .map((it) => {
          const price = it.price === '' ? null : Math.max(0, Math.round(Number(it.price)))
          const oldPrice = it.oldPrice === '' ? null : Math.round(Number(it.oldPrice))
          return {
            id: it.id || newItemId(),
            name: it.name.trim(),
            price,
            photo: it.photo || null,
            sold: !!it.sold,
            // On sale: the "was" price, only when it's above the price now.
            ...(it.promo && price !== null && oldPrice > price ? { oldPrice } : {}),
            // When the item was first added (ms), for the "new" tag.
            addedAt: it.addedAt ?? Date.now(), // 0 = added before dates were kept
          }
        })
      if (!items.length) {
        setError(t.fItemsRequired)
        return
      }
      data.categories = knownTags
      data.delivery = f.delivery.filter((d) => DELIVERY.includes(d))
      data.hours = f.hours.trim().slice(0, 80)
      data.items = items
    } else {
      data.trades = knownTags
      data.available = post?.available ?? true // switched from the card, not here
    }

    setSaving(true)
    setError('')
    try {
      // createdId: if a new post was created but a later step failed, a
      // retry updates that post instead of creating a duplicate.
      // A verified villager changing their house no. (or becoming a villager)
      // needs checking again: drop the badge, back to the admins' to-check list.
      if (post?.verified && f.isResident && (!post.isResident || f.address.trim() !== savedAddress.current)) {
        data.verified = false
      }
      let id = post?.id || createdId.current
      if (id) await updatePost(collectionName, id, data)
      else id = createdId.current = (await createPost(collectionName, user, data, { quota: !isAdmin })).id
      savedPhotos.current = photosOf(data)
      const address = f.address.trim()
      if (f.isResident && address) await savePrivateAddress(id, collectionName, address)
      else if (!f.isResident && post) await deletePrivateAddress(id)
      // Photos the saved post no longer uses (replaced, removed, or uploaded
      // and then removed again before saving).
      const used = photosOf(data)
      deletePhotos([...photosOf(post), ...uploaded.current].filter((u) => !used.includes(u)))
      onClose()
    } catch (err) {
      console.error('[village] save failed:', err?.code, err)
      setError(t.saveFailed)
      setSaving(false)
    }
  }

  const heading = isShop
    ? (post ? t.editShop : t.addShop.replace(/^\+\s*/, ''))
    : (post ? t.editProvider : t.addProvider.replace(/^\+\s*/, ''))

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && !saving && cancel()}>
      <form className={styles.sheet} onSubmit={handleSubmit}>
        <h2 className={styles.sheetTitle}>{heading}</h2>

        <label className={styles.field}>
          <span>{isShop ? t.fShopName : t.fName} *</span>
          <input required maxLength={80} value={f.name} onChange={set('name')} placeholder={isShop ? t.fShopNamePh : t.fNamePh} />
        </label>

        {/* Tags: a shop can sell in several categories, a handyman can do several trades */}
        <div className={styles.field}>
          <span>{isShop ? t.fCategories : t.fTrades} *</span>
          <div className={styles.chipsWrap}>
            {cats.listFor(kind).map(({ key: c }) => (
              <button
                key={c}
                type="button"
                aria-pressed={f.tags.includes(c)}
                className={`${styles.chip} ${f.tags.includes(c) ? styles.chipActive : ''}`}
                onClick={() => toggleTag(c)}
              >
                {cats.label(kind, c)}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span>{t.fDescription}</span>
          <textarea rows={2} maxLength={1000} value={f.description} onChange={set('description')}
            placeholder={isShop ? t.fShopDescPh : t.fProviderDescPh} />
        </label>

        {isShop && (
          <div className={styles.field}>
            <span>{interp(t.fItems, { n: f.items.length, max: MAX_ITEMS })}</span>
            <div className={styles.itemRows}>
              {f.items.map((it, i) => (
                <div key={it._k || i} className={styles.itemRow}>
                  <label className={styles.itemRowPhoto} aria-label={t.fItemPhoto}>
                    {it.photo ? <img src={it.photo} alt="" /> : <Icon name="camera" size={18} />}
                    <input type="file" accept="image/*" hidden disabled={processing} onChange={(e) => handleItemPhoto(i, e)} />
                  </label>
                  <div className={styles.itemRowFields}>
                    <input ref={i === f.items.length - 1 ? lastItemName : null} maxLength={80} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder={t.fItemNamePh} />
                    <div className={styles.itemRowLine}>
                      <span className={styles.priceInput}>
                        <span aria-hidden="true">฿</span>
                        <input type="number" inputMode="numeric" min="0" max="100000000" value={it.price} aria-label={t.fPrice}
                          onChange={(e) => setItem(i, { price: e.target.value })} placeholder={t.fPricePh} />
                      </span>
                      <label className={styles.itemRowSold}>
                        <input type="checkbox" checked={!!it.sold} onChange={(e) => setItem(i, { sold: e.target.checked })} />
                        {t.sold}
                      </label>
                      <label className={styles.itemRowSold}>
                        <input type="checkbox" checked={!!it.promo} onChange={(e) => setItem(i, { promo: e.target.checked })} />
                        <Icon name="tag" size={13} inline />{t.fOnSale}
                      </label>
                    </div>
                    {it.promo && (
                      <div className={styles.itemRowLine}>
                        <span className={styles.priceInput}>
                          <span aria-hidden="true">{t.fOldPrice} ฿</span>
                          <input type="number" inputMode="numeric" min="0" max="100000000" value={it.oldPrice} aria-label={t.fOldPrice}
                            onChange={(e) => setItem(i, { oldPrice: e.target.value })} placeholder={t.fOldPricePh} />
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.itemRowSide}>
                    <button type="button" className={styles.itemRowMove} onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label={t.fItemUp}>
                      <Icon name="chevron" size={16} strokeWidth={2.4} className={styles.rotUp} />
                    </button>
                    <button type="button" className={styles.itemRowRemove} onClick={() => removeItem(i)} aria-label={t.fItemRemove}>×</button>
                    <button type="button" className={styles.itemRowMove} onClick={() => moveItem(i, 1)} disabled={i === f.items.length - 1} aria-label={t.fItemDown}>
                      <Icon name="chevron" size={16} strokeWidth={2.4} className={styles.rotDown} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <small className={styles.hint}><Icon name="bulb" size={13} inline />{t.fPriceHint}</small>
            {f.items.length < MAX_ITEMS && (
              <button type="button" className={styles.secondaryBtn} onClick={addItem}>{t.fAddItem}</button>
            )}
          </div>
        )}

        {isShop && (
          <div className={styles.field}>
            <span>{t.fDelivery}</span>
            <div className={styles.chipsWrap}>
              {DELIVERY.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={f.delivery.includes(d)}
                  className={`${styles.chip} ${f.delivery.includes(d) ? styles.chipActive : ''}`}
                  onClick={() => setF((prev) => ({ ...prev, delivery: prev.delivery.includes(d) ? prev.delivery.filter((x) => x !== d) : [...prev.delivery, d] }))}
                >
                  {t['delivery_' + d]}
                </button>
              ))}
            </div>
          </div>
        )}
        {isShop && (
          <label className={styles.field}>
            <span>{t.fHours}</span>
            <input maxLength={80} value={f.hours} onChange={set('hours')} placeholder={t.fHoursPh} />
          </label>
        )}

        {/* The point of the app: is this person one of us or from outside? */}
        <label className={styles.residentBox}>
          <input type="checkbox" checked={f.isResident} onChange={set('isResident')} />
          <span>
            <strong><Icon name="home" size={15} inline />{isShop ? t.fResidentSeller : t.fResidentProvider}</strong>
            <small>{t.fResidentHint}</small>
            <small className={styles.residentCheck}><Icon name="search" size={13} inline />{t.residentCheckNotice}</small>
          </span>
        </label>

        {/* Villagers only, and required: admins check villagers against it.
            Saved to villagePrivate (admins + this poster only), never on the
            public post; when editing, the saved one is loaded back in. */}
        {f.isResident && (
          <label className={styles.field}>
            <span>{t.fAddress} *</span>
            <input required maxLength={120} value={f.address} onChange={set('address')}
              placeholder={addressLoading ? t.loading : t.fAddressPh} disabled={addressLoading} />
            <small className={styles.privateNote}><Icon name="lock" size={13} inline />{t.fAddressPrivate}</small>
          </label>
        )}

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span>{t.fPhone}</span>
            <input type="tel" inputMode="tel" maxLength={30} value={f.phone} onChange={set('phone')} placeholder="08x-xxx-xxxx" />
          </label>
          <label className={styles.field}>
            <span>{t.fLine}</span>
            <input maxLength={50} value={f.line} onChange={set('line')} />
          </label>
        </div>
        <label className={styles.field}>
          <span>{t.fInstagram}</span>
          <input maxLength={60} value={f.instagram} onChange={set('instagram')} placeholder="@yourshop" autoCapitalize="none" autoCorrect="off" />
        </label>

        <div className={styles.field}>
          <span>{interp(isShop ? t.fShopPhotos : t.fPhotos, { n: f.photos.length, max: maxPhotos })}</span>
          <div className={styles.thumbs}>
            {f.photos.map((url, i) => (
              <div key={i} className={styles.thumb}>
                <img src={url} alt="" />
                <button type="button" className={styles.thumbRemove} onClick={() => removePhoto(i)} aria-label={t.fPhotoRemove}>×</button>
              </div>
            ))}
            {/* No `multiple`: with it, Android Chrome jumps straight to the
                Files app; without it, it offers Photos / Gallery. Camera is
                its own button (capture) so it's one tap. */}
            {f.photos.length < maxPhotos && (
              <>
                <label className={`${styles.thumb} ${styles.thumbAdd}`}>
                  {processing ? '…' : <><Icon name="image" size={20} /><small>{t.fFromGallery}</small></>}
                  <input type="file" accept="image/*" hidden disabled={processing} onChange={handlePhotos} />
                </label>
                <label className={`${styles.thumb} ${styles.thumbAdd}`}>
                  {processing ? '…' : <><Icon name="camera" size={20} /><small>{t.fTakePhoto}</small></>}
                  <input type="file" accept="image/*" capture="environment" hidden disabled={processing} onChange={handlePhotos} />
                </label>
              </>
            )}
          </div>
        </div>

        {limitReached && <p className={styles.error}>{interp(t.dailyLimit, { n: DAILY_POST_LIMIT })}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={cancel} disabled={saving}>{t.cancel}</button>
          <button type="submit" className={styles.primaryBtn} disabled={saving || processing || limitReached || addressLoading}>{saving ? t.saving : t.save}</button>
        </div>
      </form>
    </div>
  )
}
