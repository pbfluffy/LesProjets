import { useEffect } from 'react'
import { tagHue } from '../tagColor.js'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './TagManagerModal.module.css'

// Renaming/deleting here applies everywhere a tag is used, across both
// the Watchlist and Wallet — a typo'd tag otherwise has to be fixed one
// ticker at a time (see renameTag/deleteTagEverywhere in App.jsx).
export default function TagManagerModal({ tags, onRename, onDelete, onClose }) {
  const { s } = useLang()

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function commitRename(tag, value) {
    const trimmed = value.trim()
    if (trimmed && trimmed !== tag) onRename(tag, trimmed)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="tag-manager-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.title} id="tag-manager-title">{s.manageTagsTitle}</div>
        <div className={styles.body}>{s.manageTagsBody}</div>
        <ul className={styles.list}>
          {tags.map((tag) => (
            <li key={tag} className={styles.row}>
              <span className={styles.dot} style={{ '--tag-hue': tagHue(tag) }} aria-hidden="true" />
              <input
                className={styles.renameInput}
                defaultValue={tag}
                maxLength={20}
                onBlur={(e) => commitRename(tag, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  else if (e.key === 'Escape') { e.currentTarget.value = tag; e.currentTarget.blur() }
                }}
                aria-label={`${s.renameTagLabel} ${tag}`}
              />
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => onDelete(tag)}
                aria-label={`${s.deleteTagLabel} ${tag}`}
                title={`${s.deleteTagLabel} ${tag}`}
              >
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <button type="button" className={styles.closeBtn} onClick={onClose}>{s.closeBtn}</button>
        </div>
      </div>
    </div>
  )
}
