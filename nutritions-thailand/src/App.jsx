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
  const { pendingServerData, confirmCloudWins, confirmLocalWins } = cloudSync;
  if (!pendingServerData) return null;

  const localDays = Object.keys(localState.days || {}).length;
  const localFoods = (localState.customFoods || []).length;
  const cloudDays = Object.keys(pendingServerData.days || {}).length;
  const cloudFoods = (pendingServerData.customFoods || []).length;

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  };
  const card = {
    background: 'var(--bg, white)', color: 'var(--text, inherit)',
    borderRadius: 14, padding: 20, maxWidth: 440, width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
  };
  const statBox = {
    flex: 1, padding: 12, borderRadius: 10,
    border: '1px solid var(--border, rgba(127,127,127,0.25))',
  };
  const primaryBtn = {
    flex: 1, padding: '10px 16px', borderRadius: 10,
    background: 'var(--accent, #f37c44)', color: 'white', border: 'none',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
  };
  const secondaryBtn = {
    flex: 1, padding: '10px 16px', borderRadius: 10,
    background: 'transparent', color: 'inherit',
    border: '1px solid var(--border, rgba(127,127,127,0.35))',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {t('sync.conflict.title')}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16, opacity: 0.85 }}>
          {t('sync.conflict.body')}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={statBox}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              {t('sync.conflict.localLabel')}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {t('sync.conflict.daysLine', { n: localDays, f: localFoods })}
            </div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              {t('sync.conflict.cloudLabel')}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {t('sync.conflict.daysLine', { n: cloudDays, f: cloudFoods })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={confirmLocalWins} style={secondaryBtn}>
            {t('sync.conflict.useLocal')}
          </button>
          <button onClick={confirmCloudWins} style={primaryBtn}>
            {t('sync.conflict.useCloud')}
          </button>
        </div>
      </div>
    </div>
  );
}
