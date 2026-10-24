import { useEffect } from 'react'
import { STRINGS } from '../i18n/strings'
import { startTour } from '../../../shared/tour.js'

// First-visit guided tour (shared/tour.js — same one every app uses):
// spotlights one real element at a time (data-tour attributes) and explains
// it. Shown once, replayable from the ? button in the header.
export const TOUR_KEY = 'pumgoda_tour_done'

const STEPS = [
  { key: 'welcome', tab: 'list' },
  { key: 'filters', target: 'filters' },
  { key: 'card', target: 'card' },
  { key: 'nav', target: 'nav' },
  { key: 'suggest', target: 'suggest' },
  { key: 'account', target: 'account' },
  { key: 'done' },
]

export default function Tour({ lang, onTab, onClose }) {
  useEffect(() => {
    const s = STRINGS[lang].tour
    const tour = startTour({
      steps: STEPS.map((step) => ({ ...step, before: step.tab ? () => onTab(step.tab) : undefined })),
      text: (key) => s.steps[key],
      labels: { title: s.title, next: s.next, back: s.back, skip: s.skip, start: s.start },
      doneKey: TOUR_KEY,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c45c1a',
      onFinish: () => {
        window.scrollTo(0, 0)
        onClose()
      },
    })
    return () => tour.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opening
  return null
}
