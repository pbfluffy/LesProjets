import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { FormulaBar, ResultChip } from './shared'
import styles from './shared.module.css'

const PEOPLE = [
  { name: { th: 'สมชาย', en: 'Somchai' }, score: 82, res: 'pass' },
  { name: { th: 'สมหญิง', en: 'Somying' }, score: 45, res: 'fail' },
  { name: { th: 'วิชัย', en: 'Wichai' }, score: 91, res: 'pass' },
  { name: { th: 'มาลี', en: 'Malee' }, score: 38, res: 'fail' },
  { name: { th: 'กานต์', en: 'Karn' }, score: 67, res: 'pass' },
  { name: { th: 'ปาล์ม', en: 'Palm' }, score: 55, res: 'pass' },
]

const RES_LABELS = {
  th: { pass: 'ผ่าน', fail: 'ไม่ผ่าน' },
  en: { pass: 'Pass', fail: 'Fail' },
}

export default function CountifDemo() {
  const { lang } = useLang()
  const [crit, setCrit] = useState('pass')
  const count = PEOPLE.filter(p => p.res === crit).length
  const labels = RES_LABELS[lang]

  const headers = {
    th: { name: 'A — ชื่อ', score: 'B — คะแนน', res: 'C — ผล ← นับที่นี่' },
    en: { name: 'A — Name', score: 'B — Score', res: 'C — Result ← count here' },
  }[lang]

  const peopleSuffix = lang === 'th' ? 'คน' : 'people'

  return (
    <div>
      <FormulaBar formula={`=COUNTIF(C2:C7,"${labels[crit]}")`} />

      <div className={styles.toggleRow} style={{ marginBottom: 10 }}>
        {['pass', 'fail'].map(c => (
          <button
            key={c}
            onClick={() => setCrit(c)}
            data-active={crit === c}
            className={styles.toggleBtn}
            style={{
              borderColor: crit === c ? '#ec4899' : 'var(--border)',
              background: crit === c ? 'rgba(236, 72, 153, 0.1)' : 'var(--surface)',
              color: crit === c ? '#be185d' : 'var(--text-muted)',
            }}
          >
            {labels[c]}
          </button>
        ))}
      </div>

      <div className={styles.table}>
        <div
          className={styles.tableHead}
          style={{ gridTemplateColumns: '1fr 70px 90px' }}
        >
          <span>{headers.name}</span>
          <span>{headers.score}</span>
          <span>{headers.res}</span>
        </div>
        {PEOPLE.map((p, i) => {
          const match = p.res === crit
          return (
            <div
              key={i}
              className={styles.tableRow}
              style={{
                gridTemplateColumns: '1fr 70px 90px',
                background: match ? 'rgba(236, 72, 153, 0.08)' : 'var(--surface)',
              }}
            >
              <span style={{ color: 'var(--text)' }}>{p.name[lang]}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                {p.score}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: p.res === 'pass' ? '#16a34a' : '#ef4444',
                }}
              >
                {labels[p.res]}
              </span>
            </div>
          )
        })}
      </div>
      <ResultChip label={`${count} ${peopleSuffix}`} accent="#ec4899" />
    </div>
  )
}
