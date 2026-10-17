import { useState } from 'react'
import { useLang } from '../LangContext'
import { THAI_BANKS, parseBankTarget, bankName } from '../promptpay'
import styles from './BankTransferCard.module.css'

function CopyField({ label, value, copyValue }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <button type="button" className={styles.copyBtn} onClick={copy} aria-label={`${t.copy} ${label}`} data-snapshot-hide>
        {copied ? t.copied : t.copy}
      </button>
    </div>
  )
}

/**
 * Stand-in for the per-person PromptPay QR when the payee is a bank account:
 * Thai banking apps can't pay a bank account from a QR, so this shows the
 * bank, account number and amount, each copyable for a manual transfer.
 *
 * @param {string} target - encoded bank target (`bank:<code>:<account>`)
 * @param {number} amount - amount in THB
 */
export default function BankTransferCard({ target, amount }) {
  const { t, lang } = useLang()
  const bank = parseBankTarget(target)
  if (!bank) return null
  const color = THAI_BANKS.find(b => b.code === bank.code)?.color
  const amt = Number(amount).toFixed(2)
  return (
    <div className={styles.card} style={{ '--bank-color': color }}>
      <div className={styles.bank}>
        <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
        {bankName(bank.code, lang)}
      </div>
      <div className={styles.fields}>
        <CopyField label={t.bankAccountPh} value={bank.account} copyValue={bank.account} />
        <CopyField label={t.transferAmount} value={`฿${Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} copyValue={amt} />
      </div>
    </div>
  )
}
