import { useState } from 'react'
import { useLangContext, interp, MARKET_CATEGORIES, TRADES } from '../LangContext'
import { createPost, updatePost } from '../hooks/usePosts'
import { photoToDataUrl, MAX_PHOTOS } from '../photo'
import styles from './ui.module.css'

// Add / edit form for a marketplace listing or a handyman. `post` is null
// when adding. Field names mirror firestore.rules (villageListings /
// villageProviders) — keep them in sync.
export default function PostForm({ kind, collectionName, post, onCreated, onClose }) {
  const { t } = useLangContext()
  const isListing = kind === 'listing'
  const [f, setF] = useState(() => ({
    title: post?.title || '',
    price: post?.price ?? '',
    category: post?.category || MARKET_CATEGORIES[0],
    trade: post?.trade || TRADES[0],
    description: post?.description || '',
    name: post?.name || '',
    phone: post?.phone || '',
    line: post?.line || '',
    address: post?.address || '',
    photos: post?.photos || [],
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
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - f.photos.length)
    e.target.value = ''
    if (!files.length) return
    setProcessing(true)
    setError('')
    let failed = false
    for (const file of files) {
      try {
        const url = await photoToDataUrl(file)
        setF((prev) => prev.photos.length < MAX_PHOTOS ? { ...prev, photos: [...prev.photos, url] } : prev)
      } catch {
        failed = true
      }
    }
    if (failed) setError(t.photoFailed)
    setProcessing(false)
  }

  const removePhoto = (i) => setF((prev) => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!f.phone.trim() && !f.line.trim()) {
      setError(t.fContactRequired)
      return
    }
    const shared = {
      name: f.name.trim(),
      description: f.description.trim(),
      phone: f.phone.trim(),
      line: f.line.trim(),
      address: f.address.trim(),
      photos: f.photos,
      isResident: f.isResident,
    }
    const data = isListing
      ? {
          ...shared,
          title: f.title.trim(),
          price: f.price === '' ? null : Math.max(0, Math.round(Number(f.price))),
          category: f.category,
          sold: post?.sold || false,
        }
      : { ...shared, trade: f.trade }

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

  const heading = isListing
    ? (post ? t.editListing : t.addListing.replace(/^\+\s*/, ''))
    : (post ? t.editProvider : t.addProvider.replace(/^\+\s*/, ''))

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className={styles.sheet} onSubmit={handleSubmit}>
        <h2 className={styles.sheetTitle}>{heading}</h2>

        {isListing && (
          <label className={styles.field}>
            <span>{t.fTitle} *</span>
            <input required maxLength={120} value={f.title} onChange={set('title')} placeholder={t.fTitlePh} />
          </label>
        )}

        {!isListing && (
          <label className={styles.field}>
            <span>{t.fName} *</span>
            <input required maxLength={80} value={f.name} onChange={set('name')} placeholder={t.fNamePh} />
          </label>
        )}

        <div className={styles.fieldRow}>
          {isListing ? (
            <>
              <label className={styles.field}>
                <span>{t.fPrice}</span>
                <input type="number" inputMode="numeric" min="0" max="100000000" value={f.price} onChange={set('price')} placeholder={t.fPricePh} />
              </label>
              <label className={styles.field}>
                <span>{t.fCategory}</span>
                <select value={f.category} onChange={set('category')}>
                  {MARKET_CATEGORIES.map((c) => <option key={c} value={c}>{t['cat_' + c]}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label className={styles.field}>
              <span>{t.fTrade}</span>
              <select value={f.trade} onChange={set('trade')}>
                {TRADES.map((c) => <option key={c} value={c}>{t['trade_' + c]}</option>)}
              </select>
            </label>
          )}
        </div>

        <label className={styles.field}>
          <span>{t.fDescription}</span>
          <textarea rows={3} maxLength={1000} value={f.description} onChange={set('description')}
            placeholder={isListing ? t.fDescriptionPh : t.fProviderDescPh} />
        </label>

        {/* The point of the app: is this person one of us or from outside? */}
        <label className={styles.residentBox}>
          <input type="checkbox" checked={f.isResident} onChange={set('isResident')} />
          <span>
            <strong>🏡 {isListing ? t.fResidentSeller : t.fResidentProvider}</strong>
            <small>{t.fResidentHint}</small>
          </span>
        </label>

        {isListing && (
          <label className={styles.field}>
            <span>{t.fName}</span>
            <input maxLength={80} value={f.name} onChange={set('name')} placeholder={t.fNamePh} />
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
          <span>{t.fAddress}</span>
          <input maxLength={120} value={f.address} onChange={set('address')} placeholder={t.fAddressPh} />
        </label>

        <div className={styles.field}>
          <span>{interp(t.fPhotos, { n: f.photos.length, max: MAX_PHOTOS })}</span>
          <div className={styles.thumbs}>
            {f.photos.map((url, i) => (
              <div key={i} className={styles.thumb}>
                <img src={url} alt="" />
                <button type="button" className={styles.thumbRemove} onClick={() => removePhoto(i)} aria-label={t.fPhotoRemove}>×</button>
              </div>
            ))}
            {f.photos.length < MAX_PHOTOS && (
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
