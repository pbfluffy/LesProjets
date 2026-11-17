import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { convert } from '../fx.js'
import { formatPrice, formatQty, maskPrice } from '../format.js'
import { computeRealizedPL } from '../realized.js'
import styles from './SalesLog.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// Realized-sale log, newest first. Deleting an entry only corrects the
// record — it never puts shares back into a holding (use Undo right after a
// sale for that). Collapsed by default: the headline number lives in the
// wallet summary strip, this is the detail behind it.
export default function SalesLog({ sells, currency, rates, masked, onDelete }) {
  const { s, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)
  if (!sells.length) return null

  const mp = (value, cur) => (masked ? maskPrice(cur) : formatPrice(value, cur))
  const fmtDate = (d) => {
    const dt = new Date(`${d}T00:00:00`)
    return Number.isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.toggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>{interp(s.salesLogTitle, { n: sells.length })}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <ul className={styles.list}>
          {sells.map((sell) => {
            const r = computeRealizedPL(sell, currency, rates)
            const perShare = convert(sell.price, sell.currency, currency, rates)
            return (
              <li key={sell.id} className={styles.row}>
                <div className={styles.main}>
                  <span className={styles.symbol}>{sell.symbol}</span>
                  <span className={styles.detail}>
                    {formatQty(sell.qty)} @ {mp(sell.price, sell.currency)} · {fmtDate(sell.date)}
                  </span>
                </div>
                <div className={styles.result} data-direction={r ? (r.pl >= 0 ? 'up' : 'down') : undefined}>
                  {r ? (
                    <>
                      <strong>{masked ? maskPrice(currency) : `${r.pl >= 0 ? '+' : ''}${formatPrice(r.pl, currency)}`}</strong>
                      {r.plPercent !== null && <em>{r.pl >= 0 ? '+' : ''}{r.plPercent.toFixed(1)}%</em>}
                    </>
                  ) : (
                    <em>{perShare === null ? s.salesLogNoFx : '—'}</em>
                  )}
                </div>
                {confirmingId === sell.id ? (
                  <div className={styles.confirm}>
                    <span>{s.salesLogDeleteConfirm}</span>
                    <button type="button" className={styles.yes} onClick={() => { onDelete(sell.id); setConfirmingId(null) }}>{s.salesLogDeleteYes}</button>
                    <button type="button" className={styles.no} onClick={() => setConfirmingId(null)}>{s.cancelBtn}</button>
                  </div>
                ) : (
                  <button type="button" className={styles.del} onClick={() => setConfirmingId(sell.id)} aria-label={s.removeLabel} title={s.removeLabel}>×</button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
