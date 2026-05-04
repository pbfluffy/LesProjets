import { useState, useEffect } from 'react'
import BillSplitter from './components/BillSplitter'
import SushiroCalculator from './components/SushiroCalculator'
import { LangProvider, useLang } from './LangContext'
import styles from './App.module.css'

function AppInner() {
  const [activeTab, setActiveTab] = useState('split')
  const [dark, setDark] = useState(false)
  const { lang, toggle: toggleLang, t } = useLang()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const TABS = [
    { id: 'split', label: t.tabSplit },
    { id: 'sushi', label: t.tabSushi },
  ]

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>{t.appName}</span>
          <div className={styles.headerControls}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleLang}
              title={lang === 'th' ? 'Switch to English' : 'เพ่มเหมามธอกil'}
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setDark(t => !t)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀��' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className={styles.content}>
        {activeTab === 'split' && <BillSplitter />}
        {activeTab === 'sushi' && <SushiroCalculator />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  )
}
