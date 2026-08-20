import { useEffect, useRef, useState } from 'react'
import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './BandInfo.module.css'

// The same "what does this band mean" text already lives in the page's
// disclaimer at the very bottom — but that's easy to miss above a long
// scrolling watchlist, especially for a first-time user who never scrolls
// that far. This puts a compact version right next to the badge it
// actually explains. Click-to-toggle rather than hover-only, since hover
// isn't reliable on a touchscreen.
export default function BandInfo() {
  const { s } = useLang()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.infoBtn}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        aria-label={s.bandInfoLabel}
        aria-expanded={open}
      >
        <Icon name="info" size={11} strokeWidth={2.25} />
      </button>
      {open && (
        <div className={styles.popover} role="tooltip">
          {s.bandInfoBody}
        </div>
      )}
    </span>
  )
}
