import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { BRANDS } from '../data/brands.js'
import { tagHue } from '../tagColor.js'
import ChipAdder from './ChipAdder.jsx'
import Icon from './Icon.jsx'
import styles from './KnownFor.module.css'

export const MAX_CUSTOM_BRANDS = 6
const MAX_BRAND_LENGTH = 24
const FUND_TYPES = new Set(['ETF', 'MUTUALFUND'])

// Real brand favicon (Google's free no-key favicon endpoint, same idea as
// TickerLogo.jsx's per-ticker logo) with a colored-initial fallback if the
// request itself fails outright (the endpoint otherwise always resolves,
// falling back to a generic globe icon for domains it doesn't recognize).
// Custom (user-added) brands never have a domain, so they always render
// as the colored-initial avatar — a visual cue distinguishing them from
// curated entries without needing a separate style.
function BrandChip({ name, domain, removable, onRemove, s }) {
  const [failed, setFailed] = useState(false)
  const hue = tagHue(name)
  return (
    <span className={styles.chip} style={{ '--brand-hue': hue }}>
      {domain && !failed ? (
        <img
          className={styles.logo}
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt=""
          width={18}
          height={18}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.initial} aria-hidden="true">{name.charAt(0)}</span>
      )}
      {name}
      {removable && (
        <button
          type="button"
          className={styles.chipRemove}
          onClick={onRemove}
          aria-label={`${s.removeBrandLabel} ${name}`}
          title={`${s.removeBrandLabel} ${name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}

// Shown by default (not folded away) so a ticker like QSR reads as
// "Tim Hortons, Burger King, Popeyes" instead of a bare symbol — the point
// is helping the user recognize what business they're actually invested
// in, so hiding it behind a toggle would defeat the purpose. Curated
// entries (data/brands.js) are read-only; user-added ones are editable
// right here, since the curated list is necessarily incomplete and
// chasing every obscure ticker by hand doesn't scale.
//
// Renders nothing while the quote is still loading/unresolved and there's
// nothing saved yet — same as before custom brands existed — so a card
// doesn't flash an empty box (or an Add button for a ticker that turns
// out to be invalid) before the quote settles. Once there's *something*
// to show (curated brands, or previously-saved custom ones), it renders
// immediately regardless of load state, since that's persisted data with
// nothing to wait on. Once the quote has actually resolved
// (`instrumentType` known) and there's still nothing, a short note
// explains why instead of leaving an unexplained gap: a fund holds many
// companies rather than being one, and some equities just don't have a
// widely recognized consumer brand.
export default function KnownFor({ symbol, instrumentType, customBrands = [], onAddBrand, onRemoveBrand }) {
  const { s } = useLang()
  const curated = BRANDS[symbol] || []
  const curatedNames = new Set(curated.map((b) => b.name.toLowerCase()))
  // A custom brand that collides with a later-added curated entry (same
  // name, case-insensitive) is suppressed here rather than shown twice —
  // the curated one has a real logo and is the better of the two.
  const visibleCustomBrands = customBrands.filter((name) => !curatedNames.has(name.toLowerCase()))
  const hasAny = curated.length > 0 || visibleCustomBrands.length > 0
  const showEmptyNote = !hasAny && !!instrumentType

  if (!hasAny && !instrumentType) return null

  return (
    <div className={styles.knownFor} data-empty={hasAny ? undefined : 'true'}>
      <span className={styles.label}>
        <Icon name="grid" size={11} strokeWidth={2.5} />
        {s.knownForLabel}
      </span>
      <div className={styles.chips}>
        {curated.map((brand) => (
          <BrandChip key={brand.name} name={brand.name} domain={brand.domain} s={s} />
        ))}
        {visibleCustomBrands.map((name) => (
          <BrandChip key={name} name={name} domain={null} removable onRemove={() => onRemoveBrand?.(name)} s={s} />
        ))}
        {onAddBrand && (
          <ChipAdder
            existingValues={[...curated.map((b) => b.name), ...customBrands]}
            onAdd={onAddBrand}
            addLabel={s.addBrand}
            placeholder={s.addBrandPlaceholder}
            maxLength={MAX_BRAND_LENGTH}
            duplicateError={s.duplicateBrandError}
            maxCountError={s.maxBrandsError}
            atMax={customBrands.length >= MAX_CUSTOM_BRANDS}
          />
        )}
      </div>
      {showEmptyNote && (
        <span className={styles.emptyNote}>{FUND_TYPES.has(instrumentType) ? s.knownForFundNote : s.knownForNoneNote}</span>
      )}
    </div>
  )
}
