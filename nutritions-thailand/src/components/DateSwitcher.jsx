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

export default function DateSwitcher({ dateKey, onPrev, onNext, onToday, lastEdit }) {
  const { t, lang } = useLang();
  const isToday = dateKey === todayKey();
  return (
    <>
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
    <LastEditBadge lastEdit={lastEdit} t={t} />
    </>
  );
}

function LastEditBadge({ lastEdit, t }) {
  if (!lastEdit) return null;
  const sec = Math.floor((Date.now() - lastEdit) / 1000);
  let key = 'date.lastEditJustNow';
  let vars;
  if (sec < 60) {
    key = 'date.lastEditJustNow';
  } else if (sec < 3600) {
    key = 'date.lastEditMin';
    vars = { n: Math.floor(sec / 60) };
  } else if (sec < 86400) {
    key = 'date.lastEditHour';
    vars = { n: Math.floor(sec / 3600) };
  } else {
    key = 'date.lastEditDay';
    vars = { n: Math.floor(sec / 86400) };
  }
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted, #888)', marginTop: 4, opacity: 0.75 }}>
      {t(key, vars)}
    </div>
  );
}
