import { useEffect, useRef, useState } from 'react'
import { useLang } from '../LangContext'
import { THAI_BANKS, parseBankTarget, encodeBankTarget, parsePromptPayQr } from '../promptpay'
import { readQrImage } from '../readQrImage'
import BankPicker from './BankPicker'
import styles from './ExtrasSection.module.css'

/**
 * Editor for the payee. Two modes, both writing the same string field:
 *   - PromptPay: a phone / national ID → friends get a scan-to-pay QR.
 *   - Bank account: bank + account number (→ copyable transfer card), plus an
 *     optional QR read from a screenshot of the bank app's receive-money QR.
 *     That QR carries a bank-registered PromptPay id (e.g. K PLUS's 15-digit
 *     reference number), so with it friends get a scan-to-pay QR as well.
 *     Stored as `bank:<code>:<account>[:<qr id>]` (see promptpay.js).
 */
export default function PayTargetInput({ value, onChange }) {
  const { t } = useLang()
  const bank = parseBankTarget(value)
  // Local mode so an empty field can still sit in "bank" mode; follows the
  // value when it changes from outside (e.g. picking a saved payee).
  const [mode, setMode] = useState(bank ? 'bank' : 'pp')
  useEffect(() => {
    if (bank) setMode('bank')
    else if ((value || '').trim()) setMode('pp')
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const fileRef = useRef(null)
  const [reading, setReading] = useState(false)
  const [qrError, setQrError] = useState(null)

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    setQrError(null)
    onChange('')
  }

  const setBank = (code, account, qrId) => onChange(encodeBankTarget(code, account, qrId))

  const onQrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setReading(true)
    setQrError(null)
    const text = await readQrImage(file)
    setReading(false)
    if (!text) { setQrError(t.qrReadNotFound); return }
    const r = parsePromptPayQr(text)
    if (!r.id) { setQrError(t.qrReadNotPromptPay); return }
    // Bank-issued reference numbers start with the bank's code (K PLUS: 004…);
    // use it to pre-pick the bank if none is chosen yet.
    const guessed = r.id.length === 15 && THAI_BANKS.some(b => b.code === r.id.slice(0, 3)) ? r.id.slice(0, 3) : ''
    setBank(bank?.code || guessed, bank?.account, r.id)
  }

  return (
    <div className={styles.payTarget}>
      <div className={styles.payModeSeg} role="group" aria-label={t.payTargetLabel}>
        <button type="button" aria-pressed={mode === 'pp'} className={mode === 'pp' ? styles.payModeActive : ''} onClick={() => switchMode('pp')}>
          {t.payModePromptPay}
        </button>
        <button type="button" aria-pressed={mode === 'bank'} className={mode === 'bank' ? styles.payModeActive : ''} onClick={() => switchMode('bank')}>
          {t.payModeBank}
        </button>
      </div>
      {mode === 'pp' ? (
        <input
          type="text"
          placeholder={t.ppPlaceholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={styles.ppInput}
        />
      ) : (
        <>
          <div className={styles.bankRow}>
            <BankPicker
              value={bank?.code ?? ''}
              onChange={code => setBank(code, bank?.account, bank?.qrId)}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder={t.bankAccountPh}
              value={bank?.account ?? ''}
              onChange={e => setBank(bank?.code, e.target.value.replace(/\D/g, '').slice(0, 12), bank?.qrId)}
              className={styles.bankAccountInput}
            />
          </div>
          <div className={styles.qrRow}>
            <span className={styles.qrRowLabel}>{t.qrOptional}</span>
            {bank?.qrId ? (
              <>
                <span className={styles.qrAdded}>✅ {t.qrAdded} <span className={styles.qrRef}>{bank.qrId}</span></span>
                <button type="button" className={styles.qrRemoveBtn} onClick={() => setBank(bank.code, bank.account, '')}>{t.qrRemove}</button>
              </>
            ) : (
              <button type="button" className={styles.qrReadBtn} onClick={() => fileRef.current?.click()} disabled={reading}>
                {reading ? t.qrReading : `📷 ${t.qrAddBtn}`}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={onQrFile} hidden />
          </div>
          {qrError && <p className={styles.qrReadErr} role="status">{qrError}</p>}
          {!bank?.qrId && <p className={styles.bankNote}>{t.bankScanTip}</p>}
        </>
      )}
    </div>
  )
}
