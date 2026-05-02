import { useState } from 'react'
import styles from './ExtrasSection.module.css'
export default function ExtrasSection({ vatEnabled, onVatChange, serviceChargeEnabled, onServiceChargeChange, promptPay, onPromptPayChange, bankInfo, onBankInfoChange, notes, onNotesChange }) {
  const [ppOpen, setPpOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { if (!promptPay) return; navigator.clipboard?.writeText(promptPay); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>ค่าธรรมเนียม &amp; รายละเอียด</h2>
      <div className={styles.toggles}>
        <label className={styles.toggle}><input type="checkbox" checked={vatEnabled} onChange={e => onVatChange(e.target.checked)} /><span>VAT</span><span className={`${styles.badge} ${styles.badgeBlue}`}>7%</span></label>
        <label className={styles.toggle}><input type="checkbox" checked={serviceChargeEnabled} onChange={e => onServiceChargeChange(e.target.checked)} /><span>Service Charge</span><span className={`${styles.badge} ${styles.badgeGreen}`}>10%</span></label>
      </div>
      <div className={styles.divider} />
      <div className={styles.ppHeader}><span className={styles.ppLabel}>PromptPay</span><button className={styles.toggleBtn} onClick={() => setPpOpen(o => !o)}>{ppOpen ? 'ปิด' : 'แก้ไข'}</button></div>
      {ppOpen && <input type="text" placeholder="เบอร์โทร หรือ เลขบัตรประชาชน" value={promptPay} onChange={e => onPromptPayChange(e.target.value)} className={styles.ppInput} />}
      {promptPay && !ppOpen && <div className={styles.ppDisplay}><span className={styles.ppNumber}>{promptPay}</span><button className={styles.copyBtn} onClick={handleCopy}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}</button></div>}
      {!promptPay && !ppOpen && <p className={styles.ppEmpty}>ยังไม่ได้ตั้งค่า</p>}
      <div className={styles.divider} />
      <label className={styles.fieldLabel}>ข้อมูลธนาคาร</label>
      <textarea className={styles.textarea} rows={3} placeholder={'เช่น\nธนาคาร ABC\nเลขที่บัญชี 111-111111-1\nนายสุขใจ ใจดี'} value={bankInfo} onChange={e => onBankInfoChange(e.target.value)} />
      <label className={styles.fieldLabel} style={{ marginTop: 10 }}>โน้ต</label>
      <textarea className={styles.textarea} rows={2} placeholder="หมายเหตุ" value={notes} onChange={e => onNotesChange(e.target.value)} />
    </section>
  )
}
