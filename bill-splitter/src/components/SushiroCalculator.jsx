import { useState, useEffect } from 'react'
import { useSushiroStore, PLATES } from '../hooks/useSushiroStore'
import { useLang } from '../LangContext'
import { buildShareUrl, createShortLink } from '../share'
import { auth, onAuthStateChanged } from '../firebase'
import styles from './SushiroCalculator.module.css'

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

export default function SushiroCalculator({ sharedState, readOnly }) {
  const store = useSushiroStore(sharedState)
  const result = store.calculate()
  const { t } = useLang()
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [toast, setToast] = useState('')
  const [user, setUser] = useState(null)
  const [useShortLink, setUseShortLink] = useState(false)
  const [creatingLink, setCreatingLink] = useState(false)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

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
        url = await createShortLink('sushi', buildSnapshot(), user.uid)
      } catch (e) {
        setCreatingLink(false)
        showToast(t.shareError)
        return
      }
      setCreatingLink(false)
    } else {
      url = buildShareUrl('sushi', buildSnapshot())
    }

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
                  <span className={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
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
          </section>
        )}
      </fieldset>

      {store.people.length > 0 && result.totalPlates > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>{t.summary}</h2>
            <div className={styles.shareBtnGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, width: '100%', cursor: user ? 'pointer' : 'not-allowed', opacity: user ? 1 : 0.6 }}>
                <input type="checkbox" checked={useShortLink} onChange={(e) => setUseShortLink(e.target.checked)} disabled={!user || creatingLink} />
                {t.shareShortLink}
                {!user && <span style={{ fontSize: 10, color: 'var(--text-muted, #888)' }}>({t.shareShortLinkSignedOut})</span>}
                {creatingLink && <span style={{ fontSize: 10 }}>{t.shareCreating}</span>}
              </label>
              <button type="button" className={styles.shareBtn} onClick={handleCopyText} title={t.copySummary}>📋 {t.copy}</button>
              <button type="button" className={styles.shareBtn} onClick={handleShareLink}>{t.shareLink}</button>
            </div>
          </div>
          {toast && <div className={styles.toast}>{toast}</div>}
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
                      <span className={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
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
        </section>
      )}
    </div>
  )
}
