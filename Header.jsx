import { useRef, useState } from 'react';
import { useLang } from '../LangContext.jsx';
import styles from './DataPanel.module.css';

export default function DataPanel({ store }) {
  const { t } = useLang();
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null); // { kind: 'ok' | 'err', text }

  const flash = (kind, text) => {
    setStatus({ kind, text });
    setTimeout(() => setStatus(null), 2400);
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file later
    if (!file) return;
    try {
      await store.importData(file);
      flash('ok', t('data.imported'));
    } catch {
      flash('err', t('data.importErr'));
    }
  };

  const onClear = () => {
    if (window.confirm(t('data.confirm'))) {
      store.clearAll();
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>{t('data.title')}</div>
      <div className={styles.row}>
        <button className={styles.btn} onClick={store.exportData}>
          {t('data.export')}
        </button>
        <button className={styles.btn} onClick={onPickFile}>
          {t('data.import')}
        </button>
        <button className={`${styles.btn} ${styles.danger}`} onClick={onClear}>
          {t('data.clear')}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
      {status && (
        <div className={`${styles.status} ${status.kind === 'err' ? styles.statusErr : styles.statusOk}`}>
          {status.text}
        </div>
      )}
    </div>
  );
}
