import { useLang } from '../LangContext.jsx'
import styles from './UndoToast.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// A single-slot snackbar for "Removed X — Undo", auto-dismissed by App.jsx
// after UNDO_TIMEOUT_MS. Removing a holding/ticker still happens
// immediately (same as before) — this just gives a window to reverse it.
export default function UndoToast({ symbol, onUndo }) {
  const { s } = useLang()
  return (
    <div className={styles.toast} role="status">
      <span>{interp(s.undoRemoved, { symbol })}</span>
      <button type="button" className={styles.undoBtn} onClick={onUndo}>{s.undoBtn}</button>
    </div>
  )
}
