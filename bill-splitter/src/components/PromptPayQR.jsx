import { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { buildPromptPayPayload } from '../promptpay'
import styles from './PromptPayQR.module.css'

/**
 * Renders a PromptPay QR for a single person.
 * Returns null if the PromptPay id is invalid (or empty).
 *
 * @param {string} promptPay  - the PromptPay number
 * @param {number} amount     - the amount in THB (0/undefined → static QR)
 * @param {number} [size]     - QR pixel size; default 132
 * @param {string} [name]     - person's name, used for the saved filename
 */
export default function PromptPayQR({ promptPay, amount, size = 132, name }) {
  const payload = buildPromptPayPayload(promptPay, amount)
  const boxRef = useRef(null)
  const [saving, setSaving] = useState(false)
  if (!payload) return null

  const handleSave = async () => {
    if (!boxRef.current || saving) return
    setSaving(true)
    try {
      const svgEl = boxRef.current.querySelector('svg')
      const xml = new XMLSerializer().serializeToString(svgEl)
      const svg64 = btoa(unescape(encodeURIComponent(xml)))
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = `data:image/svg+xml;base64,${svg64}`
      })
      const scale = 3
      const canvas = document.createElement('canvas')
      canvas.width = size * scale
      canvas.height = size * scale
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) return
      const safeName = (name || 'promptpay').replace(/[^\w\u0E00-\u0E7F-]+/g, '_')
      const file = new File([blob], `promptpay-${safeName}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch (e) {
          if (e?.name === 'AbortError') return
        }
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `promptpay-${safeName}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      // non-critical convenience feature — fail silently
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 4px' }}>
      <img
        src="https://pumbafluffycorgi.com/promptpay-logo.png"
        alt="PromptPay"
        style={{ height: 28, objectFit: 'contain', opacity: 0.9, marginBottom: 8 }}
      />
      <div className={styles.qrBox} style={{ width: size + 16, height: size + 16 }} ref={boxRef}>
        <QRCode
          value={payload}
          size={size}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={styles.saveBtn}
      >
        {saving ? '…' : '💾 Save QR'}
      </button>
    </div>
  )
}
