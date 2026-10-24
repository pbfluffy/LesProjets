import { useEffect } from 'react'
import { useLangContext } from '../LangContext'
import { startTour } from '../../../shared/tour.js'

// First-visit guided tour (shared/tour.js — same one every app uses):
// spotlights one real element at a time (data-tour attributes) and explains
// it. A step whose element isn't on screen (e.g. the sign-in button when
// already signed in) is skipped or swapped for its `alt`. Shown once,
// replayable from the ? button in the header. TOUR_KEY marks it done.
// v3: the Aa display menu and the account menu, so everyone sees it once more.
export const TOUR_KEY = 'village_tour_done_v3'

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
  { key: 'display', target: 'display' },
  { key: 'lang', target: 'lang' },
  { key: 'done' },
]

export default function Tour({ onTab, onClose }) {
  const { t } = useLangContext()
  useEffect(() => {
    const tour = startTour({
      steps: STEPS.map((s) => ({ ...s, before: s.tab ? () => onTab(s.tab) : undefined })),
      text: (key) => ({ title: t['tour_' + key + '_t'], body: t['tour_' + key + '_b'] }),
      labels: { title: t.tourTitle, next: t.tourNext, back: t.tourBack, skip: t.tourSkip, start: t.tourStart },
      doneKey: TOUR_KEY,
      accent: '#06c755',
      onFinish: () => {
        onTab('home')
        onClose()
      },
    })
    return () => tour.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opening
  return null
}
