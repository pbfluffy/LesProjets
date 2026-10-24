import { useEffect } from 'react'
import { useLang } from '../LangContext'
import { startTour } from '../../../shared/tour.js'

// First-visit guided tour (shared/tour.js — same one every app uses):
// spotlights one real element at a time (data-tour attributes) and explains
// it. Shown once to new users, replayable from the ? button in the header and
// the "How to use" link. TOUR_KEY marks it done for this browser.
// v2: payment setup and Trips steps, so everyone sees it once more.
export const TOUR_KEY = 'billSplitter_tourDone_v2'

// Walks the Split Bill tab in the order a bill is actually split, then Trips.
const STEPS = [
  { key: 'welcome', tab: 'split' },
  { key: 'tabs', target: 'tabs' },
  { key: 'scan', target: 'scan' },
  { key: 'members', target: 'members' },
  { key: 'food', target: 'food' },
  { key: 'extras', target: 'extras' },
  { key: 'pay', target: 'pay' },
  { key: 'result', target: 'result' },
  { key: 'history', target: 'history' },
  { key: 'trips', target: 'trip-new', tab: 'trips' },
  { key: 'done', tab: 'split' },
]

export default function Tour({ onTab, onClose }) {
  const { t } = useLang()
  useEffect(() => {
    const tour = startTour({
      steps: STEPS.map((s) => ({ ...s, before: s.tab ? () => onTab(s.tab) : undefined })),
      text: (key) => ({ title: t['tour_' + key + '_t'], body: t['tour_' + key + '_b'] }),
      labels: { title: t.tourTitle, next: t.tourNext, back: t.tourBack, skip: t.tourSkip, start: t.tourStart },
      doneKey: TOUR_KEY,
      accent: '#06c755',
      onFinish: () => {
        onTab('split')
        window.scrollTo(0, 0)
        onClose()
      },
    })
    return () => tour.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opening
  return null
}
