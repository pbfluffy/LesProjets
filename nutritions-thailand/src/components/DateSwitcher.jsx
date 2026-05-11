import { useLang } from '../LangContext.jsx';
import { todayKey } from '../hooks/useNutritionStore.js';
import styles from './DateSwitcher.module.css';

function formatDate(key, lang) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function DateSwitcher({ dateKey, onPrev, onNext, onToday }) {
  const { t, lang } = useLang();
  const isToday = dateKey === todayKey();
  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={onPrev} aria-label="Previous day">
        {t('date.prev')}
      </button>
      <button
        className={`${styles.center} ${isToday ? styles.today : ''}`}
        onClick={onToday}
        title={isToday ? '' : t('date.today')}
      >
        {isToday ? t('date.today') : formatDate(dateKey, lang)}
      </button>
      <button
        className={styles.btn}
        onClick={onNext}
        disabled={isToday}
        aria-label="Next day"
      >
        {t('date.next')}
      </button>
    </div>
  );
}
