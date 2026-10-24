import { useEffect } from 'react';
import { useLang } from '../LangContext.jsx';
import { startTour } from '../../../shared/tour.js';

// First-visit guided tour (shared/tour.js — same one every app uses):
// spotlights one real element at a time (data-tour attributes) and explains
// it, switching tab where needed. Shown once, replayable from the ? button.
export const TOUR_KEY = 'nutritions_tour_done';

const STEPS = [
  { key: 'welcome', tab: 'overview' },
  { key: 'tabs', target: 'tabs' },
  { key: 'date', target: 'date' },
  { key: 'stats', target: 'stats' },
  { key: 'calories', target: 'calories' },
  { key: 'water', target: 'water' },
  { key: 'food', target: 'food-search', tab: 'food' },
  { key: 'photo', target: 'photo', tab: 'photo' },
  { key: 'body', target: 'body', tab: 'adjust' },
  { key: 'custom', target: 'custom', tab: 'custom' },
  { key: 'account', target: 'account', tab: 'overview' },
  { key: 'done' },
];

export default function Tour({ onTab, onClose }) {
  const { t } = useLang();
  useEffect(() => {
    const tour = startTour({
      steps: STEPS.map((s) => ({ ...s, before: s.tab ? () => onTab(s.tab) : undefined })),
      text: (key) => ({ title: t('tour.' + key + '_t'), body: t('tour.' + key + '_b') }),
      labels: { title: t('tour.title'), next: t('tour.next'), back: t('tour.back'), skip: t('tour.skip'), start: t('tour.start') },
      doneKey: TOUR_KEY,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1f7a8c',
      onFinish: () => {
        onTab('overview');
        window.scrollTo(0, 0);
        onClose();
      },
    });
    return () => tour.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opening
  return null;
}
