import { useSushiroStore } from '../hooks/useSushiroStore'
import styles from './SushiroCalculator.module.css'
function fmt(n) { return n.toFixed(2) }
function Counter({ value, onInc, onDec }) {
  return <div className={styles.counter}><button className={styles.cntBtn} onClick={onDec}>−</button><span className={styles.cntVal}>{value}</span><button className={styles.cntBtn} onClick={onInc}>+</button></div>
}
export default function SushiroCalculator() {
  const store = useSushiroStore()
  const result = store.calculate()
  return (
    <div>
      <section className={styles.section}>
        <div className={styles.sectionHeader}><h2 className={styles.title}>นับจาน</h2><button className={styles.resetBtn} onClick={store.resetPlates}>รีเซ็ต</button></div>
        <div className={styles.plateList}>{store.plates.map(plate => (<div key={plate.id} className={styles.plateRow}><span className={styles.dot} style={{background:plate.color}} /><span className={styles.plateName}>{plate.label}</span><span className={styles.platePriceTag}>฿{plate.price}</span><Counter value={plate.count} onInc={() => store.changePlate(plate.id,1)} onDec={() => store.changePlate(plate.id,-1)} />{plate.count>0&&<span className={styles.plateSubtotal}>฿{plate.count*plate.price}</span>}</div>))}</div>
      </section>
      <section className={styles.section}>
        <h2 className={styles.title}>ตัวเลือก</h2>
        <div className={styles.optRow}><span className={styles.optLabel}>จำนวนคน</span><Counter value={store.people} onInc={() => store.changePeople(1)} onDec={() => store.changePeople(-1)} /></div>
        <div className={styles.toggles}>
          <label className={styles.toggle}><input type="checkbox" checked={store.vatEnabled} onChange={e => store.setVatEnabled(e.target.checked)} /><span>VAT</span><span className={`${styles.badge} ${styles.blue}`}>7%</span></label>
          <label className={styles.toggle}><input type="checkbox" checked={store.serviceChargeEnabled} onChange={e => store.setServiceChargeEnabled(e.target.checked)} /><span>Service Charge</span><span className={`${styles.badge} ${styles.green}`}>10%</span></label>
        </div>
      </section>
      <section className={styles.section}>
        <h2 className={styles.title}>สรุป</h2>
        {result.totalPlates===0?<p className={styles.empty}>ยังไม่ได้นับจาน</p>:<><div className={styles.summary}>{store.plates.filter(p=>p.count>0).map(p=>(<div key={p.id} className={styles.summaryRow}><span className={styles.summaryLabel}><span className={styles.dotSmall} style={{background:p.color}}/>{p.label} ×{p.count}</span><span className={styles.summaryVal}>฿{p.count*p.price}</span></div>))}{result.serviceCharge>0&&<div className={styles.summaryRow}><span className={styles.summaryLabel}>Service Charge (10%)</span><span className={styles.summaryVal}>฿{fmt(result.serviceCharge)}</span></div>}{result.vat>0&&<div className={styles.summaryRow}><span className={styles.summaryLabel}>VAT (7%)</span><span className={styles.summaryVal}>฿{fmt(result.vat)}</span></div>}<div className={styles.totalRow}><span>รวม ({result.totalPlates} จาน)</span><span className={styles.totalAmt}>฿{fmt(result.grandTotal)}</span></div></div><div className={styles.perPerson}><div className={styles.perPersonLabel}>คนละประมาณ</div><div className={styles.perPersonAmt}>฿{fmt(result.perPerson)}</div><div className={styles.perPersonSub}>หาร {store.people} คน</div></div></> }
      </section>
    </div>
  )
}
