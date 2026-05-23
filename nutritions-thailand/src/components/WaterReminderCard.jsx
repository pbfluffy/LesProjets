import { useEffect, useState } from 'react';
import { useLang } from '../LangContext.jsx';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../hooks/useWaterReminder.js';
import styles from './AdjustTab.module.css';

const INTERVAL_OPTIONS = [30, 60, 90, 120, 180];

export default function WaterReminderCard({ store }) {
  const { t } = useLang();
  const { stats, setStat } = store;
  const [perm, setPerm] = useState(() => getNotificationPermission());

  // Re-read permission when the tab regains focus, in case the user
  // changed it in browser settings.
  useEffect(() => {
    const onFocus = () => setPerm(getNotificationPermission());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPerm(result);
    if (result === 'granted') setStat('waterReminderEnabled', true);
  };

  const enabled = stats.waterReminderEnabled;
  const interval = stats.waterReminderInterval;
  const quietStart = stats.waterReminderQuietStart;
  const quietEnd = stats.waterReminderQuietEnd;

  // The interval slider operates on the index into INTERVAL_OPTIONS so the
  // user gets discrete sensible values rather than 1-minute granularity.
  const intervalIdx = Math.max(0, INTERVAL_OPTIONS.indexOf(interval));

  return (
    <div className={styles.card}>
      <div className={styles.title}>{t('waterReminder.title')}</div>

      {perm === 'unsupported' && (
        <div className={`${styles.warning} ${styles.warnCaution}`}>
          {t('waterReminder.permUnsupported')}
        </div>
      )}

      {perm === 'denied' && (
        <div className={`${styles.warning} ${styles.warnCaution}`}>
          {t('waterReminder.permDenied')}
        </div>
      )}

      {perm === 'default' && (
        <button
          className={`${styles.toggleBtn} ${styles.toggleActive}`}
          onClick={handleEnable}
          style={{ marginBottom: 0 }}
        >
          {t('waterReminder.enable')}
        </button>
      )}

      {perm === 'granted' && (
        <>
          <div className={styles.genderRow}>
            {[
              [true, t('waterReminder.toggleOn')],
              [false, t('waterReminder.toggleOff')],
            ].map(([v, label]) => {
              const active = enabled === v;
              return (
                <button
                  key={String(v)}
                  className={`${styles.toggleBtn} ${active ? styles.toggleActive : ''}`}
                  onClick={() => setStat('waterReminderEnabled', v)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {enabled && (
            <>
              <div className={styles.sliderBlock}>
                <div className={styles.sliderLabel}>
                  <span>{t('waterReminder.intervalLabel', { n: interval })}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={INTERVAL_OPTIONS.length - 1}
                  step={1}
                  value={intervalIdx}
                  onChange={(e) =>
                    setStat('waterReminderInterval', INTERVAL_OPTIONS[Number(e.target.value)])
                  }
                />
              </div>

              <div className={styles.sliderBlock}>
                <div className={styles.sliderLabel}>
                  <span>{t('waterReminder.quietStart', { h: String(quietStart).padStart(2, '0') })}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23}
                  step={1}
                  value={quietStart}
                  onChange={(e) => setStat('waterReminderQuietStart', Number(e.target.value))}
                />
              </div>

              <div className={styles.sliderBlock}>
                <div className={styles.sliderLabel}>
                  <span>{t('waterReminder.quietEnd', { h: String(quietEnd).padStart(2, '0') })}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23}
                  step={1}
                  value={quietEnd}
                  onChange={(e) => setStat('waterReminderQuietEnd', Number(e.target.value))}
                />
              </div>

              <div className={styles.sliderLabel} style={{ marginTop: 8, opacity: 0.7 }}>
                <span>{t('waterReminder.note')}</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
