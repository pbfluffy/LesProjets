import { useEffect } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Moves focus into a modal on open and keeps Tab/Shift+Tab cycling within
// it — without this, focus can wander onto content hidden behind the
// overlay while the modal is open. Re-queries focusable elements on every
// keydown rather than caching them, so it stays correct as a modal's
// contents change (e.g. ImportPdfModal's review table appearing later).
export function useFocusTrap(modalRef) {
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    modal.querySelector(FOCUSABLE)?.focus()

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const focusable = [...modal.querySelectorAll(FOCUSABLE)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    modal.addEventListener('keydown', onKeyDown)
    return () => modal.removeEventListener('keydown', onKeyDown)
  }, [modalRef])
}
