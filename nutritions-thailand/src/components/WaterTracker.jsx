import { WATER_GLASSES, WATER_ML_PER_GLASS } from '../data/constants.js';
import { useLang } from '../LangContext.jsx';
import styles from './WaterTracker.module.css';

export default function WaterTracker({ value, onChange }) {
  const { t } = useLang();
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>{t('water.title')}</span>
        <span className={styles.progress}>
          {t('water.progress', {
            ml: value * WATER_ML_PER_GLASS,
            goal: WATER_GLASSES * WATER_ML_PER_GLASS,
          })}
        </span>
      </div>
      <div className={styles.grid}>
        {Array.from({ length: WATER_GLASSES }).map((_, i) => (
          <span
            key={i}
            className={`${styles.drop} ${i < value ? styles.filled : ''}`}
            onClick={() => onChange(i < value ? i : i + 1)}
            role="button"
            aria-label={`Water glass ${i + 1}`}
          >
            💧
          </span>
        ))}
      </div>
    </div>
  );
}
