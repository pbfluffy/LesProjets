import styles from './StatCard.module.css';

export default function StatCard({ label, value, unit, color }) {
  return (
    <div className={styles.card} style={{ borderTop: `3px solid ${color}` }}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={{ color }}>
        {value}
      </div>
      <div className={styles.unit}>{unit}</div>
    </div>
  );
}
