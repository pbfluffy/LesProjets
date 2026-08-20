import { useLang } from '../LangContext.jsx'
import { tagHue } from '../tagColor.js'
import ChipAdder from './ChipAdder.jsx'
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
      <ChipAdder
        existingValues={tags}
        onAdd={onAdd}
        addLabel={s.addTag}
        placeholder={s.addTagPlaceholder}
        maxLength={MAX_TAG_LENGTH}
        duplicateError={s.duplicateTagError}
        maxCountError={s.maxTagsError}
        atMax={tags.length >= MAX_TAGS_PER_TICKER}
        datalistId={TAG_DATALIST_ID}
      />
    </div>
  )
}
