import { useLang } from '../LangContext'
import styles from './ResultSection.module.css'

function fmt(n) { return n.toFixed(2) }

export default function ResultSection({ result, members, promptPay, bankInfo, notes }) {
  const { t } = useLang()
  const hasData = members.length > 0 && result.subtotal > 0
  const handleShare = () => {
    const lines = [t.sharePrefix, '']
    members.forEach(m => lines.push(`${m}: ฿${fmt(result.totals[m] ?? 0)}`))
    lines.push('')
    lines.push(`${t.shareTotal} ฿${fmt(result.grandTotal)}`)
    if (promptPay) lines.push(`PromptPay: ${promptPay}`)
    if (bankInfo) lines.push(bankInfo)
    if (notes) lines.push(`📝 ${notes}`)
    const text = lines.join('\n')
    if (navigator.share) { navigator.share({ text }).catch(() => navigator.clipboard?.writeText(text)) }
    else { navigator.clipboard?.writeText(text) }
  }
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t.result}</h2>
        {hasData && <button className={styles.shareBtn} onClick={handleShare}>{t.share}</button>}
      </div>
      {!hasData && <p className={styles.empty}>{t.noData}</p>}
      {hasData && (
        <>
          <div className={styles.breakdown}>
            <div className={styles.row}><span className={styles.rowLabel}>{t.foodSubtotal}</span><span className={styles.rowVal}>฿{fmt(result.subtotal)}</span></div>
            {result.serviceCharge > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.serviceCharge} (10%)</span><span className={styles.rowVal}>฿{fmt(result.serviceCharge)}</span></div>}
            {result.vat > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.vat} (7%)</span><span className={styles.rowVal}>฿{fmt(result.vat)}</span></div>}
            <div className={`${styles.row} ${styles.totalRow}`}><span>{t.total}</span><span className={styles.grandTotal}>฿{fmt(result.grandTotal)}</span></div>
          </div>
          <div className={styles.perPersonList}>
            {members.map(m => { const amount=result.totals[m]??0; const pct=result.grandTotal>0?(amount/result.grandTotal)*100:0; return(
              <div key={m} className={styles.person}>
                <div className={styles.personHeader}><div className={styles.personLeft}><span className={styles.personAvatar}>{m.charAt(0).toUpperCase()}</span><span className={styles.personName}>{m}</span></div><span className={styles.personAmount}>฿{fmt(amount)}</span></div>
                <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
              </div>
             )})}
          </div>
          {(promptPay||bankInfo) && <div className={styles.payInfo}>{promptPay && <p className={styles.payLine}><span className={styles.payIcon}>📱</span>PromptPay: <strong>{promptPay}</strong></p>}{bankInfo && <p className={styles.payLine} style={{whiteSpace:'pre-line'}}><span className={styles.payIcon}>🏦</span>{bankInfo}</p>}</div>}
          {notes && <div className={styles.notes}><span className={styles.notesIcon}>📝 </span><span>{notes}</span></div>}
        </>
      )}
    </section>
  )
}
