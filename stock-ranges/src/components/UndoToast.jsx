import { useLang } from '../LangContext.jsx'
import styles from './UndoToast.module.css'

function interp(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// A single-slot snackbar for "Removed X — Undo", auto-dismissed by App.jsx
// after UNDO_TIMEOUT_MS. The underlying removal (ticker, holding, or a
// tag deleted everywhere) still happens immediately — this just gives a
// window to reverse it.
export default function UndoToast({ type, label, onUndo }) {
  const { s } = useLang()
  const message = type === 'tag'
    ? interp(s.undoRemovedTag, { tag: label })
    : interp(s.undoRemoved, { symbol: label })
  return (
    <div className={styles.toast} role="status">
      <span>{message}</span>
      <button type="button" className={styles.undoBtn} onClick={onUndo}>{s.undoBtn}</button>
    </div>
  )
}
