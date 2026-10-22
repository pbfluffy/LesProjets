import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useLangContext } from '../LangContext'
import styles from './Tour.module.css'

// First-visit guided tour: dims the page, spotlights one real element at a
// time (found by its data-tour attribute) and explains it. Steps can switch
// tab first; a step whose element isn't on screen (e.g. the sign-in button
// when already signed in) is skipped. Shown once, replayable from the ?
// button in the header. TOUR_KEY marks it done for this browser.
// v2: new steps (search, saved / reviews), so everyone sees it once more.
export const TOUR_KEY = 'village_tour_done_v2'

const STEPS = [
  { key: 'welcome' },
  { key: 'search', target: 'search', tab: 'home' },
  { key: 'market', target: 'tab-market' },
  { key: 'services', target: 'tab-services' },
  { key: 'residency', target: 'residency', tab: 'market' },
  { key: 'card', target: 'card', tab: 'market' },
  { key: 'add', target: 'add', tab: 'market' },
  // Already signed in (e.g. automatically inside the LINE app): point at the
  // profile picture instead of skipping the step.
  { key: 'signin', target: 'signin', tab: 'home', alt: { key: 'account', target: 'account' } },
  { key: 'lang', target: 'lang' },
  { key: 'done' },
]

const PAD = 6 // spotlight margin around the element

// With larger text on, the page is zoomed (useBigText): element rects come in
// screen pixels but the spotlight is drawn inside the zoomed page, so convert.
const pageZoom = () => parseFloat(document.documentElement.style.zoom) || 1
function cssRect(el) {
  const r = el.getBoundingClientRect()
  const z = pageZoom()
  return { top: r.top / z, left: r.left / z, width: r.width / z, height: r.height / z, bottom: r.bottom / z }
}

export default function Tour({ onTab, onClose }) {
  const { t } = useLangContext()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null) // spotlight box, or null = centred card
  const [seen, setSeen] = useState([]) // steps shown so far, for Back
  // The step's element as found: its own, or its `alt` one. null while still
  // looking, so a step's text never flashes up before its element is found
  // (or before it's skipped).
  const [found, setFound] = useState(null)
  const base = STEPS[i]
  const step = found === 'alt' ? { ...base, ...base.alt } : base

  const finish = useCallback(() => {
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* private mode */ }
    onTab('home')
    onClose()
  }, [onTab, onClose])

  // Switch tab if the step needs it, then find and frame its element.
  useLayoutEffect(() => {
    if (base.tab) onTab(base.tab)
    setFound(null)
    if (!base.target) {
      setRect(null)
      setFound('main')
      return
    }
    let tries = 0
    let timer
    const find = () => {
      let which = 'main'
      let el = document.querySelector(`[data-tour="${base.target}"]`)
      if (!el && base.alt) {
        which = 'alt'
        el = document.querySelector(`[data-tour="${base.alt.target}"]`)
      }
      if (el) {
        // Only scroll when it's off screen, and only up / down: centring a
        // header button sideways shifted the whole page on phones.
        const r = el.getBoundingClientRect()
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', inline: 'nearest' })
        setRect(cssRect(el))
        setFound(which)
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
      if (el) setRect(cssRect(el))
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
  const vh = window.innerHeight / pageZoom()
  let cardStyle
  if (rect) {
    const below = rect.bottom + PAD + 12
    cardStyle = below + 220 < vh ? { top: below } : { bottom: vh - rect.top + PAD + 12 }
  }

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={t.tourTitle}>
      {rect && found ? (
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

      {found && <div className={`${styles.card} ${rect ? '' : styles.cardCentre}`} style={cardStyle}>
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
      </div>}
    </div>
  )
}
