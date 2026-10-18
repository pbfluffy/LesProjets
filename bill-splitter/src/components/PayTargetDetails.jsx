import { useLang } from '../LangContext'
import { THAI_BANKS, parseBankTarget, bankName, qrIdOf } from '../promptpay'
import PromptPayQR from './PromptPayQR'
import BankTransferCard from './BankTransferCard'
import styles from './BankTransferCard.module.css'

/**
 * What one person sees to pay the payee:
 *   - PromptPay id                 → scan-to-pay QR
 *   - bank account + attached QR   → scan-to-pay QR, with "KBank 123-4-56789-0" under it
 *   - bank account only            → copyable transfer card (bank, account, amount)
 * Used by the Split Bill summary, Sushiro and Trips settle-up.
 */
export default function PayTargetDetails({ target, amount, name, reference, size, qrAmount = amount }) {
  const { lang } = useLang()
  const bank = parseBankTarget(target)
  const qrId = qrIdOf(target)

  if (bank && !qrId) return <BankTransferCard target={target} amount={amount} />
  if (!qrId) return null

  const bankLine = bank && (
    <p className={styles.qrBankLine}>
      <span className={styles.swatch} style={{ background: THAI_BANKS.find(b => b.code === bank.code)?.color }} aria-hidden="true" />
      {bankName(bank.code, lang)}{bank.account ? ` ${bank.account}` : ''}
    </p>
  )
  return <PromptPayQR promptPay={qrId} amount={qrAmount} size={size} name={name} reference={reference} caption={bankLine} />

}
