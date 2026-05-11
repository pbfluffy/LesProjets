import { useLang } from '../LangContext.jsx';
import { ACTIVITY, DEFICIT_PRESETS } from '../data/constants.js';
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

  const kgPerWeek = Math.round(((stats.deficit * 7) / 7700) * 10) / 10;

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
        <div className={styles.title}>{t('adjust.deficit')}</div>
        <div className={styles.sliderLabel}>
          <span>
            {t('adjust.deficitVal', { v: stats.deficit }).split(':')[0]}:{' '}
            <strong style={{ color: 'var(--accent)' }}>{stats.deficit} kcal</strong>
          </span>
          <span className={styles.rate}>{t('adjust.deficitRate', { kg: kgPerWeek })}</span>
        </div>
        <input
          type="range"
          min={0}
          max={800}
          step={50}
          value={stats.deficit}
          onChange={(e) => setStat('deficit', Number(e.target.value))}
        />
        <div className={styles.presets}>
          {DEFICIT_PRESETS.map(({ v, labelKey }) => {
            const active = stats.deficit === v;
            return (
              <button
                key={v}
                className={`${styles.presetBtn} ${active ? styles.presetActive : ''}`}
                onClick={() => setStat('deficit', v)}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <DataPanel store={store} />
    </>
  );
}
