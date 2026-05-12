import { useState } from 'react';
import AdjustTab from './components/AdjustTab.jsx';
import CustomTab from './components/CustomTab.jsx';
import FoodTab from './components/FoodTab.jsx';
import Header from './components/Header.jsx';
import OverviewTab from './components/OverviewTab.jsx';
import PhotoTab from './components/PhotoTab.jsx';
import TabBar from './components/TabBar.jsx';
import { useNutritionStore } from './hooks/useNutritionStore.js';
import styles from './App.module.css';

export default function App() {
  const store = useNutritionStore();
  const [tab, setTab] = useState('overview');

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
      {tab === 'adjust' && <AdjustTab store={store} />}
      {tab === 'custom' && <CustomTab store={store} />}
    </div>
  );
}
