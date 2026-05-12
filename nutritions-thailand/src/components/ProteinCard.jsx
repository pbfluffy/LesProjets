import { useLang } from '../LangContext.jsx';
import styles from './ProteinCard.module.css';

export default function ProteinCard({ eaten, target }) {
  const { t } = useLang();
  const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0;
  const hit = eaten >= target;
  const color = 'var(--green)';

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>{t('protein.title')}</span>
        <span className={styles.value}>
          <span style={{ color, fontWeight: 700 }}>{eaten}</span>
          <span style={{ color: 'var(--muted)' }}> / {target} g</span>
        </span>
      </div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.delta}>
        {hit ? t('protein.hit') : t('protein.toGo', { n: target - eaten })}
      </div>
    </div>
  );
}
