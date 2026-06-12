import { useState, useRef, useEffect, useCallback } from 'react'
import { useLang } from '../LangContext'
import { buildShareUrl, createShortLink } from '../share'
import { auth, onAuthStateChanged } from '../firebase'
import { isValidPromptPayId } from '../promptpay'
import PromptPayQR from './PromptPayQR'
import Avatar from './Avatar'
import { CopyIcon, ShareIcon, QrIcon, SmartphoneIcon, WarnIcon, BankIcon, NoteIcon } from './icons'
import styles from './ResultSection.module.css'

function fmt(n) { return n.toFixed(2) }

export default function ResultSection({ result, members, promptPay, bankInfo, notes, billName, snapshot, tab, onSave, initialPaid, roundTotalEnabled, onRoundTotalChange, readOnly, currency = 'THB', currencySymbol = '฿' }) {
  const { t } = useLang()
  const [toast, setToast] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [user, setUser] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const [creatingLink, setCreatingLink] = useState(false)
  // #124 — currency converter: display-only, never mutates store prices
  const [converting, setConverting] = useState(false)
  const [convertRate, setConvertRate] = useState(null)   // rate: 1 THB = X currency
  const [convertError, setConvertError] = useState(null)
  const isTHB = currency === 'THB'

  const handleConvert = useCallback(async () => {
    if (isTHB) { setConvertRate(null); setConvertError(null); return }
    if (convertRate !== null) { setConvertRate(null); setConvertError(null); return }
    setConverting(true)
    setConvertError(null)
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/THB`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      const rate = data?.rates?.[currency]
      if (!rate) throw new Error('no rate')
      setConvertRate(rate)
    } catch {
      setConvertError(t.convertError ?? 'Could not fetch rate')
    } finally {
      setConverting(false)
    }
  }, [currency, convertRate, isTHB, t])

  // Reset conversion when currency changes
  useEffect(() => { setConvertRate(null); setConvertError(null) }, [currency])

  const conv = (n) => convertRate !== null ? (n * convertRate) : n
  const sym = convertRate !== null ? currencySymbol : '฿'
  const fmtC = (n) => conv(n).toFixed(currency === 'KRW' || currency === 'JPY' ? 0 : 2)
  // #91 mark-as-paid — session-only set of member names marked paid.
  // Deliberately NOT persisted to store/history/cloud (resets on new bill).
  // Seeds from initialPaid when opening a share link that carried paid names.
  const [paid, setPaid] = useState(() => new Set(Array.isArray(initialPaid) ? initialPaid : []))
  const togglePaid = (m) => setPaid(prev => {
    const next = new Set(prev)
    if (next.has(m)) next.delete(m); else next.add(m)
    return next
  })

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!moreOpen) return
    const onClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [moreOpen])
  const sectionRef = useRef(null)
  const hasData = (result.rawSubtotal ?? result.subtotal) > 0
  const ppValid = isValidPromptPayId(promptPay)
  const ownerName = user?.displayName?.trim().toLowerCase()
  const rawGrand = result.subtotal * result.multiplier
  const showRoundedFrom = roundTotalEnabled && rawGrand.toFixed(2) !== Number(result.grandTotal).toFixed(2)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const buildSummaryText = () => {
    const prefix = billName && billName.trim() ? `\u{1F374} ${billName.trim()}` : t.sharePrefix
    const lines = [prefix, '']
    members.forEach(m => lines.push(`${m}: ${sym}${fmtC(result.totals[m] ?? 0)}`))
    lines.push('')
    lines.push(`${t.shareTotal} ${sym}${fmtC(result.grandTotal)}`)
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
    // #91 follow-up — carry the session-only paid set in the SHARE PAYLOAD only,
    // so checks show for whoever opens the link. Never written to store/history/cloud:
    // we spread into a fresh object and leave `snapshot` (used by Save) untouched.
    const shareSnapshot = paid.size > 0 ? { ...snapshot, paid: [...paid] } : snapshot
    let url
    setCreatingLink(true)
    try {
      url = await createShortLink(tab || 'split', shareSnapshot, user?.uid || null)
    } catch (e) {
      // Silent fallback to long URL on Firestore failure (network, rules, etc.)
      url = buildShareUrl(tab || 'split', shareSnapshot)
    }
    setCreatingLink(false)
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
    <section ref={sectionRef} className={styles.section} data-bill-result>
      <div className={styles.header}>
        <h2 className={styles.title}>{t.result}</h2>
        {hasData && (
          <div className={styles.shareBtnGroup} data-snapshot-hide>
            <div style={{ position: 'relative' }} ref={moreRef}>
              <button className={styles.shareBtn} onClick={() => setMoreOpen(o => !o)} aria-haspopup="true" aria-expanded={moreOpen}>{t.more} ▾</button>
              {moreOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 10, background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #ddd)', borderRadius: 8, padding: 4, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {onSave && (
                    <button className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleSave(); setMoreOpen(false) }}>{t.saveBill}</button>
                  )}
                  <button className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleCopyText(); setMoreOpen(false) }}><CopyIcon width={15} height={15} /> {t.copy}</button>
                  <button className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleSaveImage(); setMoreOpen(false) }} disabled={capturing} title={t.saveImage}>{t.saveImage}</button>
                </div>
              )}
            </div>
            <button className={styles.shareBtn} style={{ background: 'var(--accent, #4f46e5)', color: 'white', fontWeight: 600 }} onClick={handleShareLink} disabled={creatingLink}>{creatingLink ? t.shareCreating : <><ShareIcon width={14} height={14} /> {t.shareLink}</>}</button>
          </div>
        )}
      </div>
      {toast && <div className={styles.toast}>{toast}</div>}
      {!hasData && <p className={styles.empty}>{t.noData}</p>}
      {hasData && (
        <>
          <div className={styles.breakdown}>
            <div className={styles.row}><span className={styles.rowLabel}>{t.foodSubtotal}</span><span className={styles.rowVal}>{sym}{fmtC(result.subtotal)}</span></div>
            {result.serviceCharge > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.serviceCharge} ({result.serviceChargeRate}%)</span><span className={styles.rowVal}>{sym}{fmtC(result.serviceCharge)}</span></div>}
            {result.vat > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.vat} (7%)</span><span className={styles.rowVal}>{sym}{fmtC(result.vat)}</span></div>}
            <div className={`${styles.row} ${styles.totalRow}`}><span>{t.total}</span><span className={styles.totalRight}><span className={styles.grandTotal}>{sym}{convertRate !== null ? fmtC(result.grandTotal) : (roundTotalEnabled ? Math.round(result.grandTotal) : fmt(result.grandTotal))}</span>{showRoundedFrom && convertRate === null && <span className={styles.roundFrom}>{t.roundedFrom} ฿{rawGrand.toFixed(2)}</span>}</span></div>
            {!readOnly && (
              <div className={styles.roundRow} data-snapshot-hide>
                <span className={styles.roundLabel}>{t.roundTotal}</span>
                <button type="button" className={styles.roundSwitch} role="switch" aria-checked={!!roundTotalEnabled} aria-label={t.roundTotal} onClick={() => onRoundTotalChange(!roundTotalEnabled)}><span className={styles.roundSwitchKnob} /></button>
              </div>
            )}
            {!isTHB && (
              <div className={styles.roundRow} data-snapshot-hide>
                <span className={styles.roundLabel}>
                  {convertRate !== null
                    ? `1 ฿ = ${convertRate.toFixed(4)} ${currencySymbol}`
                    : (t.convertTo ?? `Convert to ${currencySymbol}`)}
                </span>
                <button
                  type="button"
                  className={styles.roundSwitch}
                  role="switch"
                  aria-checked={convertRate !== null}
                  aria-label={t.convertTo ?? `Convert to ${currencySymbol}`}
                  onClick={handleConvert}
                  disabled={converting}
                >
                  <span className={styles.roundSwitchKnob} />
                </button>
              </div>
            )}
            {convertError && <p style={{ fontSize: 11, color: 'var(--color-red, #c62828)', margin: '4px 0 0' }}>{convertError}</p>}
          </div>

          {ppValid && (
            <div className={styles.qrToggleRow} data-snapshot-hide>
              <button
                className={styles.qrToggleBtn}
                onClick={() => setShowQR(v => !v)}
                aria-pressed={showQR}
              >
                <QrIcon width={15} height={15} /> {showQR ? t.hideQR : t.showQR}
              </button>
            </div>
          )}

          <div className={styles.perPersonList}>
            {members.map(m => { const amount=result.totals[m]??0; const pct=result.grandTotal>0?(amount/result.grandTotal)*100:0; const isPaid=paid.has(m); return(
              <div key={m} className={isPaid ? styles.paid : undefined}>
                <div className={styles.personHeader}><div className={styles.personLeft}><button type="button" className={`${styles.payCheck} ${isPaid ? styles.payCheckOn : ''}`} onClick={() => togglePaid(m)} aria-pressed={isPaid} aria-label={isPaid ? t.markUnpaid : t.markPaid} title={isPaid ? t.markUnpaid : t.markPaid}>{isPaid && (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)}</button><Avatar name={m} photoURL={user && ownerName && m.trim().toLowerCase() === ownerName ? user.photoURL : null} size={24} /><span className={styles.personName}>{m}</span></div><span className={styles.personAmount}>{sym}{fmtC(amount)}</span></div>
                <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                {showQR && ppValid && amount > 0 && (
                  <PromptPayQR promptPay={promptPay} amount={amount} />
                )}
              </div>
              )})}
          </div>
          {(promptPay||bankInfo) && <div className={styles.payInfo}>{promptPay && <p className={styles.payLine}><span className={styles.payIcon}><SmartphoneIcon width={16} height={16} /></span>PromptPay: <strong>{promptPay}</strong>{!ppValid && <span className={styles.payWarn}><WarnIcon width={14} height={14} /> {t.promptPayInvalid}</span>}</p>}{bankInfo && <p className={styles.payLine} style={{whiteSpace:'pre-line'}}><span className={styles.payIcon}><BankIcon width={16} height={16} /></span>{bankInfo}</p>}</div>}
          {notes && <div className={styles.notes}><span className={styles.notesIcon}><NoteIcon width={16} height={16} /></span><span>{notes}</span></div>}
        </>
      )}
    </section>
  )
}
