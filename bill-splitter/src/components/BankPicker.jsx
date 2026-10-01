import { useEffect, useId, useRef, useState } from 'react'
import { useLang } from '../LangContext'
import { THAI_BANKS } from '../promptpay'
import styles from './ExtrasSection.module.css'

function Swatch({ color }) {
  return <span className={styles.bankSwatch} style={{ background: color }} aria-hidden="true" />
}

/**
 * Bank dropdown with each bank's brand colour. A custom listbox rather than a
 * <select>, because mobile browsers ignore styling on <option> elements.
 * Each row also shows the bank's name in the other language (e.g. "BAAC ·
 * ธ.ก.ส.") so the less familiar state banks are recognisable.
 */
export default function BankPicker({ value, onChange }) {
  const { t, lang } = useLang()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const btnRef = useRef(null)
  const listRef = useRef(null)
  const lastPointer = useRef('')
  const selected = THAI_BANKS.find(b => b.code === value)
  const primary = b => (lang === 'th' ? b.th : b.en)
  const secondary = b => (lang === 'th' ? b.en : b.th)

  // Close on any tap/click outside the picker.
  useEffect(() => {
    if (!open) return
    const onDown = e => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Keep the highlighted row in view while moving with the keyboard.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openList = () => {
    setActive(Math.max(0, THAI_BANKS.findIndex(b => b.code === value)))
    setOpen(true)
  }
  const pick = b => {
    onChange(b.code)
    setOpen(false)
    btnRef.current?.focus()
  }

  const onKeyDown = e => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(THAI_BANKS.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(THAI_BANKS.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(THAI_BANKS[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div className={styles.bankPicker} ref={rootRef}>
      <button
        type="button"
        ref={btnRef}
        className={styles.bankPickerBtn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${THAI_BANKS[active].code}` : undefined}
        aria-label={selected ? `${t.bankSelect}: ${primary(selected)}` : t.bankSelect}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected
          ? <><Swatch color={selected.color} /><span className={styles.bankPickerName}>{primary(selected)}</span></>
          : <span className={styles.bankPickerPh}>{t.bankSelect}</span>}
        <span className={styles.bankPickerCaret} aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className={styles.bankList} role="listbox" id={`${id}-list`} ref={listRef} aria-label={t.bankSelect}>
          {THAI_BANKS.map((b, i) => (
            <li
              key={b.code}
              id={`${id}-${b.code}`}
              role="option"
              aria-selected={b.code === value}
              className={`${styles.bankOption} ${i === active ? styles.bankOptionActive : ''}`}
              style={{ '--bank-color': b.color }}
              onPointerDown={e => e.preventDefault()}
              onClick={() => pick(b)}
              onPointerMove={e => {
                // Only follow real pointer movement: scrolling the list under
                // a still cursor fires hover events and would steal the
                // keyboard highlight.
                const pt = `${e.clientX},${e.clientY}`
                if (lastPointer.current === pt) return
                lastPointer.current = pt
                setActive(i)
              }}
            >
              <Swatch color={b.color} />
              <span className={styles.bankOptionName}>{primary(b)}</span>
              <span className={styles.bankOptionAlt}>{secondary(b)}</span>
              {b.code === value && <span className={styles.bankOptionCheck} aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
