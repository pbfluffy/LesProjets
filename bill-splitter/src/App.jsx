import { useState, useEffect } from 'react'
import BillSplitter from './components/BillSplitter'
import SushiroCalculator from './components/SushiroCalculator'
import { LangProvider, useLang } from './LangContext'
import { readShareFromHash, clearShareHash } from './share'
import styles from './App.module.css'

// Read share data once at module load (before any component renders)
const initialShare = readShareFromHash()

function AppInner() {
  const [shared, setShared] = useState(initialShare)
  const [activeTab, setActiveTab] = useState(initialShare?.t || 'split')
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const { lang, toggle: toggleLang, t } = useLang()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const exitShared = () => {
    setShared(null)
    clearShareHash()
  }

  const TABS = [
    { id: 'split', label: t.tabSplit },
    { id: 'sushi', label: t.tabSushi },
  ]

  const sharedBillName = shared?.s?.billName?.trim()

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>{t.appName}</span>
          <div className={styles.headerControls}>
            {/* Home */}
            <button
              className={styles.iconBtn}
              onClick={() => { window.location.href = '../' }}
              title={lang === 'th' ? 'กลับสู่หน้าแรก' : 'Back to home'}
              aria-label="Home"
            >
              🏠
            </button>
            {/* Language toggle */}
            <button
              className={styles.iconBtn}
              onClick={toggleLang}
              title={lang === 'th' ? 'Switch to English' : '\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22'}
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            {/* Dark/Light toggle */}
            <button
              className={styles.iconBtn}
              onClick={() => setDark(d => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '\u{1F31E}' : '\u{1F319}'}
            </button>
          </div>
        </div>
      </header>

      {shared && (
        <div className={styles.sharedBanner}>
          <span className={styles.sharedBannerText}>
            {sharedBillName
              ? `\u{1F374} ${sharedBillName}`
              : `\u{1F441}\u{FE0F} ${t.viewingShared}`}
          </span>
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
