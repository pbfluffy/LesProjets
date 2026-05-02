import { useState } from 'react'
import BillSplitter from './components/BillSplitter'
import SushiroCalculator from './components/SushiroCalculator'
import styles from './App.module.css'

const TABS = [
  { id: 'split', label: 'หารบิล' },
  { id: 'sushi', label: 'Sushiro' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('split')
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>หารบิล</span>
          <span className={styles.date}>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </header>
      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button key={tab.id} className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <main className={styles.content}>
        {activeTab === 'split' && <BillSplitter />}
        {activeTab === 'sushi' && <SushiroCalculator />}
      </main>
    </div>
  )
}
