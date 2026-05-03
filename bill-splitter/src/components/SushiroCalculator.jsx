import { useState } from 'react'
import { useSushiroStore, PLATES } from '../hooks/useSushiroStore'
import styles from './SushiroCalculator.module.css'

const fmt = n => n.toFixed(2)

function Counter({ value, onInc, onDec }) {
  return (
    <div className={styles.counter}>
      <button className={styles.cntBtn} onClick={onDec}>\u2212</button>
      <span className={styles.cntVal}>{value}</span>
      <button className={styles.cntBtn} onClick={onInc}>+</button>
    </div>
  )
}

export default function SushiroCalculator() {
  const store = useSushiroStore()
  const result = store.calculate()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    const ok = store.addPerson(input)
    if (ok) { setInput(''); setError('') }
    else if (input.trim()) { setError('\u0e0a\u0e37\u0e48\u0e2d\u0e19\u0e35\u0e49\u0e21\u0e35\u0e41\u0e25\u0e49\u0e27'); setTimeout(() => setError(''), 1500) }
  }

  return (
    <div>
      <section className={styles.section}>
        <h2 className={styles.title}>\u0e04\u0e19\u0e17\u0e35\u0e48\u0e01\u0e34\u0e19</h2>
        <div className={styles.inputRow}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="\u0e0a\u0e37\u0e48\u0e2d \u0e40\u0e0a\u0e48\u0e19 \u0e41\u0e2d\u0e19, \u0e1a\u0e2d\u0e21"
            className={error ? styles.inputError : ''} />
          <button className={styles.addBtn} onClick={handleAdd}>+ \u0e40\u0e1e\u0e34\u0e48\u0e21</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {store.people.length > 0 && (
          <div className={styles.personTabs}>
            {store.people.map(name => (
              <button key={name}
                className={`${styles.personTab} ${store.activePerson === name ? styles.personTabActive : ''}`}
                onClick={() => store.setActivePerson(name)}>
                <span className={styles.personAvatar}>{name.charAt(0).toUpperCase()}</span>
                {name}
                <span className={styles.removePersonBtn}
                  onClick={e => { e.stopPropagation(); store.removePerson(name) }}>\u00d7</span>
              </button>
            ))}
          </div>
        )}
        {store.people.length === 0 && <p className={styles.empty}>\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e0a\u0e37\u0e48\u0e2d\u0e04\u0e19\u0e01\u0e48\u0e2d\u0e19 \u0e41\u0e25\u0e49\u0e27\u0e04\u0e48\u0e2d\u0e22\u0e19\u0e31\u0e1a\u0e08\u0e32\u0e19\u0e43\u0e2b\u0e49\u0e41\u0e15\u0e48\u0e25\u0e30\u0e04\u0e19</p>}
      </section>

      {store.activePerson && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>
              \u0e08\u0e32\u0e19\u0e02\u0e2d\u0e07
              <span className={styles.activePersonBadge}>{store.activePerson}</span>
            </h2>
            <button className={styles.resetBtn} onClick={store.resetAll}>\u0e23\u0e35\u0e40\u0e0b\u0e47\u0e15\u0e17\u0e38\u0e01\u0e04\u0e19</button>
          </div>
          <div className={styles.plateList}>
            {PLATES.map(plate => {
              const count = store.counts[store.activePerson]?.[plate.id] ?? 0
              return (
                <div key={plate.id} className={styles.plateRow}>
                  <span className={styles.dot} style={{ background: plate.color }} />
                  <span className={styles.plateName}>{plate.label}</span>
                  <span className={styles.platePriceTag}>\u0e3f{plate.price}</span>
                  <Counter value={count}
                    onInc={() => store.changePlate(store.activePerson, plate.id, 1)}
                    onDec={() => store.changePlate(store.activePerson, plate.id, -1)} />
                  {count > 0 && <span className={styles.plateSubtotal}>\u0e3f{count * plate.price}</span>}
                </div>
              )
            })}
          </div>
          {(() => {
            const sub = result.personSubtotals[store.activePerson] ?? 0
            return sub > 0 ? (
              <div className={styles.personSubBar}>
                <span>\u0e23\u0e27\u0e21\u0e02\u0e2d\u0e07 {store.activePerson}</span>
                <span className={styles.personSubAmt}>\u0e3f{sub.toLocaleString()}</span>
              </div>
            ) : null
          })()}
        </section>
      )}

      {store.people.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.title}>\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01</h2>
          <div className={styles.toggles}>
            <label className={styles.toggle}>
              <input type="checkbox" checked={store.vatEnabled} onChange={e => store.setVatEnabled(e.target.checked)} />
              <span>VAT</span><span className={`${styles.badge} ${styles.blue}`}>7%</span>
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={store.serviceChargeEnabled} onChange={e => store.setServiceChargeEnabled(e.target.checked)} />
              <span>Service Charge</span><span className={`${styles.badge} ${styles.green}`}>10%</span>
            </label>
          </div>
        </section>
      )}

      {store.people.length > 0 && result.totalPlates > 0 && (
        <section className={styles.section}>
          <h2 className={styles.title}>\u0e2a\u0e23\u0e38\u0e1b\u0e23\u0e32\u0e22\u0e04\u0e19</h2>
          <div className={styles.personSummaryList}>
            {store.people.map(name => {
              const total = result.personTotals[name] ?? 0
              const pct = result.grandTotal > 0 ? (total / result.grandTotal) * 100 : 0
              const plateCounts = PLATES.filter(p => (store.counts[name]?.[p.id] ?? 0) > 0)
              return (
                <div key={name} className={styles.personSummaryCard}>
                  <div className={styles.personSummaryHeader}>
                    <div className={styles.personSummaryLeft}>
                      <span className={styles.personAvatar}>{name.charAt(0).toUpperCase()}</span>
                      <div>
                        <div className={styles.personSummaryName}>{name}</div>
                        {plateCounts.length > 0 && (
                          <div className={styles.personPlateDots}>
                            {plateCounts.map(p => <span key={p.id} className={styles.plateDotSmall} style={{ background: p.color }} />)}
                            <span className={styles.personPlateCount}>
                              {PLATES.reduce((s, p) => s + (store.counts[name]?.[p.id] ?? 0), 0)} \u0e08\u0e32\u0e19
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={styles.personSummaryAmt}>\u0e3f{fmt(total)}</span>
                  </div>
                  <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>
          <div className={styles.grandTotalBox}>
            <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>\u0e22\u0e2d\u0e14\u0e2d\u0e32\u0e2b\u0e32\u0e23</span><span>\u0e3f{fmt(result.subtotal)}</span></div>
            {result.serviceCharge > 0 && <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>Service Charge (10%)</span><span>\u0e3f{fmt(result.serviceCharge)}</span></div>}
            {result.vat > 0 && <div className={styles.grandTotalRow}><span className={styles.grandTotalLabel}>VAT (7%)</span><span>\u0e3f{fmt(result.vat)}</span></div>}
            <div className={`${styles.grandTotalRow} ${styles.grandTotalFinal}`}>
              <span>\u0e23\u0e27\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 ({result.totalPlates} \u0e08\u0e32\u0e19)</span>
              <span>\u0e3f{fmt(result.grandTotal)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
