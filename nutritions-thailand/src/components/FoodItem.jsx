import { useLang } from '../LangContext.jsx';
import styles from './FoodItem.module.css';

export default function FoodItem({ item, added, onAdd, isFav = false, onToggleFav }) {
  const { lang, t } = useLang();
  const name = lang === 'en' && item.nameEn ? item.nameEn : item.name;
  const note = lang === 'en' && item.noteEn ? item.noteEn : item.note;
  return (
    <div
      className={`${styles.item} ${added ? styles.added : ''}`}
      onClick={() => onAdd(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // Only the row itself triggers add — keypresses on the pin button
        // (which bubbles here) must not also log the food.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAdd(item);
        }
      }}
    >
      {onToggleFav && (
        <button
          type="button"
          className={`${styles.pin} ${isFav ? styles.pinned : ''}`}
          aria-label={isFav ? t('food.unpin') : t('food.pin')}
          aria-pressed={isFav}
          title={isFav ? t('food.unpin') : t('food.pin')}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(item.name);
          }}
        >
          📌
        </button>
      )}
      <div className={styles.info}>
        <div className={styles.name}>{name}</div>
        <div className={styles.macros}>
          P:{item.protein}g · F:{item.fat}g · C:{item.carbs}g
        </div>
        {note && <div className={styles.note}>{note}</div>}
      </div>
      <div className={styles.kcalWrap}>
        <span className={styles.kcal}>{item.kcal}</span>
        <span className={styles.unit}>{t('food.kcal')}</span>
      </div>
    </div>
  );
}
