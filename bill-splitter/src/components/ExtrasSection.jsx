import { useState } from 'react'
import { useLang } from '../LangContext'
import styles from './ExtrasSection.module.css'

export default function ExtrasSection({ vatEnabled, onVatChange, serviceChargeEnabled, onServiceChargeChange, promptPay, onPromptPayChange, bankInfo, onBankInfoChange, notes, onNotesChange }) {
  const { t } = useLang()
  const [ppOpen, setPpOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { if (!promptPay) return; navigator.clipboard?.writeText(promptPay); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t.extrasTitle}</h2>
      <div className={styles.toggles}>
        <label className={styles.toggle}><input type="checkbox" checked={vatEnabled} onChange={e => onVatChange(e.target.checked)} /><span>{t.vat}</span><span className={`${styles.badge} ${styles.badgeBlue}`}>7%</span></label>
        <label className={styles.toggle}><input type="checkbox" checked={serviceChargeEnabled} onChange={e => onServiceChargeChange(e.target.checked)} /><span>{t.serviceCharge}</span><span className={`${styles.badge} ${styles.badgeGreen}`}>10%</span></label>
      </div>
      <div className={styles.divider} />
      <div className={styles.ppHeader}><span className={styles.ppLabel}>PromptPay</span><button className={styles.toggleBtn} onClick={() => setPpOpen(o => !o)}>{{ppOpen ? t.close : t.edit}}</button></div>
      {ppOpen && <input type="text" placeholder={t.ppPlaceholder} value={promptPay} onChange={e => onPromptPayChange(e.target.value)} className={styles.ppInput} />}
      {promptPay && !ppOpen && <div className={styles.ppDisplay}><span className={styles.ppNumber}>{promptPay}</span><button className={styles.copyBtn} onClick={handleCopy}>{copied ? t.copied : t.copy}</button></div>}
      {!promptPay && !ppOpen && <p className={styles.ppEmpty}>{t.notSet}</p>}
      <div className={styles.divider} />
      <label className={styles.fieldLabel}>{t.bankLabel}</label>
      <textarea className={styles.textarea} rows={3} placeholder={t.bankPlaceholder} value={bankInfo} onChange={e => onBankInfoChange(e.target.value)} />
      <label className={styles.fieldLabel} style={{ marginTop: 10 }}>{t.notesLabel}</label>
      <textarea className={styles.textarea} rows={2} placeholder={t.notesPlaceholder} value={notes} onChange={e => onNotesChange(e.target.value)} />
    </section>
  )
}
