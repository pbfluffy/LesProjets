import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { FormulaBar, ResultChip } from './shared'
import styles from './shared.module.css'

const SALES = [
  { branch: { th: 'สาขา A', en: 'Branch A' }, cat: { th: 'อาหาร', en: 'Food' }, amt: 12000 },
  { branch: { th: 'สาขา B', en: 'Branch B' }, cat: { th: 'เครื่องดื่ม', en: 'Drinks' }, amt: 8500 },
  { branch: { th: 'สาขา A', en: 'Branch A' }, cat: { th: 'เครื่องดื่ม', en: 'Drinks' }, amt: 5000 },
  { branch: { th: 'สาขา B', en: 'Branch B' }, cat: { th: 'อาหาร', en: 'Food' }, amt: 9200 },
  { branch: { th: 'สาขา A', en: 'Branch A' }, cat: { th: 'อาหาร', en: 'Food' }, amt: 7500 },
  { branch: { th: 'สาขา C', en: 'Branch C' }, cat: { th: 'อาหาร', en: 'Food' }, amt: 11000 },
  { branch: { th: 'สาขา B', en: 'Branch B' }, cat: { th: 'เครื่องดื่ม', en: 'Drinks' }, amt: 4300 },
  { branch: { th: 'สาขา C', en: 'Branch C' }, cat: { th: 'เครื่องดื่ม', en: 'Drinks' }, amt: 6800 },
]

const BRANCHES = [
  { th: 'สาขา A', en: 'Branch A' },
  { th: 'สาขา B', en: 'Branch B' },
  { th: 'สาขา C', en: 'Branch C' },
]

export default function SumifDemo() {
  const { lang } = useLang()
  const [br, setBr] = useState(BRANCHES[0])
  const total = SALES.filter(s => s.branch.en === br.en).reduce((a, b) => a + b.amt, 0)

  const criteriaLabel = lang === 'th' ? 'เลือกเงื่อนไข (criteria)' : 'Pick a criteria'
  const headers = {
    th: { branch: 'A — สาขา', cat: 'B — หมวด', amt: 'C — ยอดขาย' },
    en: { branch: 'A — Branch', cat: 'B — Category', amt: 'C — Sales' },
  }[lang]

  return (
    <div>
      <FormulaBar formula={`=SUMIF(A2:A9,"${br[lang]}",C2:C9)`} />

      <div style={{ marginBottom: 10 }}>
        <div className={styles.label}>{criteriaLabel}</div>
        <div className={styles.toggleRow}>
          {BRANCHES.map(b => (
            <button
              key={b.en}
              onClick={() => setBr(b)}
              data-active={br.en === b.en}
              className={styles.toggleBtn}
              style={{
                borderColor: br.en === b.en ? '#f59e0b' : 'var(--border)',
                background: br.en === b.en ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface)',
                color: br.en === b.en ? '#d97706' : 'var(--text-muted)',
              }}
            >
              {b[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.table}>
        <div
          className={styles.tableHead}
          style={{ gridTemplateColumns: '1fr 1fr 90px' }}
        >
          <span>{headers.branch}</span>
          <span>{headers.cat}</span>
          <span>{headers.amt}</span>
        </div>
        {SALES.map((s, i) => {
          const match = s.branch.en === br.en
          return (
            <div
              key={i}
              className={styles.tableRow}
              style={{
                gridTemplateColumns: '1fr 1fr 90px',
                background: match ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface)',
                color: match ? '#92400e' : 'var(--text)',
                fontWeight: match ? 700 : 400,
              }}
            >
              <span>{s.branch[lang]}</span>
              <span>{s.cat[lang]}</span>
              <span>฿{s.amt.toLocaleString()}</span>
            </div>
          )
        })}
      </div>
      <ResultChip label={`฿${total.toLocaleString()}`} accent="#f59e0b" />
    </div>
  )
}
