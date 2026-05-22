import { useLang } from '../LangContext.jsx';
import styles from './CaloriesCard.module.css';

export default function CaloriesCard({ eaten, target, totals, macroTargets }) {
  const { t } = useLang();
  const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0;
  const color =
    eaten > target ? 'var(--red)' : eaten > target * 0.9 ? 'var(--yellow)' : 'var(--green)';

  const macros = [
    {
      key: 'protein',
      label: t('macro.protein'),
      val: totals.protein,
      target: macroTargets?.protein ?? null,
      color: 'var(--green)',
    },
    {
      key: 'fat',
      label: t('macro.fat'),
      val: totals.fat,
      target: macroTargets?.fat ?? null,
      color: 'var(--yellow)',
    },
    {
      key: 'carbs',
      label: t('macro.carbs'),
      val: totals.carbs,
      target: macroTargets?.carbs ?? null,
      color: 'var(--blue)',
    },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>{t('cal.today')}</span>
        <span className={styles.value}>
          <span style={{ color, fontWeight: 700 }}>{eaten}</span>
          <span style={{ color: 'var(--muted)' }}> / {target} kcal</span>
        </span>
      </div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.delta}>
        {eaten > target
          ? t('cal.over', { n: eaten - target })
          : t('cal.under', { n: target - eaten })}
      </div>

      <div className={styles.macroRow}>
        {macros.map((m) => {
          const val = Math.round(m.val);
          return (
            <div className={styles.pill} key={m.key}>
              <div className={styles.pillVal} style={{ color: m.color }}>
                {val}
                {m.target != null && (
                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                    {' / '}
                    {m.target}
                  </span>
                )}
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}>g</span>
              </div>
              <div className={styles.pillLabel}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
