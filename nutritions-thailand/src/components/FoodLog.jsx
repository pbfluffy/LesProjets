import { useLang } from '../LangContext.jsx';
import styles from './FoodLog.module.css';

export default function FoodLog({ log, onRemove }) {
  const { t } = useLang();
  return (
    <div className={styles.card}>
      <div className={styles.title}>{t('log.title')}</div>
      {log.length === 0 ? (
        <div className={styles.empty}>{t('log.empty')}</div>
      ) : (
        log.map((item) => (
          <div className={styles.row} key={item.id}>
            <div>
              <div className={styles.name}>{item.name}</div>
              <div className={styles.macros}>
                P:{item.protein}g F:{item.fat}g C:{item.carbs}g
              </div>
            </div>
            <div className={styles.right}>
              <span className={styles.kcal}>{item.kcal}</span>
              <button
                className={styles.removeBtn}
                onClick={() => onRemove(item.id)}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
