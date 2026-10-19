import { useState } from 'react'
import { useLangContext, interp, MARKET_CATEGORIES, TRADES } from '../LangContext'
import { createPost, updatePost } from '../hooks/usePosts'
import { photoToDataUrl, PHOTO_BIG, PHOTO_SHOP, PHOTO_ITEM, MAX_DOC_CHARS } from '../photo'
import styles from './ui.module.css'

const MAX_ITEMS = 15
const emptyItem = () => ({ name: '', price: '', photo: null, sold: false })

// Add / edit form for a marketplace shop (one seller + the items they sell)
// or a handyman. `post` is null when adding. Field names mirror
// firestore.rules (villageShops / villageProviders) — keep them in sync.
export default function PostForm({ kind, collectionName, post, onCreated, onClose }) {
  const { t } = useLangContext()
  const isShop = kind === 'shop'
  const maxPhotos = isShop ? 2 : 4
  const [f, setF] = useState(() => ({
    name: post?.name || '',
    category: post?.category || MARKET_CATEGORIES[0],
    trade: post?.trade || TRADES[0],
    description: post?.description || '',
    phone: post?.phone || '',
    line: post?.line || '',
    address: post?.address || '',
    photos: post?.photos || [],
    items: post?.items?.length
      ? post.items.map((it) => ({ ...it, price: it.price ?? '' }))
      : [emptyItem()],
    isResident: post ? !!post.isResident : true,
  }))
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((prev) => ({ ...prev, [key]: v }))
  }

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []).slice(0, maxPhotos - f.photos.length)
    e.target.value = ''
    if (!files.length) return
    setProcessing(true)
    setError('')
    let failed = false
    for (const file of files) {
      try {
        const url = await photoToDataUrl(file, isShop ? PHOTO_SHOP : PHOTO_BIG)
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
      setItem(i, { photo: await photoToDataUrl(file, PHOTO_ITEM) })
    } catch {
      setError(t.photoFailed)
    }
    setProcessing(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!f.phone.trim() && !f.line.trim()) {
      setError(t.fContactRequired)
      return
    }
    const data = {
      name: f.name.trim(),
      description: f.description.trim(),
      phone: f.phone.trim(),
      line: f.line.trim(),
      address: f.address.trim(),
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
      data.category = f.category
      data.items = items
    } else {
      data.trade = f.trade
    }
    if (JSON.stringify(data).length > MAX_DOC_CHARS) {
      setError(t.tooManyPhotos)
      return
    }

    setSaving(true)
    setError('')
    try {
      if (post) await updatePost(collectionName, post.id, data)
      else onCreated((await createPost(collectionName, data)).id)
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
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className={styles.sheet} onSubmit={handleSubmit}>
        <h2 className={styles.sheetTitle}>{heading}</h2>

        <label className={styles.field}>
          <span>{isShop ? t.fShopName : t.fName} *</span>
          <input required maxLength={80} value={f.name} onChange={set('name')} placeholder={isShop ? t.fShopNamePh : t.fNamePh} />
        </label>

        {isShop ? (
          <label className={styles.field}>
            <span>{t.fCategory}</span>
            <select value={f.category} onChange={set('category')}>
              {MARKET_CATEGORIES.map((c) => <option key={c} value={c}>{t['cat_' + c]}</option>)}
            </select>
          </label>
        ) : (
          <label className={styles.field}>
            <span>{t.fTrade}</span>
            <select value={f.trade} onChange={set('trade')}>
              {TRADES.map((c) => <option key={c} value={c}>{t['trade_' + c]}</option>)}
            </select>
          </label>
        )}

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
          <span>{t.fAddress}</span>
          <input maxLength={120} value={f.address} onChange={set('address')} placeholder={t.fAddressPh} />
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
            {f.photos.length < maxPhotos && (
              <label className={`${styles.thumb} ${styles.thumbAdd}`}>
                {processing ? '…' : '📷 +'}
                <input type="file" accept="image/*" multiple hidden disabled={processing} onChange={handlePhotos} />
              </label>
            )}
          </div>
        </div>

        {!post && <p className={styles.hint}>{t.ownerHint}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>{t.cancel}</button>
          <button type="submit" className={styles.primaryBtn} disabled={saving || processing}>{saving ? t.saving : t.save}</button>
        </div>
      </form>
    </div>
  )
}
