
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

export default function ResultSection({ result, members, foods = [], promptPay, bankInfo, notes, billName, snapshot, tab, onSave, onNewBill, initialPaid, billOwner, onBillOwnerChange, roundTotalEnabled, onRoundTotalChange, readOnly, currency = 'THB', currencySymbol = '฿' }) {
  const { t, lang } = useLang()
  const [toast, setToast] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [user, setUser] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const [creatingLink, setCreatingLink] = useState(false)
  // #124 — currency converter: display-only, never mutates store prices
  const [converting, setConverting] = useState(false)
  const [convertRate, setConvertRate] = useState(null)   // rate: 1 foreignCurrency = X THB
  const [convertError, setConvertError] = useState(null)
  const isTHB = currency === 'THB'

  const handleConvert = useCallback(async () => {
    if (isTHB) { setConvertRate(null); setConvertError(null); return }
    if (convertRate !== null) { setConvertRate(null); setConvertError(null); return }
    setConverting(true)
    setConvertError(null)
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      const rate = data?.rates?.['THB']
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
  const sym = convertRate !== null ? '฿' : currencySymbol
  const fmtC = (n) => conv(n).toFixed(2)
  const displayCurrency = convertRate !== null ? 'THB' : currency
  const currentOwner = members.includes(billOwner) ? billOwner : members[0]
  // #91 mark-as-paid — session-only set of member names marked paid.
  // Deliberately NOT persisted to store/history/cloud (resets on new bill).
  // Seeds from initialPaid when opening a share link that carried paid names.
  const [paid, setPaid] = useState(() => new Set(Array.isArray(initialPaid) ? initialPaid : []))
  const togglePaid = (m) => setPaid(prev => {
    const next = new Set(prev)
    if (next.has(m)) next.delete(m); else next.add(m)
    return next
  })
  const handleOwnerChange = (owner) => {
    setPaid(prev => {
      if (!prev.has(owner)) return prev
      const next = new Set(prev)
      next.delete(owner)
      return next
    })
    onBillOwnerChange?.(owner)
  }

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
    members.forEach(m => {
      lines.push(`${m}: ${sym}${fmtC(result.totals[m] ?? 0)}`)
      const myFoods = foods.filter(f => f.who && f.who.includes(m) && f.name && parseFloat(f.price) > 0)
      myFoods.forEach(f => {
        const split = parseFloat(f.price) / f.who.length
        lines.push(`  · ${f.name}: ${sym}${fmtC(split * result.multiplier)}`)
      })
      lines.push('')
    })
    if (result.serviceCharge > 0 || result.vat > 0 || (result.billDiscount ?? 0) > 0) {
      lines.push(`${t.foodSubtotal}: ${sym}${fmtC(result.subtotal)}`)
      if ((result.billDiscount ?? 0) > 0) lines.push(`${t.billDiscount ?? 'Bill Discount'}: −${sym}${fmtC(result.billDiscount)}`)
      if (result.serviceCharge > 0) lines.push(`${t.serviceCharge} (${result.serviceChargeRate}%): ${sym}${fmtC(result.serviceCharge)}`)
      if (result.vat > 0) lines.push(`${t.vat} (7%): ${sym}${fmtC(result.vat)}`)
      lines.push('')
    }
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

  const handleShareLine = async () => {
    if (!sectionRef.current || capturing) return
    setCapturing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = sectionRef.current
      const prevStyle = el.getAttribute('style') || ''
      el.setAttribute('style', (prevStyle + ';background:#ffffff;color:#1a1a1a;--color-surface:#ffffff;--color-surface-alt:#f5f5f4;--color-text:#1a1a1a;--color-text-muted:#6b7280;--color-text-faint:#9ca3af;--color-border:rgba(0,0,0,0.08);--color-border-strong:rgba(0,0,0,0.15);--color-accent:#1a1a1a;--color-accent-text:#ffffff;').replace(/^;/, ''))
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        ignoreElements: (el) => el.hasAttribute && el.hasAttribute('data-snapshot-hide'),
      })
      el.setAttribute('style', prevStyle)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) { showToast(t.imageFailed); return }
      const safeName = (billName && billName.trim() ? billName.trim() : 'bill').replace(/[^\w\u0E00-\u0E7F-]+/g, '_')
      const file = new File([blob], `${safeName}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file], title: billName && billName.trim() ? billName.trim() : t.appName })
          return
        } catch (e) {
          if (e && e.name === 'AbortError') return
        }
      }
      // Fallback: open LINE share with text if image share not supported
      const text = buildSummaryText()
      window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    } catch (e) {
      showToast(t.imageFailed)
    } finally {
      setCapturing(false)
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
      // Force light-mode styles during capture so image always looks clean
      const el = sectionRef.current
      const prevStyle = el.getAttribute('style') || ''
      el.setAttribute('style', (prevStyle + ';background:#ffffff;color:#1a1a1a;--color-surface:#ffffff;--color-surface-alt:#f5f5f4;--color-text:#1a1a1a;--color-text-muted:#6b7280;--color-text-faint:#9ca3af;--color-border:rgba(0,0,0,0.08);--color-border-strong:rgba(0,0,0,0.15);--color-accent:#1a1a1a;--color-accent-text:#ffffff;').replace(/^;/, ''))
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        // Skip elements marked with data-snapshot-hide (the button row)
        ignoreElements: (el) => el.hasAttribute && el.hasAttribute('data-snapshot-hide'),
      })
      el.setAttribute('style', prevStyle)
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
      {/* Actions above summary — data-snapshot-hide so they don't appear in share image */}
      {hasData && (
        <div data-snapshot-hide style={{ marginBottom: 12 }}>
          {/* Row 1: Save · Share · Line (all in one row, compact) */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {onSave && (
              <button onClick={handleSave} style={{ flex: 2, padding: '7px 10px', border: 'none', background: 'var(--color-accent)', color: 'var(--color-accent-text)', borderRadius: 7, cursor: 'pointer', font: 'inherit', fontWeight: 600, fontSize: 13 }}>
                {t.saveBill}
              </button>
            )}
            <button onClick={handleShareLink} disabled={creatingLink} style={{ flex: 1, padding: '7px 6px', border: '1px solid var(--color-border-strong)', background: 'transparent', color: 'var(--color-text)', borderRadius: 7, cursor: 'pointer', font: 'inherit', fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <ShareIcon width={12} height={12} />
              {creatingLink ? '…' : (lang === 'th' ? 'แชร์' : 'Share')}
            </button>
            <button onClick={handleShareLine} disabled={capturing} style={{ flex: 1, padding: '7px 6px', border: '1px solid #06C755', background: 'transparent', color: '#06C755', borderRadius: 7, cursor: 'pointer', font: 'inherit', fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              Line
            </button>
          </div>
          {/* Row 2: + New Bill · More ▾ (muted text) */}
          <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)', paddingTop: 4 }}>
            {onNewBill && (
              <button onClick={onNewBill} style={{ flex: 1, padding: '4px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)', font: 'inherit', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>
                + {lang === 'th' ? 'บิลใหม่' : 'New Bill'}
              </button>
            )}
            <div style={{ position: 'relative', marginLeft: 'auto' }} ref={moreRef}>
              <button onClick={() => setMoreOpen(o => !o)} style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)', font: 'inherit', fontSize: 12, cursor: 'pointer' }} aria-haspopup="true" aria-expanded={moreOpen}>
                {t.more} ▾
              </button>
              {moreOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 4, minWidth: 150, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleCopyText(); setMoreOpen(false) }}><CopyIcon width={14} height={14} /> {t.copy}</button>
                  <button className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleSaveImage(); setMoreOpen(false) }} disabled={capturing}>{t.saveImage}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className={styles.header}>
        <h2 className={styles.title}>{t.result}</h2>
      </div>
      {billName && billName.trim() && <div className={styles.billNameDisplay}>{billName.trim()}</div>}
      {toast && <div className={styles.toast}>{toast}</div>}
      {!hasData && <p className={styles.empty}>{t.noData}</p>}
      {hasData && (
        <>
          <div className={styles.breakdown}>
            <div className={styles.row}><span className={styles.rowLabel}>{t.foodSubtotal}</span><span className={styles.rowVal}>{sym}{fmtC(result.subtotal)}</span></div>
            {(result.billDiscount ?? 0) > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.billDiscount ?? 'Bill Discount'}</span><span className={styles.rowValDiscount}>− {sym}{fmtC(result.billDiscount)}</span></div>}
            {result.serviceCharge > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.serviceCharge} ({result.serviceChargeRate}%)</span><span className={styles.rowVal}>{sym}{fmtC(result.serviceCharge)}</span></div>}
            {result.vat > 0 && <div className={styles.row}><span className={styles.rowLabel}>{t.vat} (7%)</span><span className={styles.rowVal}>{sym}{fmtC(result.vat)}</span></div>}
            <div className={`${styles.row} ${styles.totalRow}`}><span>{t.total}</span><span className={styles.totalRight}><span className={styles.grandTotal}>{sym}{convertRate !== null ? fmtC(result.grandTotal) : (roundTotalEnabled ? Math.round(result.grandTotal) : fmt(result.grandTotal))}</span>{showRoundedFrom && convertRate === null && <span className={styles.roundFrom}>{t.roundedFrom} ฿{rawGrand.toFixed(2)}</span>}</span></div>
            {!readOnly && (
              <div className={styles.roundRow} data-snapshot-hide>
                <span className={styles.roundLabel}>{t.roundTotal}</span>
                <button type="button" className={styles.roundSwitch} role="switch" aria-checked={!!roundTotalEnabled} aria-label={t.roundTotal} onClick={() => onRoundTotalChange(!roundTotalEnabled)}><span className={styles.roundSwitchKnob} /></button>
              </div>
            )}
            {!readOnly && onBillOwnerChange && members.length > 1 && (
              <div className={styles.ownerRow} data-snapshot-hide>
                <label className={styles.ownerLabel} htmlFor="bill-owner-select">Bill owner</label>
                <select
                  id="bill-owner-select"
                  className={styles.ownerSelect}
                  value={currentOwner ?? ''}
                  onChange={e => handleOwnerChange(e.target.value)}
                >
                  {members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
            {!isTHB && (
              <div className={styles.roundRow} data-snapshot-hide>
                <span className={`${styles.roundLabel} ${styles.currencyLabel}`}>
                  <span>Original: {currency}</span>
                  <span>Display: {displayCurrency}</span>
                  {convertRate !== null
                    ? <span>1 {currencySymbol} = {convertRate.toFixed(4)} ฿</span>
                    : <span>{t.convertTo ?? 'Convert to ฿'}</span>}
                </span>
                <button
                  type="button"
                  className={styles.roundSwitch}
                  role="switch"
                  aria-checked={convertRate !== null}
                  aria-label={t.convertTo ?? `Convert to ฿`}
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
            {members.map(m => {
              const finalAmt = result.totals[m] ?? 0
              // Pre-discount amount: undiscounted share × multiplier
              const undiscountedAmt = (result.shares[m] ?? 0) * (result.multiplier ?? 1)
              const hasBillDisc = undiscountedAmt - finalAmt > 0.005
              const pct = result.grandTotal > 0 ? (finalAmt / result.grandTotal) * 100 : 0
              const isOwner = m === currentOwner
              const isPaid = !isOwner && paid.has(m)
              const qrAmount = isTHB ? finalAmt : (convertRate !== null ? conv(finalAmt) : null)
              return (
                <div key={m} className={`${styles.personCard} ${isPaid ? styles.paid : ''}`}>
                  <div className={styles.personHeader}>
                    <div className={styles.personLeft}>
                      {isOwner ? <span className={styles.payCheckPlaceholder} aria-hidden="true" /> : <button type="button" className={`${styles.payCheck} ${isPaid ? styles.payCheckOn : ''}`} onClick={() => togglePaid(m)} aria-pressed={isPaid} aria-label={isPaid ? t.markUnpaid : t.markPaid} title={isPaid ? t.markUnpaid : t.markPaid}>{isPaid && (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)}</button>}
                      <Avatar name={m} photoURL={user && ownerName && m.trim().toLowerCase() === ownerName ? user.photoURL : null} size={24} />
                      <span className={styles.personName}>{m}</span>
                      <span className={`${styles.payStatus} ${isOwner ? styles.payStatusOwner : (isPaid ? styles.payStatusPaid : styles.payStatusPending)}`}>{isOwner ? 'Owner' : (isPaid ? 'Paid' : 'Pending')}</span>
                    </div>
                    {hasBillDisc
                      ? <span className={styles.personAmountGroup}><span className={styles.personAmountPre}>{sym}{fmtC(undiscountedAmt)}</span><span className={styles.personAmountArrow}>→</span><span className={styles.personAmountPost}>{sym}{fmtC(finalAmt)}</span></span>
                      : <span className={styles.personAmount}>{sym}{fmtC(finalAmt)}</span>}
                  </div>
                  <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                  {foods.filter(f => f.who && f.who.includes(m) && f.name && parseFloat(f.price) > 0).length > 0 && (
                    <div className={styles.itemList}>
                      {foods.filter(f => f.who && f.who.includes(m) && f.name && parseFloat(f.price) > 0).map(f => (
                        <div key={f.id} className={styles.itemRow}>
                          <span className={styles.itemName}>· {f.name}</span>
                          <span className={styles.itemAmt}>{sym}{fmtC((parseFloat(f.price) / f.who.length) * result.multiplier)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showQR && ppValid && qrAmount > 0 && !isOwner && (
                    <PromptPayQR promptPay={promptPay} amount={qrAmount} name={m} />
                  )}
                </div>
              )
            })}
          </div>
          {(promptPay||bankInfo) && <div className={styles.payInfo}>{promptPay && <p className={styles.payLine}><span className={styles.payIcon}><SmartphoneIcon width={16} height={16} /></span>PromptPay: <strong>{promptPay}</strong>{!ppValid && <span className={styles.payWarn}><WarnIcon width={14} height={14} /> {t.promptPayInvalid}</span>}</p>}{bankInfo && <p className={styles.payLine} style={{whiteSpace:'pre-line'}}><span className={styles.payIcon}><BankIcon width={16} height={16} /></span>{bankInfo}</p>}</div>}
          {notes && <div className={styles.notes}><span className={styles.notesIcon}><NoteIcon width={16} height={16} /></span><span>{notes}</span></div>}
        </>
      )}
    </section>
  )
}
