import { useLang } from '../LangContext.jsx';
import styles from './StreakCard.module.css';

// Feature #20 — Protein streak card.
// Shows current streak (🔥 N day streak), best, and a state-dependent hint.
export default function StreakCard({ current, best, todayMet, todayProtein, proteinTarget }) {
  const { t } = useLang();
  const active = current > 0;
  const remaining = Math.max(0, proteinTarget - Math.round(todayProtein));

  let hint;
  let hintClass;
  if (todayMet) {
    hint = t('streak.kept');
    hintClass = styles.hintOk;
  } else if (active) {
    hint = t('streak.extend', { n: remaining });
    hintClass = styles.hintPending;
  } else {
    hint = t('streak.start');
    hintClass = styles.hintMuted;
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>{t('streak.title')}</span>
        <span className={styles.best}>{t('streak.best', { n: best })}</span>
      </div>
      <div className={styles.body}>
        <span className={styles.flame} aria-hidden="true">{active ? '🔥' : '💤'}</span>
        <span className={styles.count}>{current}</span>
        <span className={styles.unit}>{t('streak.dayUnit')}</span>
      </div>
      <div className={`${styles.hint} ${hintClass}`}>{hint}</div>
    </div>
  );
}
