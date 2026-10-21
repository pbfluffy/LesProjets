import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useLang } from '../LangContext'
import styles from './Tour.module.css'

// First-visit guided tour: dims the page, spotlights one real element at a
// time (found by its data-tour attribute) and explains it. Steps can switch
// tab first; a step whose element isn't on screen is skipped. Shown once to
// new users, replayable from the ? button in the header and the "How to
// use" link. TOUR_KEY marks it done for this browser.
export const TOUR_KEY = 'billSplitter_tourDone'

// Walks the Split Bill tab in the order a bill is actually split.
// (Same component as village-77's tour.)
const STEPS = [
  { key: 'welcome', tab: 'split' },
  { key: 'tabs', target: 'tabs' },
  { key: 'scan', target: 'scan' },
  { key: 'members', target: 'members' },
  { key: 'food', target: 'food' },
  { key: 'extras', target: 'extras' },
  { key: 'result', target: 'result' },
  { key: 'history', target: 'history' },
  { key: 'done' },
]

const PAD = 6 // spotlight margin around the element

export default function Tour({ onTab, onClose }) {
  const { t } = useLang()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null) // spotlight box, or null = centred card
  const [seen, setSeen] = useState([]) // steps shown so far, for Back
  const step = STEPS[i]

  const finish = useCallback(() => {
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* private mode */ }
    onTab('split')
    window.scrollTo(0, 0)
    onClose()
  }, [onTab, onClose])

  // Switch tab if the step needs it, then find and frame its element.
  useLayoutEffect(() => {
    if (step.tab) onTab(step.tab)
    if (!step.target) {
      setRect(null)
      return
    }
    let tries = 0
    let timer
    const find = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center' }) // instant, so it can be measured right away
        setRect(el.getBoundingClientRect())
      } else if (tries++ < 10) {
        timer = setTimeout(find, 50) // tab content still rendering
      } else {
        setI((n) => Math.min(n + 1, STEPS.length - 1)) // not on screen: skip it
      }
    }
    find()
    return () => clearTimeout(timer)
  }, [i]) // once per step

  // Keep the spotlight on the element when the page resizes or scrolls.
  useEffect(() => {
    if (!step.target) return
    const update = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step.target])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Back returns to the step actually shown before (skipped ones aren't).
  const next = () => {
    if (i === STEPS.length - 1) return finish()
    setSeen((s) => [...s, i])
    setI(i + 1)
  }
  const back = () => {
    if (!seen.length) return
    setI(seen[seen.length - 1])
    setSeen((s) => s.slice(0, -1))
  }

  // Card goes below the spotlight, or above it when there's no room.
  const vh = window.innerHeight
  let cardStyle
  if (rect) {
    const below = rect.bottom + PAD + 12
    cardStyle = below + 220 < vh ? { top: below } : { bottom: vh - rect.top + PAD + 12 }
  }

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={t.tourTitle}>
      {rect ? (
        <div
          className={styles.spot}
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      ) : (
        <div className={styles.dim} />
      )}

      <div className={`${styles.card} ${rect ? '' : styles.cardCentre}`} style={cardStyle}>
        <p className={styles.count}>{i + 1} / {STEPS.length}</p>
        <h2 className={styles.title}>{t['tour_' + step.key + '_t']}</h2>
        <p className={styles.body}>{t['tour_' + step.key + '_b']}</p>
        <div className={styles.dots} aria-hidden="true">
          {STEPS.map((s, n) => <span key={s.key} className={n === i ? styles.dotOn : styles.dot} />)}
        </div>
        <div className={styles.buttons}>
          {i < STEPS.length - 1 && (
            <button type="button" className={styles.skip} onClick={finish}>{t.tourSkip}</button>
          )}
          <span className={styles.spacer} />
          {seen.length > 0 && <button type="button" className={styles.back} onClick={back}>{t.tourBack}</button>}
          <button type="button" className={styles.next} onClick={next} autoFocus>
            {i === STEPS.length - 1 ? t.tourStart : t.tourNext}
          </button>
        </div>
      </div>
    </div>
  )
}
