import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { FormulaBar, ResultChip } from './shared'
import styles from './shared.module.css'

export default function IFDemo() {
  const { lang } = useLang()
  const [score, setScore] = useState(65)
  const [pass, setPass] = useState(50)
  const result = parseFloat(score) >= parseFloat(pass)

  const passLabel = lang === 'th' ? 'ผ่าน' : 'Pass'
  const failLabel = lang === 'th' ? 'ไม่ผ่าน' : 'Fail'
  const scoreLabel = lang === 'th' ? 'คะแนนที่ได้ (B1)' : 'Score (B1)'
  const thresholdLabel = lang === 'th' ? 'เกณฑ์ผ่าน' : 'Pass threshold'
  const conditionTrue = lang === 'th' ? '① เงื่อนไขจริง ✓' : '① condition true ✓'
  const conditionFalse = lang === 'th' ? '② เงื่อนไขเท็จ ✗' : '② condition false ✗'

  return (
    <div>
      <FormulaBar formula={`=IF(B1>=${pass},"${passLabel}","${failLabel}")`} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div className={styles.label}>{scoreLabel}</div>
          <input
            type="number"
            value={score}
            min={0}
            max={100}
            onChange={e => setScore(e.target.value)}
            className={styles.input}
          />
        </div>
        <div>
          <div className={styles.label}>{thresholdLabel}</div>
          <input
            type="number"
            value={pass}
            min={0}
            max={100}
            onChange={e => setPass(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            border: `2px solid ${result ? '#10b981' : 'var(--border)'}`,
            background: result ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-alt)',
            borderRadius: 10,
            padding: '10px 12px',
            transition: 'all 0.2s',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: result ? '#16a34a' : 'var(--text-faint)',
              fontWeight: 700,
              marginBottom: 3,
            }}
          >
            {conditionTrue}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            score ≥ {pass}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              fontWeight: 800,
              color: result ? '#10b981' : 'var(--text-faint)',
            }}
          >
            "{passLabel}"
          </div>
        </div>
        <div style={{ color: 'var(--text-faint)', fontSize: 18 }}>↔</div>
        <div
          style={{
            flex: 1,
            border: `2px solid ${!result ? '#ef4444' : 'var(--border)'}`,
            background: !result ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-alt)',
            borderRadius: 10,
            padding: '10px 12px',
            transition: 'all 0.2s',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: !result ? '#ef4444' : 'var(--text-faint)',
              fontWeight: 700,
              marginBottom: 3,
            }}
          >
            {conditionFalse}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            score &lt; {pass}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              fontWeight: 800,
              color: !result ? '#ef4444' : 'var(--text-faint)',
            }}
          >
            "{failLabel}"
          </div>
        </div>
      </div>

      <ResultChip
        label={result ? `✓ ${passLabel}` : `✗ ${failLabel}`}
        accent={result ? '#10b981' : '#ef4444'}
      />
    </div>
  )
}
