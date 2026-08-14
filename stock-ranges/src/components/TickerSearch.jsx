import { useEffect, useRef, useState } from 'react'
import { searchSymbols } from '../stockApi.js'
import { useLang } from '../LangContext.jsx'
import styles from './TickerSearch.module.css'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
// Allows '=' (futures/forex, e.g. gold's "GC=F") and '^' (indices, e.g.
// "^GSPC") — autocomplete can surface both.
const SYMBOL_RE = /^[A-Za-z0-9.\-=^]{1,10}$/

// Autocomplete input: typing a name or partial ticker ("btc", "gold", "aapl")
// debounces into a search against the worker's /?q= endpoint and shows a
// dropdown of matches, so a user isn't stuck guessing Yahoo-specific symbols
// like "GC=F". The plain Add button still works for an exact known ticker
// without needing a dropdown result.
export default function TickerSearch({ onAdd }) {
  const { s } = useLang()
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)
  const requestId = useRef(0)

  useEffect(() => {
    const query = input.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      requestId.current++ // invalidate any still-pending search (e.g. right after commit() clears input)
      setResults([])
      setOpen(false)
      return
    }
    const id = ++requestId.current
    const timer = setTimeout(() => {
      searchSymbols(query).then((r) => {
        if (requestId.current !== id) return // a newer keystroke superseded this
        setResults(r)
        setOpen(r.length > 0)
        setHighlight(-1)
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function commit(symbol) {
    onAdd(symbol)
    setInput('')
    setResults([])
    setOpen(false)
    setError('')
  }

  function submitTyped(e) {
    e.preventDefault()
    const symbol = input.trim().toUpperCase()
    if (!symbol) return
    if (!SYMBOL_RE.test(symbol)) {
      setError(s.invalidTickerFormat)
      return
    }
    commit(symbol)
  }

  function onKeyDown(e) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault()
      commit(results[highlight].symbol)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <form className={styles.form} onSubmit={submitTyped}>
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError('') }}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={s.addPlaceholder}
          maxLength={40}
          autoComplete="off"
          aria-invalid={!!error}
        />
        <button className={styles.addBtn} type="submit">{s.addBtn}</button>
      </form>
      {error && <div className={styles.error}>{error}</div>}
      {open && (
        <ul className={styles.dropdown} role="listbox">
          {results.map((r, i) => (
            <li
              key={r.symbol}
              role="option"
              aria-selected={i === highlight}
              data-active={i === highlight}
              onMouseDown={(e) => { e.preventDefault(); commit(r.symbol) }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className={styles.rSymbol}>{r.symbol}</span>
              <span className={styles.rName}>{r.name}</span>
              {r.exchange && <span className={styles.rExch}>{r.exchange}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
