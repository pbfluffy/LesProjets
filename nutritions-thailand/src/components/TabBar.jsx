import { useLang } from '../LangContext.jsx';
import styles from './TabBar.module.css';

const TABS = ['overview', 'food', 'photo', 'adjust', 'custom'];

export default function TabBar({ active, onChange }) {
  const { t } = useLang();
  return (
    <div className={styles.tabBar}>
      <div className={styles.tabBarInner}>
        {TABS.map((k) => (
          <button
            key={k}
            className={`${styles.tabBtn} ${active === k ? styles.active : ''}`}
            onClick={() => onChange(k)}
          >
            {t(`tab.${k}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
