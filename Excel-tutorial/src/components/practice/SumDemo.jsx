import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { FormulaBar } from './shared'
import styles from './shared.module.css'

const LABELS = {
  th: ['ค่าอาหาร', 'ค่าเดินทาง', 'ค่าที่พัก', 'ค่าอื่นๆ'],
  en: ['Food', 'Transport', 'Lodging', 'Other'],
}

export default function SumDemo() {
  const { lang } = useLang()
  const [vals, setVals] = useState([350, 120, 800, 200])
  const total = vals.reduce((a, v) => a + (parseFloat(v) || 0), 0)
  const labels = LABELS[lang]
  const totalLabel = lang === 'th' ? 'รวมทั้งหมด' : 'Grand total'
  const colA = lang === 'th' ? 'A (รายการ)' : 'A (item)'
  const colB = lang === 'th' ? 'B (จำนวนเงิน)' : 'B (amount)'

  return (
    <div>
      <FormulaBar formula="=SUM(B2:B5)" />
      <div className={styles.table}>
        <div
          className={styles.tableHead}
          style={{ gridTemplateColumns: '30px 1fr 1fr' }}
        >
          <span></span>
          <span>{colA}</span>
          <span>{colB}</span>
        </div>
        {labels.map((lb, i) => (
          <div
            key={i}
            className={styles.tableRow}
            style={{ gridTemplateColumns: '30px 1fr 1fr', background: 'var(--surface)' }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{i + 2}</span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{lb}</span>
            <input
              type="number"
              value={vals[i]}
              onChange={e => {
                const n = [...vals]
                n[i] = e.target.value
                setVals(n)
              }}
              className={styles.tableInput}
            />
          </div>
        ))}
        <div
          className={styles.tableRow}
          style={{
            gridTemplateColumns: '30px 1fr 1fr',
            background: 'rgba(16, 185, 129, 0.1)',
            borderTop: '2px solid rgba(16, 185, 129, 0.4)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>6</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
            {totalLabel}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 800,
              color: '#10b981',
            }}
          >
            ฿{total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
