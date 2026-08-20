import { useEffect, useRef, useState } from 'react'
import styles from './ChipAdder.module.css'

// Shared "+" button that swaps for a text input, committing on Enter/blur
// and cancelling on Escape — used by both TagChips (per-symbol tags) and
// KnownFor (per-symbol custom brand names), which previously carried two
// near-identical copies of this same interaction. `atMax` is re-checked
// inside commit() (not just used to hide the button) so a value that
// slips in from a concurrent update — e.g. cloud sync pushing the count
// up while this input is already open — still gets rejected with an
// error instead of silently exceeding the cap.
export default function ChipAdder({
  existingValues, onAdd, addLabel, placeholder, maxLength,
  duplicateError, maxCountError, atMax, datalistId,
}) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function commit() {
    const trimmed = value.trim()
    if (!trimmed) {
      setValue('')
      setAdding(false)
      return
    }
    if (atMax) {
      setError(maxCountError)
      return
    }
    if (existingValues.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setError(duplicateError)
      return
    }
    setValue('')
    setAdding(false)
    setError('')
    onAdd(trimmed)
  }

  if (!adding) {
    if (atMax) return null
    return <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>+ {addLabel}</button>
  }
  return (
    <>
      <input
        ref={inputRef}
        className={styles.input}
        list={datalistId}
        value={value}
        onChange={(e) => { setValue(e.target.value); setError('') }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          else if (e.key === 'Escape') { setValue(''); setAdding(false); setError('') }
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
      />
      {error && <span className={styles.error}>{error}</span>}
    </>
  )
}
