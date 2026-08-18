import { useLang } from '../LangContext.jsx'
import { BRANDS } from '../data/brands.js'
import styles from './KnownFor.module.css'

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
      <span className={styles.label}>{s.knownForLabel}</span>
      <div className={styles.chips}>
        {brands.map((brand) => (
          <span key={brand} className={styles.chip}>{brand}</span>
        ))}
      </div>
    </div>
  )
}
