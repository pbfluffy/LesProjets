import { useLang } from '../LangContext.jsx'
import { GOLD_UNIT_CHOICES } from '../gold.js'
import styles from './ProfileSettings.module.css'

const GOLD_UNIT_LABEL_KEY = { baht: 'settingsUnitBaht', salueng: 'settingsUnitSalueng', gram: 'settingsUnitGram' }

// Display settings in the profile (avatar) popover, there whether or not the
// user is signed in. Language is the origin-wide `lang` key shared with the
// other apps (LangContext); currency is the same value as the header's USD/THB
// button (and synced with the watchlist when signed in); gold unit is a
// per-device choice for the Gold tab's Thai price.
export default function ProfileSettings({ currency, onCurrencyChange, goldUnit, onGoldUnitChange }) {
  const { s, lang, setLang } = useLang()
  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>{s.settingsTitle}</div>
      <Segmented
        label={s.settingsLanguage}
        value={lang}
        options={[{ value: 'en', label: 'English' }, { value: 'th', label: 'ไทย' }]}
        onChange={setLang}
      />
      <Segmented
        label={s.settingsCurrency}
        value={currency}
        options={[{ value: 'USD', label: 'USD' }, { value: 'THB', label: 'THB' }]}
        onChange={onCurrencyChange}
      />
      <Segmented
        label={s.settingsGoldUnit}
        value={goldUnit}
        options={GOLD_UNIT_CHOICES.map((u) => ({ value: u, label: s[GOLD_UNIT_LABEL_KEY[u]] }))}
        onChange={onGoldUnitChange}
      />
    </div>
  )
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className={styles.field} role="group" aria-label={label}>
      <div className={styles.label}>{label}</div>
      <div className={styles.segmented}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={styles.segBtn}
            data-active={o.value === value}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
