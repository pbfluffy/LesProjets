import { useEffect, useState } from 'react'
import { useLang } from '../LangContext'
import { parseBankTarget, encodeBankTarget } from '../promptpay'
import BankPicker from './BankPicker'
import styles from './ExtrasSection.module.css'

/**
 * Editor for the payee: either a PromptPay id (phone / national ID → QR) or a
 * bank account (→ copyable transfer card). Both write to the same string
 * field — bank accounts as `bank:<code>:<account>` (see promptpay.js).
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

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    onChange('')
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
              onChange={code => onChange(encodeBankTarget(code, bank?.account))}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder={t.bankAccountPh}
              value={bank?.account ?? ''}
              onChange={e => onChange(encodeBankTarget(bank?.code, e.target.value.replace(/\D/g, '').slice(0, 12)))}
              className={styles.bankAccountInput}
            />
          </div>
        </>
      )}
    </div>
  )
}
