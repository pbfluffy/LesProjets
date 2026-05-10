import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { FormulaBar, ResultChip } from './shared'
import styles from './shared.module.css'

const PRODS = [
  { code: 'P001', name: { th: 'แล็ปท็อป', en: 'Laptop' } },
  { code: 'P002', name: { th: 'เมาส์ไร้สาย', en: 'Wireless mouse' } },
  { code: 'P003', name: { th: 'คีย์บอร์ด', en: 'Keyboard' } },
  { code: 'P004', name: { th: 'หูฟัง', en: 'Headphones' } },
  { code: 'P005', name: { th: 'เว็บแคม', en: 'Webcam' } },
]

export default function IferrorDemo() {
  const { lang } = useLang()
  const [code, setCode] = useState('P099')
  const found = PRODS.find(p => p.code === code.toUpperCase().trim())

  const fallbackText = lang === 'th' ? 'ไม่พบสินค้า' : 'Not found'
  const intro = lang === 'th'
    ? 'ลองใส่รหัสที่มี (P001–P005) หรือรหัสที่ไม่มีในระบบ'
    : 'Try a code that exists (P001–P005) or one that does not'
  const ugly = lang === 'th' ? 'error น่าเกลียด' : 'ugly error'
  const clean = lang === 'th' ? 'สวยงาม เข้าใจง่าย' : 'clean and readable'
  const withoutLabel = lang === 'th' ? '❌ ถ้าไม่มี IFERROR' : '❌ Without IFERROR'
  const withLabel = lang === 'th' ? '✅ มี IFERROR' : '✅ With IFERROR'
  const foundLabel = lang === 'th' ? '✓ เจอข้อมูล → แสดงผลปกติจาก VLOOKUP' : '✓ Found → VLOOKUP returns the value'
  const promptLabel = lang === 'th' ? 'พิมพ์เอง' : 'Type your own'

  return (
    <div>
      <FormulaBar formula={`=IFERROR(VLOOKUP(G1,$A$2:$D$6,2,FALSE),"${fallbackText}")`} />
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
        {intro}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {['P002', 'P099', 'ABC', 'P004'].map(c => (
          <button
            key={c}
            onClick={() => setCode(c)}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: `1.5px solid ${code === c ? '#6366f1' : 'var(--border)'}`,
              background: code === c ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)',
              color: code === c ? '#6366f1' : 'var(--text-muted)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            {c}
          </button>
        ))}
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          className={styles.input}
          style={{
            width: 110,
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
          }}
          placeholder={promptLabel}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            padding: '12px 14px',
            opacity: found ? 0.35 : 1,
            transition: 'opacity 0.25s',
          }}
        >
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 800, marginBottom: 6 }}>
            {withoutLabel}
          </div>
          <code style={{ fontSize: 18, color: '#dc2626', fontWeight: 800 }}>#N/A</code>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{ugly}</div>
        </div>
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1.5px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 10,
            padding: '12px 14px',
            opacity: found ? 0.35 : 1,
            transition: 'opacity 0.25s',
          }}
        >
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 800, marginBottom: 6 }}>
            {withLabel}
          </div>
          <code style={{ fontSize: 14, color: '#15803d', fontWeight: 700 }}>
            "{fallbackText}"
          </code>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{clean}</div>
        </div>
      </div>

      {found && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1.5px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 800, marginBottom: 4 }}>
            {foundLabel}
          </div>
          <code style={{ fontSize: 15, color: '#4338ca', fontWeight: 700 }}>
            {found.name[lang]}
          </code>
        </div>
      )}
      {!found && <ResultChip label={`"${fallbackText}"`} accent="#6366f1" />}
    </div>
  )
}
