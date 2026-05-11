import { useMemo, useState } from 'react';
import { useLang } from '../LangContext.jsx';
import { MEALS } from '../data/meals.js';
import FoodItem from './FoodItem.jsx';
import styles from './FoodTab.module.css';

export default function FoodTab({ store }) {
  const { t, lang } = useLang();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const { customFoods, log, addToLog } = store;

  // Combine built-in categories with the user's custom-food category.
  const allCategories = useMemo(() => {
    const cats = [...MEALS];
    if (customFoods.length > 0) {
      cats.push({
        category: '⭐ ของฉัน',
        categoryEn: t('food.custom'),
        color: '#FFD166',
        id: 'custom',
        items: customFoods,
      });
    }
    return cats;
  }, [customFoods, t]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((it) => {
          const matchSearch = !needle || it.name.toLowerCase().includes(needle) || (it.nameEn || '').toLowerCase().includes(needle);
          const matchCat = filterCat === 'all' || cat.id === filterCat;
          return matchSearch && matchCat;
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [allCategories, search, filterCat]);

  return (
    <>
      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          placeholder={t('food.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.chips}>
        <div
          className={`${styles.chip} ${filterCat === 'all' ? styles.active : ''}`}
          onClick={() => setFilterCat('all')}
          role="button"
          tabIndex={0}
        >
          {t('food.all')}
        </div>
        {MEALS.map((m) => (
          <div
            key={m.id}
            className={`${styles.chip} ${filterCat === m.id ? styles.active : ''}`}
            onClick={() => setFilterCat(m.id)}
            role="button"
            tabIndex={0}
          >
            {lang === 'en' ? m.categoryEn : m.category}
          </div>
        ))}
        {customFoods.length > 0 && (
          <div
            className={`${styles.chip} ${filterCat === 'custom' ? styles.active : ''}`}
            onClick={() => setFilterCat('custom')}
            role="button"
            tabIndex={0}
          >
            {t('food.custom')}
          </div>
        )}
      </div>

      {filtered.length === 0 && <div className={styles.empty}>{t('food.empty')}</div>}

      {filtered.map((cat) => (
        <div key={cat.id}>
          <div className={styles.catHeader}>
            <div className={styles.catDot} style={{ background: cat.color }} />
            <span className={styles.catName}>
              {lang === 'en' && cat.categoryEn ? cat.categoryEn : cat.category}
            </span>
          </div>
          {cat.items.map((item, i) => (
            <FoodItem
              key={`${cat.id}-${i}`}
              item={item}
              added={log.some((x) => x.name === item.name)}
              onAdd={addToLog}
            />
          ))}
        </div>
      ))}
    </>
  );
}
