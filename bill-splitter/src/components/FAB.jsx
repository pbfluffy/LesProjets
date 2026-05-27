import styles from './FAB.module.css'

// Feature #76 Phase C — floating action button.
// Sits above the StickyBottomBar at bottom-right of the viewport.
// Used on the Split tab for the primary "add food" action.
export default function FAB({ onClick, ariaLabel = 'Add' }) {
  return (
    <button
      type="button"
      className={styles.fab}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      +
    </button>
  )
}
