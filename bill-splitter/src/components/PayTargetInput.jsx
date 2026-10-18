import { useEffect, useRef, useState } from 'react'
import { useLang } from '../LangContext'
import { parseBankTarget, encodeBankTarget, parsePromptPayQr } from '../promptpay'
import { readQrImage } from '../readQrImage'
import BankPicker from './BankPicker'
import styles from './ExtrasSection.module.css'

/**
 * Editor for the payee: either a PromptPay id (phone / national ID → QR) or a
 * bank account (→ copyable transfer card). Both write to the same string
 * field — bank accounts as `bank:<code>:<account>` (see promptpay.js).
 *
 * "Read from my bank QR" fills the PromptPay id from a screenshot of a bank
 * app's receive-money QR: those carry a bank-registered PromptPay id (e.g.
 * K PLUS's 15-digit reference number), which gives friends a scan-to-pay QR
 * where a plain account number can't.
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
  const [qrMsg, setQrMsg] = useState(null) // { ok: boolean, text: string }

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    setQrMsg(null)
    onChange('')
  }

  const onQrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setReading(true)
    setQrMsg(null)
    const text = await readQrImage(file)
    setReading(false)
    if (!text) { setQrMsg({ ok: false, text: t.qrReadNotFound }); return }
    const r = parsePromptPayQr(text)
    if (!r.id) { setQrMsg({ ok: false, text: t.qrReadNotPromptPay }); return }
    setMode('pp')
    onChange(r.id)
    setQrMsg({ ok: true, text: t.qrReadDone })
  }

  const qrReader = (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={onQrFile} hidden />
      <button type="button" className={styles.qrReadBtn} onClick={() => fileRef.current?.click()} disabled={reading}>
        {reading ? t.qrReading : `📷 ${t.qrReadBtn}`}
      </button>
      {qrMsg && <p className={qrMsg.ok ? styles.qrReadOk : styles.qrReadErr} role="status">{qrMsg.text}</p>}
    </>
  )

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
        <>
          <input
            type="text"
            placeholder={t.ppPlaceholder}
            value={value}
            onChange={e => { setQrMsg(null); onChange(e.target.value) }}
            className={styles.ppInput}
          />
          {qrReader}
        </>
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
          <p className={styles.bankNote}>{t.bankScanTip}</p>
          {qrReader}
        </>
      )}
    </div>
  )
}
