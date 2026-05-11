import { useLang } from '../LangContext.jsx';
import styles from './FoodItem.module.css';

export default function FoodItem({ item, added, onAdd }) {
  const { t } = useLang();
  return (
    <div
      className={`${styles.item} ${added ? styles.added : ''}`}
      onClick={() => onAdd(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAdd(item);
        }
      }}
    >
      <div className={styles.info}>
        <div className={styles.name}>{item.name}</div>
        <div className={styles.macros}>
          P:{item.protein}g · F:{item.fat}g · C:{item.carbs}g
        </div>
        {item.note && <div className={styles.note}>{item.note}</div>}
      </div>
      <div className={styles.kcalWrap}>
        <span className={styles.kcal}>{item.kcal}</span>
        <span className={styles.unit}>{t('food.kcal')}</span>
      </div>
    </div>
  );
}
