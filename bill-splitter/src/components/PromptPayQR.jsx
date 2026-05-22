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
 */
export default function PromptPayQR({ promptPay, amount, size = 132 }) {
  const payload = buildPromptPayPayload(promptPay, amount)
  if (!payload) return null
  return (
    <div className={styles.qrWrap}>
      <div className={styles.qrBox} style={{ width: size + 16, height: size + 16 }}>
        <QRCode
          value={payload}
          size={size}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
    </div>
  )
}
