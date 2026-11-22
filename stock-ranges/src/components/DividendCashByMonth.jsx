import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { formatPrice, maskPrice } from '../format.js'
import styles from './DividendCashByMonth.module.css'

// "Cash coming in": expected dividend money per month for the next few
// months (see projectDividendCash in wallet.js), with a bar per month and the
// paying symbols underneath. Tap a month for its breakdown. Amounts are
// estimates unless the company has declared the dividend; months that include
// dividends placed by XD date (no known pay date) are marked, since that cash
// usually arrives 1–4 weeks later. Bars are hidden in masked mode — their
// lengths would give the amounts away.
export default function DividendCashByMonth({ months, currency, masked }) {
  const { s, lang } = useLang()
  const [open, setOpen] = useState(null)
  if (!months.some((m) => m.items.length)) return null

  const locale = lang === 'th' ? 'th-TH' : 'en-US'
  const totals = months.map((m) => m.items.reduce((sum, i) => sum + i.amount, 0))
  const max = Math.max(...totals, 0)
  const money = (v) => (masked ? maskPrice(currency) : formatPrice(v, currency))

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{s.dividendCashTitle}</div>
      <ul className={styles.list}>
        {months.map((m, idx) => {
          const [y, mo] = m.month.split('-').map(Number)
          const label = new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' })
          const total = totals[idx]
          const hasXdOnly = m.items.some((i) => i.dateKind === 'xd')
          const allDeclared = m.items.length > 0 && m.items.every((i) => i.kind === 'declared')
          const symbols = [...new Set(m.items.map((i) => i.symbol))]
          const isOpen = open === m.month
          return (
            <li key={m.month}>
              <button
                type="button"
                className={styles.row}
                onClick={() => setOpen(isOpen ? null : m.month)}
                aria-expanded={isOpen}
                disabled={!m.items.length}
              >
                <span className={styles.month}>{label}</span>
                <span className={styles.barTrack} aria-hidden="true">
                  {!masked && max > 0 && <span className={styles.bar} data-declared={allDeclared} style={{ width: `${(total / max) * 100}%` }} />}
                </span>
                <span className={styles.total}>
                  {m.items.length ? <>{allDeclared ? '' : '≈ '}{money(total)}{hasXdOnly && <sup className={styles.mark}>*</sup>}</> : '—'}
                </span>
              </button>
              {m.items.length > 0 && !isOpen && <div className={styles.symbols}>{symbols.join(' · ')}</div>}
              {isOpen && (
                <ul className={styles.detail}>
                  {m.items.map((i, k) => (
                    <li key={`${i.symbol}-${i.date}-${k}`}>
                      <span className={styles.detailDate}>
                        {new Date(i.date * 1000).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                        {i.dateKind === 'xd' && <sup className={styles.mark}>*</sup>}
                      </span>
                      <span className={styles.detailSymbol}>{i.symbol}</span>
                      <span className={styles.detailKind}>{i.kind === 'declared' ? s.dividendDeclaredTag : s.dividendEstimatedTag}</span>
                      <span className={styles.detailAmount}>{money(i.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
      <p className={styles.note}>{s.dividendCashNote}</p>
    </div>
  )
}
