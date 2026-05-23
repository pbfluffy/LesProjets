import { useState } from 'react';
import { useLang } from '../LangContext.jsx';
import styles from './CustomTab.module.css';

const EMPTY_FORM = { name: '', kcal: '', protein: '', fat: '', carbs: '', note: '' };

export default function CustomTab({ store }) {
  const { t } = useLang();
  const { customFoods, addCustomFood, removeCustomFood, addToLog } = store;
  const [form, setForm] = useState(EMPTY_FORM);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.name || !form.kcal) return;
    addCustomFood({
      name: form.name,
      kcal: Number(form.kcal),
      protein: Number(form.protein || 0),
      fat: Number(form.fat || 0),
      carbs: Number(form.carbs || 0),
      note: form.note || t('custom.defaultNote'),
    });
    setForm(EMPTY_FORM);
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.title}>{t('custom.add')}</div>

        <div className={styles.form}>
          <input
            className={`${styles.input} ${styles.full}`}
            placeholder={t('custom.name')}
            value={form.name}
            onChange={update('name')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.kcal')}
            type="number"
            inputMode="numeric"
            value={form.kcal}
            onChange={update('kcal')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.protein')}
            type="number"
            inputMode="numeric"
            value={form.protein}
            onChange={update('protein')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.fat')}
            type="number"
            inputMode="numeric"
            value={form.fat}
            onChange={update('fat')}
          />
          <input
            className={styles.input}
            placeholder={t('custom.carbs')}
            type="number"
            inputMode="numeric"
            value={form.carbs}
            onChange={update('carbs')}
          />
          <input
            className={`${styles.input} ${styles.full}`}
            placeholder={t('custom.note')}
            value={form.note}
            onChange={update('note')}
          />
        </div>
        <button className={styles.submit} onClick={submit}>
          {t('custom.submit')}
        </button>
      </div>

      {customFoods.length > 0 && (
        <div className={styles.card}>
          <div className={styles.title}>{t('custom.list', { n: customFoods.length })}</div>
          {customFoods.map((item, i) => (
            <div className={styles.row} key={i}>
              <div>
                <div className={styles.name}>{item.name}</div>
                <div className={styles.macros}>
                  {item.kcal}kcal · P:{item.protein}g · F:{item.fat}g · C:{item.carbs}g
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.logBtn} onClick={() => addToLog(item)}>
                  {t('custom.log')}
                </button>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeCustomFood(i)}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
