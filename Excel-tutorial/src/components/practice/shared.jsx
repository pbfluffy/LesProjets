import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import styles from './shared.module.css'

export function FormulaBar({ formula }) {
  const { t } = useLang()
  const [ok, setOk] = useState(false)
  return (
    <div className={styles.bar}>
      <code className={styles.code}>{formula}</code>
      <button
        className={`${styles.copyBtn} ${ok ? styles.copyOk : ''}`}
        onClick={() => {
          navigator.clipboard?.writeText(formula)
          setOk(true)
          setTimeout(() => setOk(false), 1500)
        }}
      >
        {ok ? t.copied : t.copy}
      </button>
    </div>
  )
}

export function ResultChip({ label, accent }) {
  const { t } = useLang()
  return (
    <div
      className={styles.chip}
      style={{
        background: `${accent}0f`,
        borderColor: `${accent}30`,
      }}
    >
      <span className={styles.chipLabel}>{t.result} →</span>
      <span className={styles.chipValue} style={{ color: accent }}>
        {label}
      </span>
    </div>
  )
}
