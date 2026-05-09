import { useState, useEffect } from 'react'
import BillSplitter from './components/BillSplitter'
import SushiroCalculator from './components/SushiroCalculator'
import { LangProvider, useLang } from './LangContext'
import { readShareFromHash, clearShareHash } from './share'
import styles from './App.module.css'

function AppInner() {
  const [activeTab, setActiveTab] = useState('split')
  const [dark, setDark] = useState(false)
  const [shared, setShared] = useState(null)
  const { lang, toggle: toggleLang, t } = useLang()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const data = readShareFromHash()
    if (data) {
      setShared(data)
      setActiveTab(data.t)
    }
  }, [])

  const exitShared = () => {
    setShared(null)
    clearShareHash()
  }

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
            {/* Language toggle */}
            <button
              className={styles.iconBtn}
              onClick={toggleLang}
              title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            {/* Dark/Light toggle */}
            <button
              className={styles.iconBtn}
              onClick={() => setDark(d => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '🌞' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {shared && (
        <div className={styles.sharedBanner}>
          <span className={styles.sharedBannerText}>👁️ {t.viewingShared}</span>
          <button className={styles.sharedBannerBtn} onClick={exitShared}>{t.startYourOwn}</button>
        </div>
      )}

      {!shared && (
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
      )}

      <main className={styles.content}>
        {activeTab === 'split' && <BillSplitter sharedState={shared && shared.t === 'split' ? shared.s : null} readOnly={!!shared} />}
        {activeTab === 'sushi' && <SushiroCalculator sharedState={shared && shared.t === 'sushi' ? shared.s : null} readOnly={!!shared} />}
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
