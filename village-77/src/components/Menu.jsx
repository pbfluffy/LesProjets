import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './Menu.module.css'

// A small drop-down under a header button: `button` is what shows in the
// header, `children(close)` the menu content. Closes on a tap outside, on
// Escape, and after choosing an item (when it calls close).
export default function Menu({ button, label, className, buttonProps = {}, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const menuRef = useRef(null)

  // Keep it on screen: under a button near the middle of a phone header it
  // can run past the left edge, so shift it right by the overlap. Rects are
  // in zoomed pixels when larger text is on, CSS lengths aren't — hence /zoom.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!open || !el) return
    el.style.right = '0px'
    const left = el.getBoundingClientRect().left
    const zoom = parseFloat(document.documentElement.style.zoom) || 1
    if (left < 8) el.style.right = -(8 - left) / zoom + 'px'
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={className} aria-label={label} title={label}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} {...buttonProps}>
        {button}
      </button>
      {open && <div className={styles.menu} role="menu" ref={menuRef}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

// One row: an action (onClick) or, with `checked`, an on/off switch.
export function MenuItem({ icon, children, onClick, checked, danger }) {
  const isSwitch = checked !== undefined
  return (
    <button type="button" role={isSwitch ? 'menuitemcheckbox' : 'menuitem'} aria-checked={isSwitch ? checked : undefined}
      className={`${styles.item} ${danger ? styles.danger : ''}`} onClick={onClick}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>{children}</span>
      {isSwitch && <span className={`${styles.switch} ${checked ? styles.switchOn : ''}`} aria-hidden="true" />}
    </button>
  )
}

export const MenuHead = ({ children }) => <div className={styles.head}>{children}</div>
