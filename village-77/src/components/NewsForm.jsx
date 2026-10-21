import { useRef, useState } from 'react'
import { useLangContext, interp, NEWS_KINDS } from '../LangContext'
import { createPost, updatePost } from '../hooks/usePosts'
import { uploadPhoto, deletePhotos } from '../photo'
import styles from './ui.module.css'

const MAX_PHOTOS = 4

// Add / edit a village news post (villageNews). Field names mirror
// firestore.rules — keep them in sync.
export default function NewsForm({ post, user, onClose }) {
  const { t } = useLangContext()
  const [f, setF] = useState(() => ({
    kind: post?.kind || NEWS_KINDS[0],
    title: post?.title || '',
    body: post?.body || '',
    photos: post?.photos || [],
  }))
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const uploaded = useRef([]) // see PostForm: lets unsaved uploads be deleted

  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }))

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - f.photos.length)
    e.target.value = ''
    if (!files.length) return
    setProcessing(true)
    setError('')
    for (const file of files) {
      try {
        const url = await uploadPhoto(file)
        uploaded.current.push(url)
        setF((prev) => (prev.photos.length < MAX_PHOTOS ? { ...prev, photos: [...prev.photos, url] } : prev))
      } catch {
        setError(t.photoFailed)
      }
    }
    setProcessing(false)
  }

  function cancel() {
    const kept = post?.photos || []
    deletePhotos(uploaded.current.filter((u) => !kept.includes(u)))
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = {
      kind: f.kind,
      title: f.title.trim(),
      body: f.body.trim(),
      photos: f.photos,
      authorName: (user.displayName || '').slice(0, 80),
    }
    setSaving(true)
    setError('')
    try {
      if (post) await updatePost('villageNews', post.id, data)
      else await createPost('villageNews', user, data)
      deletePhotos([...(post?.photos || []), ...uploaded.current].filter((u) => !data.photos.includes(u)))
      onClose()
    } catch (err) {
      console.error('[village] news save failed:', err?.code, err)
      setError(t.saveFailed)
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && !saving && cancel()}>
      <form className={styles.sheet} onSubmit={handleSubmit}>
        <h2 className={styles.sheetTitle}>{post ? t.newsEdit : t.newsAdd.replace(/^\+\s*/, '')}</h2>

        <div className={styles.field}>
          <span>{t.newsKind}</span>
          <div className={styles.chipsWrap}>
            {NEWS_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={f.kind === k}
                className={`${styles.chip} ${f.kind === k ? styles.chipActive : ''}`}
                onClick={() => setF((prev) => ({ ...prev, kind: k }))}
              >
                {t['news_' + k]}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span>{t.newsTitle} *</span>
          <input required maxLength={120} value={f.title} onChange={set('title')} placeholder={t.newsTitlePh} />
        </label>

        <label className={styles.field}>
          <span>{t.newsBody}</span>
          <textarea rows={5} maxLength={2000} value={f.body} onChange={set('body')} placeholder={t.newsBodyPh} />
        </label>

        <div className={styles.field}>
          <span>{interp(t.fPhotos, { n: f.photos.length, max: MAX_PHOTOS })}</span>
          <div className={styles.thumbs}>
            {f.photos.map((url, i) => (
              <div key={url} className={styles.thumb}>
                <img src={url} alt="" />
                <button
                  type="button"
                  className={styles.thumbRemove}
                  onClick={() => setF((prev) => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}
                  aria-label={t.fPhotoRemove}
                >×</button>
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

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.sheetActions}>
          <button type="button" className={styles.secondaryBtn} onClick={cancel} disabled={saving}>{t.cancel}</button>
          <button type="submit" className={styles.primaryBtn} disabled={saving || processing}>{saving ? t.saving : t.save}</button>
        </div>
      </form>
    </div>
  )
}
