import { useState } from 'react'
import { useLang } from '../LangContext'
import styles from './ExtrasSection.module.css'

export default function ExtrasSection({
  vatEnabled, onVatChange,
  serviceChargeEnabled, onServiceChargeChange,
  serviceChargeRate, onServiceChargeRateChange,
  promptPay, onPromptPayChange,
  bankInfo, onBankInfoChange,
  notes, onNotesChange,
  savedPayees = [], onSavePayee, onRemovePayee, payeesEnabled = false,
}) {
  const { t } = useLang()
  const [ppOpen, setPpOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // #96 saved payees
  const [managing, setManaging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [payeeName, setPayeeName] = useState('')

  const ppTrim = (promptPay || '').trim()
  const alreadySaved = savedPayees.some(p => p.promptPay === ppTrim)

  const handleSavePayee = () => {
    const n = payeeName.trim()
    if (!n || !ppTrim) return
    onSavePayee?.(n, ppTrim)
    setPayeeName('')
    setSaving(false)
  }
  const cancelSave = () => { setPayeeName(''); setSaving(false) }

  const handleCopy = () => {
    if (!promptPay) return
    navigator.clipboard?.writeText(promptPay)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t.extrasTitle}</h2>
      <div className={styles.toggles}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={vatEnabled} onChange={e => onVatChange(e.target.checked)} />
          <span>{t.vat}</span>
          <span className={`${styles.badge} ${styles.badgeBlue}`}>7%</span>
        </label>
        <div className={styles.scRow}>
          <label className={styles.scLabel}>
            <input type="checkbox" checked={serviceChargeEnabled} onChange={e => onServiceChargeChange(e.target.checked)} />
            <span>{t.serviceCharge}</span>
          </label>
          <span className={styles.rateField} data-on={serviceChargeEnabled}>
            <input
              type="number"
              className={styles.rateInput}
              value={serviceChargeRate}
              min="0"
              max="100"
              step="0.5"
              inputMode="decimal"
              disabled={!serviceChargeEnabled}
              onChange={e => onServiceChargeRateChange(e.target.value)}
              onFocus={e => e.target.select()}
              aria-label={t.serviceCharge}
            />
            <span className={styles.ratePct}>%</span>
          </span>
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.ppHeader}>
        <span className={styles.ppLabel}>PromptPay</span>
        <button className={styles.toggleBtn} onClick={() => setPpOpen(o => !o)}>
          {ppOpen ? t.close : t.edit}
        </button>
      </div>
      {payeesEnabled && savedPayees.length > 0 && (
        <div className={styles.payeeBlock}>
          <div className={styles.payeeHead}>
            <span className={styles.payeeHeadLabel}>{t.savedPayees}</span>
            <button type="button" className={styles.payeeManageBtn} onClick={() => setManaging(m => !m)}>
              {managing ? t.payeeDone : t.payeeManage}
            </button>
          </div>
          <div className={styles.payeeChips}>
            {savedPayees.map(p => (
              <span key={p.id} className={styles.payeeChipWrap}>
                <button
                  type="button"
                  className={`${styles.payeeChip} ${p.promptPay === ppTrim ? styles.payeeChipActive : ''}`}
                  onClick={() => onPromptPayChange(p.promptPay)}
                  title={p.promptPay}
                >
                  {p.name}
                </button>
                {managing && (
                  <button
                    type="button"
                    className={styles.payeeRemove}
                    onClick={() => onRemovePayee?.(p.id)}
                    aria-label={t.removePayee}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      {ppOpen && (
        <input
          type="text"
          placeholder={t.ppPlaceholder}
          value={promptPay}
          onChange={e => onPromptPayChange(e.target.value)}
          className={styles.ppInput}
        />
      )}
      {promptPay && !ppOpen && (
        <div className={styles.ppDisplay}>
          <span className={styles.ppNumber}>{promptPay}</span>
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}
      {!promptPay && !ppOpen && <p className={styles.ppEmpty}>{t.notSet}</p>}
      {payeesEnabled && ppTrim && !alreadySaved && (
        saving ? (
          <div className={styles.payeeSaveForm}>
            <input
              type="text"
              className={styles.payeeNameInput}
              value={payeeName}
              onChange={e => setPayeeName(e.target.value)}
              placeholder={t.payeeNamePh}
              maxLength={30}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSavePayee()
                if (e.key === 'Escape') cancelSave()
              }}
            />
            <button type="button" className={styles.payeeSaveBtn} onClick={handleSavePayee} disabled={!payeeName.trim()}>
              {t.payeeSave}
            </button>
            <button type="button" className={styles.payeeCancelBtn} onClick={cancelSave}>
              {t.close}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.payeeSaveLink} onClick={() => setSaving(true)} title={t.savePayeeHint}>
            + {t.payeeSave}
          </button>
        )
      )}
      <div className={styles.divider} />
      <button
        type="button"
        onClick={() => setShowBank(v => !v)}
        style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }}
      >
        {t.bankLabel} <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: showBank ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </button>
      {showBank && (
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder={t.bankPlaceholder}
          value={bankInfo}
          onChange={e => onBankInfoChange(e.target.value)}
          style={{ marginTop: 6 }}
        />
      )}
      <label className={styles.fieldLabel} style={{ marginTop: 10 }}>{t.notesLabel}</label>
      <textarea
        className={styles.textarea}
        rows={2}
        placeholder={t.notesPlaceholder}
        value={notes}
        onChange={e => onNotesChange(e.target.value)}
      />
    </section>
  )
}
