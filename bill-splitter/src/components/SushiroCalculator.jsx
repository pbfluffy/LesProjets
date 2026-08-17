import { useState, useEffect, useRef } from 'react'
import { useSushiroStore, PLATES } from '../hooks/useSushiroStore'
import { useLang } from '../LangContext'
import { buildShareUrl, createShortLink } from '../share'
import { auth, onAuthStateChanged } from '../firebase'
import styles from './SushiroCalculator.module.css'
import { CopyIcon, ShareIcon, QrIcon, SmartphoneIcon, WarnIcon, BankIcon, NoteIcon } from './icons'
import Avatar from './Avatar'
import { isValidPromptPayId } from '../promptpay'
import PromptPayQR from './PromptPayQR'
import extras from './ExtrasSection.module.css'

const fmt = n => n.toFixed(2)
const fieldsetReset = { border: 0, padding: 0, margin: 0, minInlineSize: 'auto' }

function Counter({ value, onInc, onDec }) {
  return (
    <div className={styles.counter}>
      <button type="button" className={styles.cntBtn} onClick={onDec}>−</button>
      <span className={styles.cntVal}>{value}</span>
      <button type="button" className={styles.cntBtn} onClick={onInc}>+</button>
    </div>
  )
}

function SnackAdder({ person, onAdd }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const handleAdd = () => { const ok = onAdd(person, name, price); if (ok) { setName(''); setPrice('') } }
  return (
    <div className={styles.snackAdder}>
      <input type="text" placeholder={t.snackName} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackName} />
      <div className={styles.snackPriceWrap}>
        <span className={styles.bahtSign}>฿</span>
        <input type="number" placeholder={t.snackPrice} value={price} min="0" onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className={styles.snackPrice} />
      </div>
      <button type="button" className={styles.snackAddBtn} onClick={handleAdd}>+</button>
    </div>
  )
}

export default function SushiroCalculator({ sharedState, readOnly, onSaveBill, savedPayees = [], onSavePayee, onRemovePayee, payeesEnabled = false }) {
  const store = useSushiroStore(sharedState)
  const result = store.calculate()
  const { t } = useLang()
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [toast, setToast] = useState('')
  const [user, setUser] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const summaryRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [creatingLink, setCreatingLink] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [ppOpen, setPpOpen] = useState(false)
  const [ppCopied, setPpCopied] = useState(false)
  // #96 saved payees (Sushiro parity — shares the same userPayees doc as Split)
  const [payeeManaging, setPayeeManaging] = useState(false)
  const [payeeSaving, setPayeeSaving] = useState(false)
  const [payeeName, setPayeeName] = useState('')
  const ppTrim = (store.promptPay || '').trim()
  const payeeAlreadySaved = savedPayees.some(p => p.promptPay === ppTrim)
  const payeesOn = payeesEnabled && !readOnly
  const handleSavePayee = () => {
    const n = payeeName.trim()
    if (!n || !ppTrim) return
    onSavePayee?.(n, ppTrim)
    setPayeeName('')
    setPayeeSaving(false)
  }
  const cancelSavePayee = () => { setPayeeName(''); setPayeeSaving(false) }
  const ppValid = isValidPromptPayId(store.promptPay)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!moreOpen) return
    const onClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [moreOpen])

  const handleAddPerson = () => {
    const ok = store.addPerson(nameInput)
    if (ok) { setNameInput(''); setNameError('') }
    else if (nameInput.trim()) { setNameError(t.nameTaken); setTimeout(() => setNameError(''), 1500) }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const buildSnapshot = () => ({
    people: store.people,
    activePerson: store.activePerson,
    plates: store.plates,
    snacks: store.snacks,
    vatEnabled: store.vatEnabled,
    serviceChargeEnabled: store.serviceChargeEnabled,
    promptPay: store.promptPay,
    bankInfo: store.bankInfo,
    notes: store.notes,
  })

  const buildSummaryText = () => {
    const prefix = t.sushiroSharePrefix
    const lines = [prefix, '']
    store.people.forEach(name => {
      const total = result.personTotals[name] ?? 0
      lines.push(`${name}: ฿${fmt(total)}`)
    })
    lines.push('')
    lines.push(`${t.shareTotal} ฿${fmt(result.grandTotal)}`)
    if (store.promptPay) lines.push(`PromptPay: ${store.promptPay}`)
    if (store.bankInfo) lines.push(store.bankInfo)
    if (store.notes) lines.push(store.notes)
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
    setCreatingLink(true)
    try {
      url = await createShortLink('sushi', buildSnapshot(), user?.uid || null)
    } catch (e) {
      // Silent fallback to long URL on Firestore failure
      url = buildShareUrl('sushi', buildSnapshot())
    }
    setCreatingLink(false)

    if (navigator.share) {
      try {
        await navigator.share({ title: t.sushiroSharePrefix, text, url })
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
    if (onSaveBill) { onSaveBill('sushi', buildSnapshot()); showToast(t.saved) }
  }

  // Save image — capture the summary section to PNG, share on mobile / download on desktop.
  const handleSaveImage = async () => {
    if (!summaryRef.current || capturing) return
    setCapturing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const bg = getComputedStyle(summaryRef.current).backgroundColor || '#ffffff'
      const canvas = await html2canvas(summaryRef.current, {
        backgroundColor: bg,
        scale: 2,
        useCORS: true,
        ignoreElements: (el) => el.hasAttribute && el.hasAttribute('data-snapshot-hide'),
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) { showToast(t.imageFailed); return }
      const base = (store.billName && store.billName.trim()) ? store.billName.trim() : 'sushiro'
      const safeName = base.replace(/[^\w\u0E00-\u0E7F-]+/g, '_')
      const filename = `${safeName}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file], title: t.appName })
          showToast(t.imageShared)
          return
        } catch (e) {
          if (e && e.name === 'AbortError') return
        }
      }
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

  // Phase F — match Split tab: pass Google photoURL only when a person's name
  // matches the signed-in owner (case-insensitive, trimmed).
  const ownerName = user?.displayName?.trim().toLowerCase()
  const photoForName = (n) =>
    user && ownerName && n.trim().toLowerCase() === ownerName ? user.photoURL : null

  return (
    <div>
      <fieldset disabled={readOnly} style={fieldsetReset}>
        <section className={styles.section}>
          <h2 className={styles.title}>{t.people}</h2>
          <div className={styles.inputRow}>
            <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPerson()} placeholder={t.personPlaceholder} className={nameError ? styles.inputError : ''} />
            <button type="button" className={styles.addBtn} onClick={handleAddPerson}>{t.addPerson}</button>
          </div>
          {nameError && <p className={styles.error}>{nameError}</p>}
          {store.people.length > 0 && (
            <div className={styles.personTabs}>
              {store.people.map(name => (
                <button type="button" key={name} className={`${styles.personTab} ${store.activePerson === name ? styles.personTabActive : ''}`} onClick={() => store.setActivePerson(name)}>
                  <Avatar name={name} photoURL={photoForName(name)} size={20} />
                  {name}
                  <span className={styles.removePersonBtn} onClick={e => { e.stopPropagation(); store.removePerson(name) }}>×</span>
                </button>
              ))}
            </div>
          )}
          {store.people.length === 0 && <p className={styles.empty}>{t.addEmpty}</p>}
        </section>

        {store.activePerson && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.title}>{t.platesOf} <span className={styles.activePersonBadge}>{store.activePerson}</span></h2>
              <button type="button" className={styles.resetBtn} onClick={store.resetAll}>{t.resetAll}</button>
            </div>
            <div className={styles.plateList}>
              {PLATES.map(plate => {
                const count = (store.plates[store.activePerson] ?? {})[plate.id] ?? 0
                return (
                  <div key={plate.id} className={styles.plateRow}>
                    <span className={styles.dot} style={{ background: plate.color, border: `2px solid ${plate.border}` }} />
                    <span className={styles.plateName}>{plate.label}</span>
                    <span className={styles.platePriceTag}>฿{plate.price}</span>
                    <Counter value={count} onInc={() => store.changePlate(store.activePerson, plate.id, 1)} onDec={() => store.changePlate(store.activePerson, plate.id, -1)} />
                    {count > 0 && <span className={styles.plateSubtotal}>฿{count * plate.price}</span>}
                  </div>
                )
              })}
            </div>
            <div className={styles.snackSection}>
              <div className={styles.snackTitle}>{t.snacks}</div>
              {(store.snacks[store.activePerson] ?? []).map(snack => (
                <div key={snack.id} className={styles.snackRow}>
                  <span className={styles.snackRowName}>{snack.name}</span>
                  <span className={styles.snackRowPrice}>฿{snack.price % 1 === 0 ? snack.price : fmt(snack.price)}</span>
                  <button type="button" className={styles.snackRemove} onClick={() => store.removeSnack(store.activePerson, snack.id)}>×</button>
                </div>
              ))}
              <SnackAdder person={store.activePerson} onAdd={store.addSnack} />
            </div>
            {(() => { const sub = result.personSubtotals[store.activePerson] ?? 0; return sub > 0 ? (<div className={styles.personSubBar}><span>{t.subtotalOf} {store.activePerson}</span><span className={styles.personSubAmt}>฿{sub.toLocaleString()}</span></div>) : null })()}
          </section>
        )}

        {store.people.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.title}>{t.options}</h2>
            <div className={styles.toggles}>
              <label className={styles.toggle}><input type="checkbox" checked={store.vatEnabled} onChange={e => store.setVatEnabled(e.target.checked)} /><span>{t.vat}</span><span className={`${styles.badge} ${styles.blue}`}>7%</span></label>
              <label className={styles.toggle}><input type="checkbox" checked={store.serviceChargeEnabled} onChange={e => store.setServiceChargeEnabled(e.target.checked)} /><span>{t.serviceCharge}</span><span className={`${styles.badge} ${styles.green}`}>10%</span></label>
            </div>
            <div className={extras.divider} />
            <div className={extras.ppHeader}>
              <span className={extras.ppLabel}>PromptPay</span>
              <button type="button" className={extras.toggleBtn} onClick={() => setPpOpen(o => !o)}>{ppOpen ? t.close : t.edit}</button>
            </div>
            {payeesOn && savedPayees.length > 0 && (
              <div className={extras.payeeBlock}>
                <div className={extras.payeeHead}>
                  <span className={extras.payeeHeadLabel}>{t.savedPayees}</span>
                  <button type="button" className={extras.payeeManageBtn} onClick={() => setPayeeManaging(m => !m)}>{payeeManaging ? t.payeeDone : t.payeeManage}</button>
                </div>
                <div className={extras.payeeChips}>
                  {savedPayees.map(p => (
                    <span key={p.id} className={extras.payeeChipWrap}>
                      <button type="button" className={`${extras.payeeChip} ${p.promptPay === ppTrim ? extras.payeeChipActive : ''}`} onClick={() => store.setPromptPay(p.promptPay)} title={p.promptPay}>{p.name}</button>
                      {payeeManaging && (
                        <button type="button" className={extras.payeeRemove} onClick={() => onRemovePayee?.(p.id)} aria-label={t.removePayee}>×</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ppOpen && (
              <input type="text" placeholder={t.ppPlaceholder} value={store.promptPay} onChange={e => store.setPromptPay(e.target.value)} className={extras.ppInput} />
            )}
            {store.promptPay && !ppOpen && (
              <div className={extras.ppDisplay}>
                <span className={extras.ppNumber}>{store.promptPay}</span>
                <button type="button" className={extras.copyBtn} onClick={() => { navigator.clipboard?.writeText(store.promptPay); setPpCopied(true); setTimeout(() => setPpCopied(false), 1500) }}>{ppCopied ? t.copied : t.copy}</button>
              </div>
            )}
            {!store.promptPay && !ppOpen && <p className={extras.ppEmpty}>{t.notSet}</p>}
            {payeesOn && ppTrim && !payeeAlreadySaved && (
              payeeSaving ? (
                <div className={extras.payeeSaveForm}>
                  <input type="text" className={extras.payeeNameInput} value={payeeName} onChange={e => setPayeeName(e.target.value)} placeholder={t.payeeNamePh} maxLength={30} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSavePayee(); if (e.key === 'Escape') cancelSavePayee() }} />
                  <button type="button" className={extras.payeeSaveBtn} onClick={handleSavePayee} disabled={!payeeName.trim()}>{t.payeeSave}</button>
                  <button type="button" className={extras.payeeCancelBtn} onClick={cancelSavePayee}>{t.close}</button>
                </div>
              ) : (
                <button type="button" className={extras.payeeSaveLink} onClick={() => setPayeeSaving(true)} title={t.savePayeeHint}>+ {t.payeeSave}</button>
              )
            )}
            <div className={extras.divider} />
            <label className={extras.fieldLabel}>{t.bankLabel}</label>
            <textarea className={extras.textarea} rows={3} placeholder={t.bankPlaceholder} value={store.bankInfo} onChange={e => store.setBankInfo(e.target.value)} />
            <label className={extras.fieldLabel} style={{ marginTop: 10 }}>{t.notesLabel}</label>
            <textarea className={extras.textarea} rows={2} placeholder={t.notesPlaceholder} value={store.notes} onChange={e => store.setNotes(e.target.value)} />
          </section>
        )}
      </fieldset>

      {store.people.length > 0 && result.totalPlates > 0 && (
        <section ref={summaryRef} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>{t.summary}</h2>
            <div className={styles.shareBtnGroup} data-snapshot-hide>
              <div style={{ position: 'relative' }} ref={moreRef}>
                <button type="button" className={styles.shareBtn} onClick={() => setMoreOpen(o => !o)} aria-haspopup="true" aria-expanded={moreOpen}>{t.more} ▾</button>
                {moreOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 10, background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #ddd)', borderRadius: 8, padding: 4, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {onSaveBill && (
                      <button type="button" className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleSave(); setMoreOpen(false) }}>{t.saveBill}</button>
                    )}
                    <button type="button" className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleCopyText(); setMoreOpen(false) }}><CopyIcon style={{ width: 15, height: 15 }} /> {t.copy}</button>
                    <button type="button" className={styles.shareBtn} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { handleSaveImage(); setMoreOpen(false) }} disabled={capturing} title={t.saveImage}>{t.saveImage}</button>
                  </div>
                )}
              </div>
              <button type="button" className={styles.shareBtn} style={{ background: 'var(--accent, #4f46e5)', color: 'white', fontWeight: 600 }} onClick={handleShareLink} disabled={creatingLink}>{creatingLink ? t.shareCreating : <><ShareIcon style={{ width: 15, height: 15 }} /> {t.shareLink}</>}</button>
            </div>
          </div>
          {toast && <div className={styles.toast}>{toast}</div>}
          {ppValid && (
            <div className={styles.qrToggleRow} data-snapshot-hide>
              <button type="button" className={styles.qrToggleBtn} onClick={() => setShowQR(v => !v)} aria-pressed={showQR}><QrIcon width={15} height={15} /> {showQR ? t.hideQR : t.showQR}</button>
            </div>
          )}
          <div className={styles.personSummaryList}>
            {store.people.map(name => {
              const total = result.personTotals[name] ?? 0
              const pct = result.grandTotal > 0 ? (total / result.grandTotal) * 100 : 0
              const usedPlates = PLATES.filter(p => ((store.plates[name] ?? {})[p.id] ?? 0) > 0)
              const personSnacks = store.snacks[name] ?? []
              return (
                <div key={name} className={styles.personSummaryCard}>
                  <div className={styles.personSummaryHeader}>
                    <div className={styles.personSummaryLeft}>
                      <Avatar name={name} photoURL={photoForName(name)} size={24} />
                      <div>
                        <div className={styles.personSummaryName}>{name}</div>
                        <div className={styles.personPlateDots}>
                          {usedPlates.map(p => <span key={p.id} className={styles.plateDotSmall} style={{ background: p.color, border: `1px solid ${p.border}` }} title={p.label} />)}
                          {usedPlates.length > 0 && <span className={styles.personPlateCount}>{PLATES.reduce((s,p) => s+((store.plates[name]??{})[p.id]??0),0)} {t.plates}</span>}
                          {personSnacks.length > 0 && <span className={styles.snackCount}>+ {personSnacks.length} {t.items}</span>}
                        </div>
                      </div>
                    </div>
                    <span className={styles.personSummaryAmt}>฿{fmt(total)}</span>
                  </div>
                  <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                  {showQR && ppValid && total > 0 && (
                    <PromptPayQR promptPay={store.promptPay} amount={total} name={name} reference={store.billName} />
                  )}
                </div>
              )
            })}
          </div>
          <div className={styles.grandTotalBox}>
            <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>{t.foodSubtotal}</span><span>฿{fmt(result.subtotal)}</span></div>
            {result.serviceCharge > 0 && <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>{t.serviceCharge} (10%)</span><span>฿{fmt(result.serviceCharge)}</span></div>}
            {result.vat > 0 && <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>{t.vat} (7%)</span><span>฿{fmt(result.vat)}</span></div>}
            <div className={`${styles.grandTotalRow} ${styles.grandTotalFinal}`}><span>{t.grandTotal} ({result.totalPlates} {t.plates})</span><span>฿{fmt(result.grandTotal)}</span></div>
          </div>
          {(store.promptPay || store.bankInfo) && (
            <div className={styles.payInfo}>
              {store.promptPay && <p className={styles.payLine}><span className={styles.payIcon}><SmartphoneIcon width={16} height={16} /></span>PromptPay: <strong>{store.promptPay}</strong>{!ppValid && <span className={styles.payWarn}><WarnIcon width={14} height={14} /> {t.promptPayInvalid}</span>}</p>}
              {store.bankInfo && <p className={styles.payLine} style={{ whiteSpace: 'pre-line' }}><span className={styles.payIcon}><BankIcon width={16} height={16} /></span>{store.bankInfo}</p>}
            </div>
          )}
          {store.notes && <div className={styles.notes}><span className={styles.notesIcon}><NoteIcon width={16} height={16} /></span><span>{store.notes}</span></div>}
        </section>
      )}
    </div>
  )
}
