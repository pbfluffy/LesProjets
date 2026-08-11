import { useEffect, useRef, useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { tagHue } from '../tagColor.js'
import styles from './TagChips.module.css'

const MAX_TAGS_PER_TICKER = 8
const MAX_TAG_LENGTH = 20
export const TAG_DATALIST_ID = 'stockranges-tag-options'

// Per-card free-text tags, used to filter the watchlist (see the tag row in
// App.jsx). The add-tag input uses a native <datalist> (rendered once in
// App.jsx, referenced by id) for autocomplete against tags already used
// elsewhere — cheaper than building a custom dropdown like TickerSearch's,
// and this is a much lower-stakes input (no network call, no wrong-symbol
// risk) so the native browser affordance is enough.
export default function TagChips({ tags, onAdd, onRemove }) {
  const { s } = useLang()
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function commit() {
    const tag = value.trim()
    setValue('')
    setAdding(false)
    if (!tag) return
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return
    if (tags.length >= MAX_TAGS_PER_TICKER) return
    onAdd(tag)
  }

  return (
    <div className={styles.row}>
      {tags.map((tag) => (
        <span key={tag} className={styles.chip} style={{ '--tag-hue': tagHue(tag) }}>
          {tag}
          <button
            className={styles.chipRemove}
            onClick={() => onRemove(tag)}
            aria-label={`${s.removeTag} ${tag}`}
            title={`${s.removeTag} ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          ref={inputRef}
          className={styles.input}
          list={TAG_DATALIST_ID}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            else if (e.key === 'Escape') { setValue(''); setAdding(false) }
          }}
          placeholder={s.addTagPlaceholder}
          maxLength={MAX_TAG_LENGTH}
        />
      ) : (
        tags.length < MAX_TAGS_PER_TICKER && (
          <button className={styles.addBtn} onClick={() => setAdding(true)}>+ {s.addTag}</button>
        )
      )}
    </div>
  )
}
