import { useState, useMemo } from 'react';
import AdjustTab from './components/AdjustTab.jsx';
import CustomTab from './components/CustomTab.jsx';
import FoodTab from './components/FoodTab.jsx';
import Header from './components/Header.jsx';
import OverviewTab from './components/OverviewTab.jsx';
import PhotoTab from './components/PhotoTab.jsx';
import TabBar from './components/TabBar.jsx';
import { useLang } from './LangContext.jsx';
import { useNutritionStore } from './hooks/useNutritionStore.js';
import { useCloudSync } from './hooks/useCloudSync.js';
import styles from './App.module.css';

export default function App() {
  const store = useNutritionStore();
  const { t } = useLang();
  const [tab, setTab] = useState('overview');

  // Cloud sync — Feature #22. Memoize the subset of store state that gets
  // pushed/pulled, so the sync effect doesn't fire on unrelated re-renders.
  const cloudState = useMemo(
    () => ({
      stats: store.stats,
      customFoods: store.customFoods,
      days: store.days,
      weights: store.weights,
      theme: store.theme,
    }),
    [store.stats, store.customFoods, store.days, store.weights, store.theme]
  );
  const cloudSync = useCloudSync({ state: cloudState, replaceState: store.replaceState });

  return (
    <div className={styles.app}>
      <Header
        theme={store.theme}
        onToggleTheme={store.toggleTheme}
        onReset={store.resetDay}
      />
      <TabBar active={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab store={store} />}
      {tab === 'food' && <FoodTab store={store} />}
      {tab === 'photo' && <PhotoTab store={store} />}
      {tab === 'adjust' && <AdjustTab store={store} cloudSync={cloudSync} />}
      {tab === 'custom' && <CustomTab store={store} />}

      {cloudSync.syncStatus === 'awaiting-decision' && (
        <ConflictModal cloudSync={cloudSync} localState={cloudState} t={t} />
      )}
    </div>
  );
}

function ConflictModal({ cloudSync, localState, t }) {
  const [confirmingLocal, setConfirmingLocal] = useState(false);

  if (cloudSync.syncStatus !== 'awaiting-decision' || !cloudSync.pendingServerData) {
    return null;
  }

  const ps = cloudSync.pendingServerData;

  // ----- Derive stats for each side -----
  const localDays = (localState && localState.days) || {};
  const localDayKeys = Object.keys(localDays);
  const localDayCount = localDayKeys.length;
  const localFoodCount = ((localState && localState.customFoods) || []).length;
  const localLastEdit = localDayKeys.reduce(
    (mx, k) => Math.max(mx, (localDays[k] && localDays[k].lastEdit) || 0),
    0
  );

  const cloudDays = ps.days || {};
  const cloudDayKeys = Object.keys(cloudDays);
  const cloudDayCount = cloudDayKeys.length;
  const cloudFoodCount = (ps.customFoods || []).length;
  let cloudLastEdit = cloudDayKeys.reduce(
    (mx, k) => Math.max(mx, (cloudDays[k] && cloudDays[k].lastEdit) || 0),
    0
  );
  // Fallback: pre-tracking docs only have a doc-level lastModified
  if (cloudLastEdit === 0 && ps.lastModified) {
    if (typeof ps.lastModified.toMillis === 'function') {
      cloudLastEdit = ps.lastModified.toMillis();
    } else if (ps.lastModified.seconds) {
      cloudLastEdit = ps.lastModified.seconds * 1000;
    }
  }

  const localIsNewer = localLastEdit > 0 && localLastEdit > cloudLastEdit;
  const cloudIsNewer = cloudLastEdit > 0 && cloudLastEdit > localLastEdit;

  const fmtEdited = (ts) => {
    if (!ts) return t('sync.conflict.neverEdited');
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return t('date.lastEditJustNow');
    const min = Math.floor(sec / 60);
    if (min < 60) return t('date.lastEditMin', { n: min });
    const hr = Math.floor(min / 60);
    if (hr < 24) return t('date.lastEditHour', { n: hr });
    return t('date.lastEditDay', { n: Math.floor(hr / 24) });
  };

  // ----- Inline styles (match existing AdjustTab card pattern) -----
  const cardBase = {
    border: '1px solid var(--border, #e5e5e5)',
    borderRadius: 8,
    padding: 12,
    background: 'var(--card-bg, #fff)',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    width: '100%',
  };
  const cardConfirming = {
    ...cardBase,
    cursor: 'default',
    borderColor: 'var(--accent, #f57c00)',
    background: 'rgba(245, 124, 0, 0.06)',
  };
  const newerBadge = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--green, #2e7d32)',
    background: 'rgba(46, 125, 50, 0.12)',
    padding: '2px 6px',
    borderRadius: 4,
    marginLeft: 6,
  };
  const headerRow = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  };
  const dataLine = { fontSize: 13, color: 'var(--muted, #666)', marginTop: 6 };
  const editedLineBase = { fontSize: 12, marginTop: 4 };
  const primaryBtn = {
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'var(--accent, #f57c00)',
    color: '#fff',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 6,
  };
  const secondaryBtn = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--border, #d0d0d0)',
    background: 'transparent',
    color: 'inherit',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  };

  const hoverIn = (e) => {
    e.currentTarget.style.borderColor = 'var(--accent, #f57c00)';
  };
  const hoverOut = (e) => {
    e.currentTarget.style.borderColor = 'var(--border, #e5e5e5)';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg, #fff)',
          color: 'var(--text, inherit)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{t('sync.conflict.title')}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted, #555)', lineHeight: 1.5 }}>
          {t('sync.conflict.body')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* LEFT: This device */}
          {confirmingLocal ? (
            <div style={cardConfirming}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                {t('sync.conflict.warnTitle')}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted, #666)',
                  lineHeight: 1.45,
                  marginBottom: 12,
                }}
              >
                {t('sync.conflict.warnBody')}
              </div>
              <button onClick={() => cloudSync.confirmLocalWins()} style={primaryBtn}>
                {t('sync.conflict.warnConfirm')}
              </button>
              <button onClick={() => setConfirmingLocal(false)} style={secondaryBtn}>
                {t('sync.conflict.warnCancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingLocal(true)}
              style={cardBase}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              <div style={headerRow}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t('sync.conflict.localLabel')}</span>
                {localIsNewer && <span style={newerBadge}>{t('sync.conflict.newer')}</span>}
              </div>
              <div style={dataLine}>
                {t('sync.conflict.daysLine', { n: localDayCount, f: localFoodCount })}
              </div>
              <div
                style={{
                  ...editedLineBase,
                  color: localIsNewer ? 'var(--green, #2e7d32)' : 'var(--faint, #888)',
                  fontWeight: localIsNewer ? 600 : 400,
                }}
              >
                {fmtEdited(localLastEdit)}
              </div>
            </button>
          )}

          {/* RIGHT: Cloud */}
          <button
            onClick={() => cloudSync.confirmCloudWins()}
            style={cardBase}
            onMouseEnter={hoverIn}
            onMouseLeave={hoverOut}
          >
            <div style={headerRow}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('sync.conflict.cloudLabel')}</span>
              {cloudIsNewer && <span style={newerBadge}>{t('sync.conflict.newer')}</span>}
            </div>
            <div style={dataLine}>
              {t('sync.conflict.daysLine', { n: cloudDayCount, f: cloudFoodCount })}
            </div>
            <div
              style={{
                ...editedLineBase,
                color: cloudIsNewer ? 'var(--green, #2e7d32)' : 'var(--faint, #888)',
                fontWeight: cloudIsNewer ? 600 : 400,
              }}
            >
              {fmtEdited(cloudLastEdit)}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
