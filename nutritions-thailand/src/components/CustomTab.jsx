import { useState } from 'react';
import { useLang } from '../LangContext.jsx';
import { lookupBarcode } from '../data/openFoodFacts.js';
import BarcodeScanner from './BarcodeScanner.jsx';
import styles from './CustomTab.module.css';

const EMPTY_FORM = { name: '', kcal: '', protein: '', fat: '', carbs: '', note: '' };

export default function CustomTab({ store }) {
  const { t } = useLang();
  const { customFoods, addCustomFood, removeCustomFood, addToLog } = store;
  const [form, setForm] = useState(EMPTY_FORM);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState(null); // null | 'looking' | 'found' | 'notFound' | 'error'

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
    setLookupStatus(null);
  };

  const handleBarcode = async (barcode) => {
    setScannerOpen(false);
    setLookupStatus('looking');
    const result = await lookupBarcode(barcode);
    if (result.found) {
      const f = result.food;
      const labelParts = [f.brand, f.name].filter(Boolean);
      setForm({
        name: labelParts.join(' · ') || `Barcode ${f.barcode}`,
        kcal: String(f.kcal || ''),
        protein: String(f.protein || ''),
        fat: String(f.fat || ''),
        carbs: String(f.carbs || ''),
        note: f.servingSize
          ? t('barcode.noteWithServing', { code: f.barcode, serving: f.servingSize })
          : t('barcode.noteOnly', { code: f.barcode }),
      });
      setLookupStatus('found');
    } else if (result.error) {
      // Keep barcode in the note so the user has it to reference.
      setForm((cur) => ({
        ...cur,
        note: cur.note || t('barcode.noteOnly', { code: barcode }),
      }));
      setLookupStatus('error');
    } else {
      setForm((cur) => ({
        ...cur,
        note: cur.note || t('barcode.noteOnly', { code: barcode }),
      }));
      setLookupStatus('notFound');
    }
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.title}>{t('custom.add')}</div>

        <button
          className={styles.scanBtn}
          onClick={() => setScannerOpen(true)}
          type="button"
        >
          📷 {t('barcode.scanCta')}
        </button>

        {lookupStatus === 'looking' && (
          <div className={styles.statusBox}>{t('barcode.looking')}</div>
        )}
        {lookupStatus === 'found' && (
          <div className={`${styles.statusBox} ${styles.statusOk}`}>
            ✓ {t('barcode.foundReview')}
          </div>
        )}
        {lookupStatus === 'notFound' && (
          <div className={`${styles.statusBox} ${styles.statusWarn}`}>
            {t('barcode.notFound')}
          </div>
        )}
        {lookupStatus === 'error' && (
          <div className={`${styles.statusBox} ${styles.statusWarn}`}>
            {t('barcode.lookupErr')}
          </div>
        )}

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

      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}
