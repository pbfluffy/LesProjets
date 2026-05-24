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
    </div>
  );
}
