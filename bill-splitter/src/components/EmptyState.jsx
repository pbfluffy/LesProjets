import styles from './EmptyState.module.css'

// Feature #76 Phase D — friendly empty states with the Pumba mascot.
// Placeholder vector corgi + bowl; swap for a polished asset later.
function Corgi() {
  return (
    <svg viewBox="0 0 100 90" className={styles.art} role="img" aria-label="Pumba the corgi">
      <path d="M22 32 L13 5 L41 22 Z" fill="#d98a3d" />
      <path d="M78 32 L87 5 L59 22 Z" fill="#d98a3d" />
      <path d="M25 27 L20 12 L36 23 Z" fill="#f2d9bd" />
      <path d="M75 27 L80 12 L64 23 Z" fill="#f2d9bd" />
      <ellipse cx="50" cy="52" rx="34" ry="30" fill="#e09a4e" />
      <ellipse cx="50" cy="62" rx="23" ry="18" fill="#faf3e8" />
      <circle cx="37" cy="48" r="4.5" fill="#2b2b28" />
      <circle cx="63" cy="48" r="4.5" fill="#2b2b28" />
      <ellipse cx="50" cy="58" rx="5" ry="4" fill="#2b2b28" />
      <path d="M50 62 Q44 68 39 64" stroke="#2b2b28" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M50 62 Q56 68 61 64" stroke="#2b2b28" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M47 64 Q50 72 53 64 Z" fill="#e8859a" />
      <circle cx="27" cy="58" r="4" fill="#f0b87f" opacity="0.55" />
      <circle cx="73" cy="58" r="4" fill="#f0b87f" opacity="0.55" />
    </svg>
  )
}

function Bowl() {
  return (
    <svg viewBox="0 0 110 60" className={styles.art} role="img" aria-label="Empty bowl">
      <path d="M18 28 Q55 56 92 28 Z" fill="#e09a4e" />
      <path d="M14 26 Q55 38 96 26" stroke="#c77f33" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="55" cy="25" rx="41" ry="7" fill="#f2d9bd" />
    </svg>
  )
}

export default function EmptyState({ variant = 'corgi', text }) {
  return (
    <div className={styles.wrap}>
      {variant === 'bowl' ? <Bowl /> : <Corgi />}
      {text && <p className={styles.caption}>{text}</p>}
    </div>
  )
}
