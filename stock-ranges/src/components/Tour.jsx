import { useEffect } from 'react'
import { useLang } from '../LangContext.jsx'
import { startTour } from '../../../shared/tour.js'

// First-visit guided tour (shared/tour.js — same one every app uses):
// spotlights one real element at a time (data-tour attributes) and explains
// it. Steps whose element isn't on screen (empty watchlist, signed out) are
// skipped. Shown once, replayable from the ? button in the header.
export const TOUR_KEY = 'stockranges_tour_done'

const STEPS = [
  { key: 'welcome', tab: 'watchlist' },
  { key: 'add', target: 'add' },
  { key: 'signals', target: 'signals' },
  { key: 'band', target: 'band' },
  { key: 'range', target: 'range' },
  { key: 'view', target: 'view' },
  { key: 'wallet', target: 'tab-wallet' },
  { key: 'account', target: 'account' },
  { key: 'done' },
]

export default function Tour({ onTab, onClose }) {
  const { s } = useLang()
  useEffect(() => {
    const tour = startTour({
      steps: STEPS.map((step) => ({ ...step, before: step.tab ? () => onTab(step.tab) : undefined })),
      text: (key) => ({ title: s['tour_' + key + '_t'], body: s['tour_' + key + '_b'] }),
      labels: { title: s.tourTitle, next: s.tourNext, back: s.tourBack, skip: s.tourSkip, start: s.tourStart },
      doneKey: TOUR_KEY,
      accent: '#c45c1a',
      onFinish: () => {
        window.scrollTo(0, 0)
        onClose()
      },
    })
    return () => tour.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opening
  return null
}
