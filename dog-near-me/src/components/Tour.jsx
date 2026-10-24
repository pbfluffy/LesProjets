import { useEffect } from 'react'
import { startTour } from '../../../shared/tour.js'

// First-visit guided tour (shared/tour.js — same one every app uses):
// spotlights one real element at a time (data-tour attributes) and explains
// it. Replaces the old one-card welcome; shown once, replayable from the ?
// button in the header.
export const TOUR_KEY = 'majon_tour_done'

const STEPS = [
  { key: 'welcome', tab: 'map' },
  { key: 'map', target: 'map' },
  { key: 'report', target: 'tab-report' },
  { key: 'signin', target: 'signin', alt: { key: 'account', target: 'account' } },
  { key: 'done' },
]

export default function Tour({ t, onTab, onClose }) {
  useEffect(() => {
    const tour = startTour({
      steps: STEPS.map((s) => ({ ...s, before: s.tab ? () => onTab(s.tab) : undefined })),
      text: (key) => ({ title: t['tour_' + key + '_t'], body: t['tour_' + key + '_b'] }),
      labels: { title: t.tourTitle, next: t.tourNext, back: t.tourBack, skip: t.tourSkip, start: t.tourStart },
      doneKey: TOUR_KEY,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#c45c1a',
      onFinish: onClose,
    })
    return () => tour.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opening
  return null
}
