import { useDriveSync } from '../hooks/useDriveSync.js';
import { useLang } from '../LangContext.jsx';
import styles from './SyncCard.module.css';

// Feature #22 — Cloud sync via Google Drive AppData.
// Lives in the Adjust tab between WaterReminderCard and DataPanel.

function formatTimeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  return new Date(iso).toLocaleDateString();
}

export default function SyncCard({ store }) {
  const { t } = useLang();
  const sync = useDriveSync(store);
  const { status, email, lastSynced, error, isSignedIn, signIn, signOut, push, pull } = sync;

  let statusLine = '';
  let statusClass = styles.muted;
  if (status === 'syncing') {
    statusLine = t('sync.syncing');
  } else if (status === 'error') {
    statusLine = t('sync.error') + ': ' + (error || '');
    statusClass = styles.muted + ' ' + styles.danger;
  } else if (status === 'synced' && lastSynced) {
    statusLine = t('sync.lastSynced', { when: formatTimeAgo(lastSynced) });
  } else if (isSignedIn && email) {
    statusLine = t('sync.signedInAs', { email });
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>{t('sync.title')}</div>
      {!isSignedIn ? (
        <>
          <div className={styles.muted}>{t('sync.signedOut')}</div>
          <button className={styles.primaryBtn} onClick={signIn}>
            {t('sync.signIn')}
          </button>
        </>
      ) : (
        <>
          {statusLine && <div className={statusClass}>{statusLine}</div>}
          <div className={styles.actions}>
            <button
              className={styles.secondaryBtn}
              onClick={pull}
              disabled={status === 'syncing'}
            >
              {t('sync.pullNow')}
            </button>
            <button
              className={styles.secondaryBtn}
              onClick={push}
              disabled={status === 'syncing'}
            >
              {t('sync.pushNow')}
            </button>
            <button className={styles.ghostBtn} onClick={signOut}>
              {t('sync.signOut')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
