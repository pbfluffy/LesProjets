import { useLang } from '../LangContext.jsx';
import {
  ACTIVITY,
  CUSTOM_MACRO_DEFAULTS,
  calcBMR,
  getCalorieMode,
  getMacroTargets,
  macroKcal,
} from '../data/constants.js';
import DataPanel from './DataPanel.jsx';
import styles from './AdjustTab.module.css';
export default function AdjustTab({ store, cloudSync }) {
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

  // Feature #19 — macro targets
  const macroTargets = getMacroTargets(stats);
  const isCustomMacros = stats.macroMode === 'custom';
  const macroSliders = [
    {
      key: 'proteinPerKg',
      labelKey: 'adjust.proteinPerKg',
      target: macroTargets.protein,
      min: 0.8,
      max: 3.0,
      step: 0.1,
      color: 'var(--green)',
    },
    {
      key: 'fatPerKg',
      labelKey: 'adjust.fatPerKg',
      target: macroTargets.fat,
      min: 0.4,
      max: 2.0,
      step: 0.1,
      color: 'var(--yellow)',
    },
    {
      key: 'carbsPerKg',
      labelKey: 'adjust.carbsPerKg',
      target: macroTargets.carbs,
      min: 1.0,
      max: 8.0,
      step: 0.1,
      color: 'var(--blue)',
    },
  ];

  // When user flips to custom, seed null fields with sensible defaults
  // (so the sliders have positions). Going back to auto keeps the saved
  // values intact for the next custom session.
  const setMacroMode = (mode) => {
    if (mode === 'custom') {
      if (stats.proteinPerKg == null) setStat('proteinPerKg', CUSTOM_MACRO_DEFAULTS.proteinPerKg);
      if (stats.fatPerKg == null) setStat('fatPerKg', CUSTOM_MACRO_DEFAULTS.fatPerKg);
      if (stats.carbsPerKg == null) setStat('carbsPerKg', CUSTOM_MACRO_DEFAULTS.carbsPerKg);
    }
    setStat('macroMode', mode);
  };

  // Total kcal from the custom macro mix — for the sanity-check line
  const customMacroKcal = isCustomMacros ? Math.round(macroKcal(macroTargets)) : 0;

  return (
    <>
      <SyncStatusCard cloudSync={cloudSync} />
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

      <div className={styles.card}>
        <div className={styles.title}>{t('adjust.macroTargets')}</div>

        <div className={styles.genderRow}>
          {[
            ['auto', t('adjust.macroAuto')],
            ['custom', t('adjust.macroCustom')],
          ].map(([v, label]) => {
            const active = stats.macroMode === v;
            return (
              <button
                key={v}
                className={`${styles.toggleBtn} ${active ? styles.toggleActive : ''}`}
                onClick={() => setMacroMode(v)}
                 
                >
                  {label}
                </button>
            );
          })}
        </div>

        {!isCustomMacros && (
          <div className={styles.sliderLabel} style={{ marginTop: 4 }}>
            <span>
              {t('adjust.macroAutoNote', { p: macroTargets.protein })}
            </span>
          </div>
        )}

        {isCustomMacros &&
          macroSliders.map((s) => (
            <div key={s.key} className={styles.sliderBlock}>
              <div className={styles.sliderLabel}>
                <span>
                  {t(s.labelKey, { v: (stats[s.key] ?? 0).toFixed(1) })}
                </span>
                <span style={{ color: s.color, fontWeight: 600 }}>
                  {s.target ?? '․'}g
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={stats[s.key] ?? 0}
                onChange={(e) => setStat(s.key, Number(e.target.value))}
              />
            </div>
          ))}

        {isCustomMacros && (
          <div className={styles.modeRow}>
            <span className={styles.modeLabel}>
              {t('adjust.macroTotal')}
            </span>
            <span className={styles.deltaLabel}>
              {customMacroKcal} kcal
              {target > 0 && (
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  ({Math.round((customMacroKcal / target) * 100)}% {t('adjust.ofTarget')})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <DataPanel store={store} />
    </>
  
)}


function SyncStatusCard({ cloudSync }) {
  if (!cloudSync) return null;
  const { user, syncStatus, lastSyncedAt } = cloudSync;
  const baseStyle = { display: 'flex', alignItems: 'center', gap: 8 };

  if (!user) {
    return (
      <div className={styles.card} style={baseStyle}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--faint, #999)', flexShrink: 0 }} />
        <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>
          Sign in on the landing page to sync across devices →
        </a>
      </div>
    );
  }

  const dotColor =
    syncStatus === 'syncing' ? 'var(--yellow, #f5c542)' :
    syncStatus === 'synced'  ? 'var(--green, #2e7d32)' :
    syncStatus === 'error'   ? 'var(--red, #d32f2f)' :
                                'var(--faint, #999)';
  const text =
    syncStatus === 'syncing' ? 'Syncing…' :
    syncStatus === 'synced'  ? (lastSyncedAt ? `Synced · ${timeAgo(lastSyncedAt)}` : 'Synced') :
    syncStatus === 'error'   ? 'Sync error — check console' :
                                'Ready';

  return (
    <div className={styles.card} style={baseStyle}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.email}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted, #888)' }}>{text}</span>
    </div>
  );
}

function timeAgo(ms) {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
