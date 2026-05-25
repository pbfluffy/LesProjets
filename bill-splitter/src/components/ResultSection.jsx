import { useState, useRef, useEffect } from 'react'
import { useLang } from '../LangContext'
import { buildShareUrl, createShortLink } from '../share'
import { auth, onAuthStateChanged } from '../firebase'
import { isValidPromptPayId } from '../promptpay'
import PromptPayQR from './PromptPayQR'
import styles from './ResultSection.module.css'

function fmt(n) { return n.toFixed(2) }

export default function ResultSection({ result, members, promptPay, bankInfo, notes, billName, snapshot, tab, onSave }) {
  const { t } = useLang()
  const [toast, setToast] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [user, setUser] = useState(null)
  const [useShortLink, setUseShortLink] = useState(true)
  const [creatingLink, setCreatingLink] = useState(false)

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  const sectionRef = useRef(null)
  const hasData = members.length > 0 && result.subtotal > 0
  const ppValid = isValidPromptPayId(promptPay)

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
    let url
    if (useShortLink && user) {
      setCreatingLink(true)
      try {
        url = await createShortLink(tab || 'split', snapshot, user.uid)
      } catch (e) {
        setCreatingLink(false)
        showToast(t.shareError)
        return
      }
      setCreatingLink(false)
    } else {
      url = buildShareUrl(tab || 'split', snapshot)
    }
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

  const handleSave = () => {
    if (onSave) {
      onSave()
      showToast(t.saved)
    }
  }

  // #5 — snapshot share as image
  // Captures the result section (minus the action buttons) to PNG, then shares
  // via Web Share API on mobile, or downloads as a file on desktop.
  const handleSaveImage = async () => {
    if (!sectionRef.current || capturing) return
    setCapturing(true)
    try {
      // Dynamic import — html2canvas only loads on first click (~50kb)
      const html2canvas = (await import('html2canvas')).default
      // Read the section's actual background so capture matches active theme
      const bg = getComputedStyle(sectionRef.current).backgroundColor || '#ffffff'
      const canvas = await html2canvas(sectionRef.current, {
        backgroundColor: bg,
        scale: 2,
        useCORS: true,
        // Skip elements marked with data-snapshot-hide (the button row)
        ignoreElements: (el) => el.hasAttribute && el.hasAttribute('data-snapshot-hide'),
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) {
        showToast(t.imageFailed)
        return
      }
      const safeName = (billName && billName.trim() ? billName.trim() : 'bill').replace(/[^\w\u0E00-\u0E7F-]+/g, '_')
      const filename = `${safeName}.png`
      const file = new File([blob], filename, { type: 'image/png' })

      // Try native share (works on mobile, drops straight into LINE/iMessage)
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file], title: billName && billName.trim() ? billName.trim() : t.appName })
          showToast(t.imageShared)
          return
        } catch (e) {
          if (e && e.name === 'AbortError') return
          // fall through to download
        }
      }
      // Fallback: download as a file (desktop)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast(t.imageSaved)
    } catch (e) {
      showToast(t.imageFailed)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t.result}</h2>
        {hasData && (
          <div className={styles.shareBtnGroup} data-snapshot-hide>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, width: '100%', cursor: user ? 'pointer' : 'not-allowed', opacity: user ? 1 : 0.6 }}>
              <input type="checkbox" checked={useShortLink} onChange={(e) => setUseShortLink(e.target.checked)} disabled={!user || creatingLink} />
              {t.shareShortLink}
              {!user && <span style={{ fontSize: 10, color: 'var(--text-muted, #888)' }}>({t.shareShortLinkSignedOut})</span>}
              {creatingLink && <span style={{ fontSize: 10 }}>{t.shareCreating}</span>}
            </label>
            {onSave && (
              <button className={styles.shareBtn} onClick={handleSave} title={t.saveBill}>{t.saveBill}</button>
            )}
            <button className={styles.shareBtn} onClick={handleCopyText} title={t.copySummary}>📋 {t.copy}</button>
            <button className={styles.shareBtn} onClick={handleSaveImage} disabled={capturing} title={t.saveImage}>{t.saveImage}</button>
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
            {result.serviceCharge > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.serviceCharge} ({result.serviceChargeRate}%)</span><span className={styles.rowVal}>฿{fmt(result.serviceCharge)}</span></div>}
            {result.vat > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.vat} (7%)</span><span className={styles.rowVal}>฿{fmt(result.vat)}</span></div>}
            <div className={`${styles.row} ${styles.totalRow}`}><span>{t.total}</span><span className={styles.grandTotal}>฿{fmt(result.grandTotal)}</span></div>
          </div>

          {ppValid && (
            <div className={styles.qrToggleRow} data-snapshot-hide>
              <button
                className={styles.qrToggleBtn}
                onClick={() => setShowQR(v => !v)}
                aria-pressed={showQR}
              >
                📱 {showQR ? t.hideQR : t.showQR}
              </button>
            </div>
          )}

          <div className={styles.perPersonList}>
            {members.map(m => { const amount=result.totals[m]??0; const pct=result.grandTotal>0?(amount/result.grandTotal)*100:0; return(
              <div key={m} className={styles.person}>
                <div className={styles.personHeader}><div className={styles.personLeft}><span className={styles.personAvatar}>{m.charAt(0).toUpperCase()}</span><span className={styles.personName}>{m}</span></div><span className={styles.personAmount}>฿{fmt(amount)}</span></div>
                <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                {showQR && ppValid && amount > 0 && (
                  <PromptPayQR promptPay={promptPay} amount={amount} />
                )}
              </div>
              )})}
          </div>
          {(promptPay||bankInfo) && <div className={styles.payInfo}>{promptPay && <p className={styles.payLine}><span className={styles.payIcon}>📱</span>PromptPay: <strong>{promptPay}</strong>{!ppValid && <span className={styles.payWarn}> ⚠ {t.promptPayInvalid}</span>}</p>}{bankInfo && <p className={styles.payLine} style={{whiteSpace:'pre-line'}}><span className={styles.payIcon}>🏦</span>{bankInfo}</p>}</div>}
          {notes && <div className={styles.notes}><span className={styles.notesIcon}>📝 </span><span>{notes}</span></div>}
        </>
      )}
    </section>
  )
}
