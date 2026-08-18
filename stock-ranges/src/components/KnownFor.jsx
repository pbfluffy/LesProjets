import { useState } from 'react'
import { useLang } from '../LangContext.jsx'
import { BRANDS } from '../data/brands.js'
import { tagHue } from '../tagColor.js'
import Icon from './Icon.jsx'
import styles from './KnownFor.module.css'

// Real brand favicon (Google's free no-key favicon endpoint, same idea as
// TickerLogo.jsx's per-ticker logo) with a colored-initial fallback if the
// request itself fails outright (the endpoint otherwise always resolves,
// falling back to a generic globe icon for domains it doesn't recognize).
function BrandChip({ brand }) {
  const [failed, setFailed] = useState(false)
  const hue = tagHue(brand.name)
  return (
    <span className={styles.chip} style={{ '--brand-hue': hue }}>
      {brand.domain && !failed ? (
        <img
          className={styles.logo}
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(brand.domain)}&sz=64`}
          alt=""
          width={18}
          height={18}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.initial} aria-hidden="true">{brand.name.charAt(0)}</span>
      )}
      {brand.name}
    </span>
  )
}

// Shown by default (not folded away) so a ticker like QSR reads as
// "Tim Hortons, Burger King, Popeyes" instead of a bare symbol — the point
// is helping the user recognize what business they're actually invested
// in, so hiding it behind a toggle would defeat the purpose.
export default function KnownFor({ symbol }) {
  const { s } = useLang()
  const brands = BRANDS[symbol]
  if (!brands || brands.length === 0) return null
  return (
    <div className={styles.knownFor}>
      <span className={styles.label}>
        <Icon name="grid" size={11} strokeWidth={2.5} />
        {s.knownForLabel}
      </span>
      <div className={styles.chips}>
        {brands.map((brand) => <BrandChip key={brand.name} brand={brand} />)}
      </div>
    </div>
  )
}
