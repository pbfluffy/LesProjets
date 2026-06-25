import { useState } from 'react';
import { useLang } from '../LangContext.jsx';
import styles from './FoodLog.module.css';

export default function FoodLog({ log, onRemove, onSaveToCustom }) {
  const { lang, t } = useLang();
  const [savedIds, setSavedIds] = useState(new Set());

  const handleSave = (item) => {
    if (!onSaveToCustom) return;
    const alreadySaved = onSaveToCustom(item); // returns false if duplicate
    if (alreadySaved !== false) {
      setSavedIds((s) => new Set(s).add(item.id));
      setTimeout(() => setSavedIds((s) => { const n = new Set(s); n.delete(item.id); return n; }), 2500);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>{t('log.title')}</div>
      {log.length === 0 ? (
        <div className={styles.empty}>{t('log.empty')}</div>
      ) : (
        log.map((item) => {
          const name = lang === 'en' && item.nameEn ? item.nameEn : item.name;
          const isSaved = savedIds.has(item.id);
          return (
            <div className={styles.row} key={item.id}>
              <div>
                <div className={styles.name}>{name}</div>
                <div className={styles.macros}>
                  P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                </div>
              </div>
              <div className={styles.right}>
                <span className={styles.kcal}>{item.kcal}</span>
                {onSaveToCustom && (
                  <button
                    className={`${styles.saveBtn} ${isSaved ? styles.saveBtnDone : ''}`}
                    onClick={() => handleSave(item)}
                    aria-label={t('log.saveToCustom')}
                    title={t('log.saveToCustom')}
                    disabled={isSaved}
                  >
                    {isSaved ? '✓' : '⭐'}
                  </button>
                )}
                <button
                  className={styles.removeBtn}
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
