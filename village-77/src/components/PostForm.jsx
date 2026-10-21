import { useRef, useState } from 'react'
import { useLangContext, interp, MARKET_CATEGORIES, TRADES } from '../LangContext'
import { createPost, updatePost, savePrivateAddress, deletePrivateAddress } from '../hooks/usePosts'
import { uploadPhoto, PHOTO_ITEM, photosOf, deletePhotos } from '../photo'
import styles from './ui.module.css'

const MAX_ITEMS = 30
const emptyItem = () => ({ name: '', price: '', photo: null, sold: false })

// Add / edit form for a marketplace shop (one seller + the items they sell)
// or a handyman. `post` is null when adding. Field names mirror
// firestore.rules (villageShops / villageProviders) — keep them in sync.
export default function PostForm({ kind, collectionName, post, user, onClose }) {
  const { t } = useLangContext()
  const isShop = kind === 'shop'
  const maxPhotos = 4
  const [f, setF] = useState(() => ({
    name: post?.name || '',
    tags: (isShop ? post?.categories : post?.trades) || [],
    description: post?.description || '',
    phone: post?.phone || '',
    line: post?.line || '',
    address: '',
    photos: post?.photos || [],
    items: post?.items?.length
      ? post.items.map((it) => ({ ...it, price: it.price ?? '' }))
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
  const savedPhotos = useRef([]) // photos of the last successful write

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((prev) => ({ ...prev, [key]: v }))
  }

  const toggleTag = (c) => setF((prev) => ({
    ...prev,
    tags: prev.tags.includes(c) ? prev.tags.filter((x) => x !== c) : [...prev.tags, c],
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
    if (!f.tags.length) {
      setError(t.fTagsRequired)
      return
    }
    if (!f.phone.trim() && !f.line.trim()) {
      setError(t.fContactRequired)
      return
    }
    const data = {
      name: f.name.trim(),
      description: f.description.trim(),
      phone: f.phone.trim(),
      line: f.line.trim(),
      photos: f.photos,
      isResident: f.isResident,
    }
    if (isShop) {
      const items = f.items
        .filter((it) => it.name.trim())
        .map((it) => ({
          name: it.name.trim(),
          price: it.price === '' ? null : Math.max(0, Math.round(Number(it.price))),
          photo: it.photo || null,
          sold: !!it.sold,
        }))
      if (!items.length) {
        setError(t.fItemsRequired)
        return
      }
      data.categories = f.tags
      data.items = items
    } else {
      data.trades = f.tags
    }

    setSaving(true)
    setError('')
    try {
      // createdId: if a new post was created but a later step failed, a
      // retry updates that post instead of creating a duplicate.
      let id = post?.id || createdId.current
      if (id) await updatePost(collectionName, id, data)
      else id = createdId.current = (await createPost(collectionName, user, data)).id
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
            {(isShop ? MARKET_CATEGORIES : TRADES).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={f.tags.includes(c)}
                className={`${styles.chip} ${f.tags.includes(c) ? styles.chipActive : ''}`}
                onClick={() => toggleTag(c)}
              >
                {t[(isShop ? 'cat_' : 'trade_') + c]}
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
                <div key={i} className={styles.itemRow}>
                  <label className={styles.itemRowPhoto} aria-label={t.fItemPhoto}>
                    {it.photo ? <img src={it.photo} alt="" /> : '📷'}
                    <input type="file" accept="image/*" hidden disabled={processing} onChange={(e) => handleItemPhoto(i, e)} />
                  </label>
                  <div className={styles.itemRowFields}>
                    <input maxLength={80} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder={t.fItemNamePh} />
                    <div className={styles.itemRowLine}>
                      <input type="number" inputMode="numeric" min="0" max="100000000" value={it.price}
                        onChange={(e) => setItem(i, { price: e.target.value })} placeholder={t.fPricePh} />
                      <label className={styles.itemRowSold}>
                        <input type="checkbox" checked={!!it.sold} onChange={(e) => setItem(i, { sold: e.target.checked })} />
                        {t.sold}
                      </label>
                    </div>
                  </div>
                  <button type="button" className={styles.itemRowRemove} onClick={() => removeItem(i)} aria-label={t.fItemRemove}>×</button>
                </div>
              ))}
            </div>
            {f.items.length < MAX_ITEMS && (
              <button type="button" className={styles.secondaryBtn} onClick={addItem}>{t.fAddItem}</button>
            )}
          </div>
        )}

        {/* The point of the app: is this person one of us or from outside? */}
        <label className={styles.residentBox}>
          <input type="checkbox" checked={f.isResident} onChange={set('isResident')} />
          <span>
            <strong>🏡 {isShop ? t.fResidentSeller : t.fResidentProvider}</strong>
            <small>{t.fResidentHint}</small>
            <small className={styles.residentCheck}>🔎 {t.residentCheckNotice}</small>
          </span>
        </label>

        {/* Villagers only. Saved to the admin-only villagePrivate collection,
            never on the public post — so it can't be read back here when
            editing; left blank, the saved one is kept. */}
        {f.isResident && (
          <label className={styles.field}>
            <span>{t.fAddress}</span>
            <input maxLength={120} value={f.address} onChange={set('address')}
              placeholder={post ? t.fAddressKeepPh : t.fAddressPh} />
            <small className={styles.privateNote}>🔒 {t.fAddressPrivate}</small>
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

        <div className={styles.field}>
          <span>{interp(isShop ? t.fShopPhotos : t.fPhotos, { n: f.photos.length, max: maxPhotos })}</span>
          <div className={styles.thumbs}>
            {f.photos.map((url, i) => (
              <div key={i} className={styles.thumb}>
                <img src={url} alt="" />
                <button type="button" className={styles.thumbRemove} onClick={() => removePhoto(i)} aria-label={t.fPhotoRemove}>×</button>
              </div>
            ))}
            {f.photos.length < maxPhotos && (
              <label className={`${styles.thumb} ${styles.thumbAdd}`}>
                {processing ? '…' : '📷 +'}
                <input type="file" accept="image/*" multiple hidden disabled={processing} onChange={handlePhotos} />
              </label>
            )}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={cancel} disabled={saving}>{t.cancel}</button>
          <button type="submit" className={styles.primaryBtn} disabled={saving || processing}>{saving ? t.saving : t.save}</button>
        </div>
      </form>
    </div>
  )
}
