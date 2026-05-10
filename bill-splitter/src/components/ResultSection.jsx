import { useState } from 'react'
import { useLang } from '../LangContext'
import { buildShareUrl } from '../share'
import styles from './ResultSection.module.css'

function fmt(n) { return n.toFixed(2) }

export default function ResultSection({ result, members, promptPay, bankInfo, notes, billName, snapshot, tab }) {
  const { t } = useLang()
  const [toast, setToast] = useState('')
  const hasData = members.length > 0 && result.subtotal > 0

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const buildSummaryText = () => {
    const prefix = billName && billName.trim() ? `\u{1F374} ${billName.trim()}` : t.sharePrefix
    const lines = [prefix, '']
    members.forEach(m => lines.push(`${m}: ฿${fmt(result.totals[m] ?? 0)}`))
    lines.push('')
    lines.push(`${t.shareTotal} ฿${fmt(result.grandTotal)}`)
    if (promptPay) lines.push(`PromptPay: ${promptPay}`)
    if (bankInfo) lines.push(bankInfo)
    if (notes) lines.push(`📝 ${notes}`)
    return lines.join('\n')
  }

  const handleCopyText = async () => {
    const text = buildSummaryText()
    try {
      await navigator.clipboard.writeText(text)
      showToast(t.summaryCopied)
    } catch {}
  }

  const handleShareLink = async () => {
    const text = buildSummaryText()
    const url = buildShareUrl(tab || 'split', snapshot)

    if (navigator.share) {
      try {
        await navigator.share({ title: (billName && billName.trim()) || t.appName, text, url })
        return
      } catch (e) {
        if (e && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast(t.linkCopied)
    } catch {}
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t.result}</h2>
        {hasData && (
          <div className={styles.shareBtnGroup}>
            <button className={styles.shareBtn} onClick={handleCopyText} title={t.copySummary}>📋 {t.copy}</button>
            <button className={styles.shareBtn} onClick={handleShareLink}>{t.shareLink}</button>
          </div>
        )}
      </div>
      {toast && <div className={styles.toast}>{toast}</div>}
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
