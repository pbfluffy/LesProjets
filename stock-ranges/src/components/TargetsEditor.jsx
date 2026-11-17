import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { SECTOR_ORDER } from '../wallet.js'
import styles from './TargetsEditor.module.css'

// One % input per sector. Blank = no target for that sector. The running
// total is informational: under 100 just means the rest is unassigned, over
// 100 gets a warning and blocks saving since the targets couldn't all be met.
export default function TargetsEditor({ targets, onSave, onCancel }) {
  const { s } = useLang()
  const [draft, setDraft] = useState(() => {
    const d = {}
    SECTOR_ORDER.forEach((key) => { d[key] = typeof targets?.[key] === 'number' ? String(targets[key]) : '' })
    return d
  })

  const parsed = {}
  let total = 0
  let invalid = false
  SECTOR_ORDER.forEach((key) => {
    const raw = draft[key].trim()
    if (!raw) return
    const n = parseFloat(raw)
    if (!Number.isFinite(n) || n < 0 || n > 100) { invalid = true; return }
    if (n > 0) { parsed[key] = Math.round(n * 10) / 10; total += parsed[key] }
  })
  const over = total > 100 + 1e-9

  function save(e) {
    e.preventDefault()
    if (invalid || over) return
    onSave(parsed)
  }

  return (
    <form className={styles.panel} onSubmit={save}>
      <div className={styles.hint}>{s.targetsHint}</div>
      <div className={styles.grid}>
        {SECTOR_ORDER.map((key) => (
          <label key={key} className={styles.field}>
            <span>{s[`sector${key}`] || key}</span>
            <span className={styles.inputWrap}>
              <input
                type="number" min="0" max="100" step="any" inputMode="decimal"
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
              <em>%</em>
            </span>
          </label>
        ))}
      </div>
      <div className={styles.totalRow} data-over={over}>
        {s.targetsTotal}: {total.toFixed(1)}%
        {over && <strong> — {s.targetsOver}</strong>}
        {invalid && <strong> — {s.targetsInvalid}</strong>}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.link} onClick={() => setDraft(Object.fromEntries(SECTOR_ORDER.map((k) => [k, ''])))}>
          {s.targetsClear}
        </button>
        <span className={styles.spacer} />
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>{s.cancelBtn}</button>
        <button type="submit" className={styles.saveBtn} disabled={invalid || over}>{s.targetsSave}</button>
      </div>
    </form>
  )
}
