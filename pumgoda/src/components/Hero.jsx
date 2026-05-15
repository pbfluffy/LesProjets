import { useRef } from 'react'
import './Hero.css'
import { useUserPet } from '../hooks/useUserPet'

const DEFAULT_MASCOT = `${import.meta.env.BASE_URL}pumba.png`
const MAX_DIM = 240
const JPEG_QUALITY = 0.85

export default function Hero({ tagline, subtitle, dogBadge, photoLabels, pumbaActive, onPumbaToggle, pumbaLabel }) {
  const { petPhoto, setPetPhoto, clearPetPhoto, isCustom } = useUserPet()
  const fileInputRef = useRef(null)

  const src = isCustom ? petPhoto : DEFAULT_MASCOT

  const openPicker = () => fileInputRef.current?.click()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    try {
      const dataUrl = await resizeToJpeg(file, MAX_DIM, JPEG_QUALITY)
      setPetPhoto(dataUrl)
    } catch (err) {
      console.warn('[Hero] could not process pet photo:', err)
    }
  }

  const labels = photoLabels || { add: '', change: '', remove: '' }

  return (
    <section className="ph-hero">
      <div className="ph-mascot-slot">
        <button
          type="button"
          className={`ph-mascot-wrap ${isCustom ? 'is-custom' : ''}`}
          onClick={openPicker}
          aria-label={isCustom ? labels.change : labels.add}
        >
          <img src={src} alt="" />
          <span className="ph-mascot-edit" aria-hidden="true">📷</span>
        </button>
        {isCustom && (
          <button
            type="button"
            className="ph-mascot-remove"
            onClick={clearPetPhoto}
            aria-label={labels.remove}
            title={labels.remove}
          >
            ×
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </div>
      <div className="ph-hero-text">
        <h1 className="ph-hero-title">{tagline}</h1>
        <p className="ph-hero-sub">{subtitle}</p>
        <span className="ph-dog-badge mono">{dogBadge}</span>
        {onPumbaToggle && (
          <button
            type="button"
            className={`ph-pumba-badge ${pumbaActive ? 'is-active' : ''}`}
            onClick={onPumbaToggle}
            aria-pressed={pumbaActive}
          >
            <img src={DEFAULT_MASCOT} alt="" />
            {pumbaLabel}
          </button>
        )}
      </div>
    </section>
  )
}

// Client-side resize: loads the file, draws it onto a canvas scaled to fit
// within MAX_DIM, returns a JPEG data URL. Output ~15-30 KB for typical photos.
function resizeToJpeg(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image'))
    }
    img.src = objectUrl
  })
}
