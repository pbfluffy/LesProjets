import { useLang } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './SearchBox.module.css'

// Live filter for an existing list (Watchlist/Wallet) — separate concern
// from TickerSearch, which adds new tickers via autocomplete.
export default function SearchBox({ value, onChange }) {
  const { s } = useLang()
  return (
    <div className={styles.wrap}>
      <Icon name="search" size={14} className={styles.icon} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={s.searchPlaceholder}
        aria-label={s.searchPlaceholder}
      />
      {value && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => onChange('')}
          aria-label={s.searchClear}
          title={s.searchClear}
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  )
}
