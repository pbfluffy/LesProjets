import { useLang } from '../LangContext.jsx';
import { ACTIVITY, calcBMR, getCalorieMode } from '../data/constants.js';
import DataPanel from './DataPanel.jsx';
import styles from './AdjustTab.module.css';

export default function AdjustTab({ store }) {
  const { t } = useLang();
  const { stats, setStat } = store;

  const sliders = [
    { key: 'weight', labelKey: 'adjust.weight', min: 40, max: 150, step: 0.5 },
    { key: 'height', labelKey: 'adjust.height', min: 140, max: 210, step: 1 },
    { key: 'age', labelKey: 'adjust.age', min: 15, max: 80, step: 1 },
  ];

  // Calorie target derivation
  const bmr = Math.round(calcBMR(stats.weight, stats.height, stats.age, stats.gender));
  const act = ACTIVITY.find((a) => a.k === stats.activity) ?? ACTIVITY[2];
  const tdee = Math.round(bmr * act.mult);
  const delta = stats.calorieDelta;
  const target = tdee + delta;
  const mode = getCalorieMode(delta);

  // Rate: |delta| kcal/day × 7 days / 7700 kcal per kg
  const kgPerWeek = Math.abs(Math.round(((delta * 7) / 7700) * 10) / 10);

  // Safety zones — personalized via BMR/TDEE
  const isUnsafeLow = target < bmr;
  const isUnsafeHigh = delta >= 1000;
  const isCautionLow = !isUnsafeLow && delta < -tdee * 0.25;
  const isCautionHigh = !isUnsafeHigh && delta >= 400;

  let warnKey = null;
  let warnVars = null;
  let warnLevel = null; // 'caution' | 'unsafe'
  if (isUnsafeLow) {
    warnKey = 'warn.unsafeLow';
    warnVars = { bmr };
    warnLevel = 'unsafe';
  } else if (isUnsafeHigh) {
    warnKey = 'warn.unsafeHigh';
    warnLevel = 'unsafe';
  } else if (isCautionLow) {
    warnKey = 'warn.cautionLow';
    warnLevel = 'caution';
  } else if (isCautionHigh) {
    warnKey = 'warn.cautionHigh';
    warnLevel = 'caution';
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.title}>{t('adjust.body')}</div>

        {sliders.map((s) => (
          <div key={s.key} className={styles.sliderBlock}>
            <div className={styles.sliderLabel}>
              <span>{t(s.labelKey, { v: stats[s.key] })}</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={stats[s.key]}
              onChange={(e) => setStat(s.key, Number(e.target.value))}
            />
          </div>
        ))}

        <div className={styles.genderRow}>
          {[
            ['male', t('adjust.male')],
            ['female', t('adjust.female')],
          ].map(([v, label]) => {
            const active = stats.gender === v;
            return (
              <button
                key={v}
                className={`${styles.toggleBtn} ${active ? styles.toggleActive : ''}`}
                onClick={() => setStat('gender', v)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <select
          value={stats.activity}
          onChange={(e) => setStat('activity', e.target.value)}
        >
          {ACTIVITY.map((a) => (
            <option key={a.k} value={a.k}>
              {t(a.labelKey)} (×{a.mult})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.card}>
        <div className={styles.title}>{t('adjust.target')}</div>

        <div className={styles.sliderLabel}>
          <span>
            {t('adjust.targetVal', { v: target }).split(':')[0]}:{' '}
            <strong style={{ color: 'var(--accent)' }}>{target} kcal</strong>
          </span>
          <span className={styles.rate}>
            {delta === 0 ? t(`mode.${mode}`) : t('adjust.targetRate', { kg: kgPerWeek })}
          </span>
        </div>

        <input
          type="range"
          min={-1000}
          max={1000}
          step={50}
          value={delta}
          onChange={(e) => setStat('calorieDelta', Number(e.target.value))}
        />

        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>{t(`mode.${mode}`)}</span>
          <span className={styles.deltaLabel}>
            {delta > 0 ? `+${delta}` : delta} kcal
          </span>
        </div>

        {warnKey && (
          <div
            className={`${styles.warning} ${
              warnLevel === 'unsafe' ? styles.warnUnsafe : styles.warnCaution
            }`}
          >
            {t(warnKey, warnVars || undefined)}
          </div>
        )}
      </div>

      <DataPanel store={store} />
    </>
  );
}
