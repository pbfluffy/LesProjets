import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { FormulaBar, ResultChip } from './shared'
import styles from './shared.module.css'

const PRODS = [
  { code: 'P001', name: { th: 'แล็ปท็อป', en: 'Laptop' }, price: 25900, stock: 12 },
  { code: 'P002', name: { th: 'เมาส์ไร้สาย', en: 'Wireless mouse' }, price: 890, stock: 45 },
  { code: 'P003', name: { th: 'คีย์บอร์ด', en: 'Keyboard' }, price: 1290, stock: 28 },
  { code: 'P004', name: { th: 'หูฟัง', en: 'Headphones' }, price: 2500, stock: 0 },
  { code: 'P005', name: { th: 'เว็บแคม', en: 'Webcam' }, price: 1800, stock: 7 },
]

export default function VlookupDemo() {
  const { lang } = useLang()
  const [q, setQ] = useState('P002')
  const [col, setCol] = useState(2)
  const found = PRODS.find(p => p.code === q.toUpperCase().trim())

  const colMap = {
    1: found?.code,
    2: found?.name[lang],
    3: found ? `฿${found.price.toLocaleString()}` : null,
    4: found?.stock !== undefined ? `${found.stock} ${lang === 'th' ? 'ชิ้น' : 'pcs'}` : null,
  }
  const result = found ? colMap[col] : null

  const headers = {
    th: { code: 'รหัส (1)', name: 'ชื่อ (2)', price: 'ราคา (3)', stock: 'สต็อก (4)' },
    en: { code: 'Code (1)', name: 'Name (2)', price: 'Price (3)', stock: 'Stock (4)' },
  }[lang]

  const lookupLabel = lang === 'th' ? 'รหัสที่ค้นหา (G1)' : 'Lookup code (G1)'
  const colLabel = lang === 'th' ? 'ดึงคอลัมน์ที่ (Col Index)' : 'Pull column (Col Index)'
  const colOptions = {
    th: ['1 — รหัสสินค้า', '2 — ชื่อสินค้า', '3 — ราคา', '4 — จำนวนสต็อก'],
    en: ['1 — Product code', '2 — Product name', '3 — Price', '4 — Stock count'],
  }[lang]
  const notFound = lang === 'th' ? '❌ #N/A (ไม่พบข้อมูล)' : '❌ #N/A (not found)'

  return (
    <div>
      <FormulaBar formula={`=VLOOKUP(G1,$A$2:$D$6,${col},FALSE)`} />
      <div className={styles.table}>
        <div
          className={styles.tableHead}
          style={{ gridTemplateColumns: '70px 1fr 80px 65px' }}
        >
          <span>{headers.code}</span>
          <span>{headers.name}</span>
          <span>{headers.price}</span>
          <span>{headers.stock}</span>
        </div>
        {PRODS.map(p => (
          <div
            key={p.code}
            className={styles.tableRow}
            style={{
              gridTemplateColumns: '70px 1fr 80px 65px',
              background: found?.code === p.code ? 'rgba(14, 165, 233, 0.1)' : 'var(--surface)',
              fontWeight: found?.code === p.code ? 700 : 400,
              color: found?.code === p.code ? '#0369a1' : 'var(--text)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)' }}>{p.code}</span>
            <span>{p.name[lang]}</span>
            <span>฿{p.price.toLocaleString()}</span>
            <span>{p.stock}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <div className={styles.label}>{lookupLabel}</div>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className={styles.input}
            style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
            placeholder="P001–P005"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {PRODS.map(p => (
              <button
                key={p.code}
                onClick={() => setQ(p.code)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: `1px solid ${q.toUpperCase() === p.code ? '#0ea5e9' : 'var(--border)'}`,
                  background: q.toUpperCase() === p.code ? 'rgba(14, 165, 233, 0.1)' : 'var(--surface)',
                  color: q.toUpperCase() === p.code ? '#0ea5e9' : 'var(--text-muted)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {p.code}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.label}>{colLabel}</div>
          <select value={col} onChange={e => setCol(Number(e.target.value))} className={styles.input}>
            {colOptions.map((opt, i) => (
              <option key={i} value={i + 1}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <ResultChip label={result || notFound} accent={result ? '#0ea5e9' : '#ef4444'} />
    </div>
  )
}
