import { useState, useEffect, useRef } from 'react'
import { auth, GoogleAuthProvider, signInWithPopup, signOut } from './firebase.js'
import BillSplitter from './components/BillSplitter'
import SushiroCalculator from './components/SushiroCalculator'
import BillHistory from './components/BillHistory'
import { LangProvider, useLang } from './LangContext'
import { readShareFromHash, clearShareHash } from './share'
import { useBillHistory } from './hooks/useBillHistory'
import { useCloudSync } from './hooks/useCloudSync'
import styles from './App.module.css'

// Read share data once at module load (before any component renders)
const initialShare = readShareFromHash()

function AppInner() {
  const [shared, setShared] = useState(initialShare)
  const [activeTab, setActiveTab] = useState(() => {
    if (initialShare?.t) return initialShare.t
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    if (tabParam === 'sushi' || tabParam === 'split') return tabParam
    return 'split'
  })
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const { lang, toggle: toggleLang, t } = useLang()

  // Bill history
  const history = useBillHistory()
  const cloudSync = useCloudSync({
    entries: history.entries,
    replaceEntries: history.replaceEntries,
  })
  // Conflict resolution: if cloud has different bills than local, prompt user.
  useEffect(() => {
    if (cloudSync.syncStatus === 'awaiting-decision' && cloudSync.pendingServerEntries) {
      const cloudCount = cloudSync.pendingServerEntries.length
      const localCount = history.entries.length
      const useCloud = window.confirm(
        `Cloud has ${cloudCount} saved bill(s), this device has ${localCount}.\n\n` +
        `OK = use cloud (replaces local).\nCancel = keep this device (overwrites cloud).`
      )
      if (useCloud) cloudSync.confirmCloudWins()
      else cloudSync.confirmLocalWins()
    }
  }, [cloudSync.syncStatus])
  const user = cloudSync.user
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const popoverWrapRef = useRef(null)
  useEffect(() => {
    if (!popoverOpen) return
    const handler = (e) => {
      if (popoverWrapRef.current && !popoverWrapRef.current.contains(e.target)) setPopoverOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popoverOpen])
  const handleSignIn = async () => {
    if (signingIn) return
    setSigningIn(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      setPopoverOpen(false)
    } catch (e) {
      console.warn('[acct] sign-in failed:', e)
    } finally {
      setSigningIn(false)
    }
  }
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setPopoverOpen(false)
    } catch (e) {
      console.warn('[acct] sign-out failed:', e)
    }
  }
  const [historyOpen, setHistoryOpen] = useState(false)
  // Loaded entries are passed in as initial state to BillSplitter/SushiroCalculator.
  // Bumping `loadEpoch` (used as react key) remounts the store so initial takes effect.
  const [loaded, setLoaded] = useState(null)
  const [loadEpoch, setLoadEpoch] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const exitShared = () => {
    setShared(null)
    clearShareHash()
  }

  const handleSaveBill = (tab, snapshot) => {
    history.save(tab, snapshot)
  }

  const handleLoadEntry = (entry) => {
    setShared(null)
    clearShareHash()
    setActiveTab(entry.tab)
    setLoaded({ tab: entry.tab, state: entry.state })
    setLoadEpoch(e => e + 1)
    setHistoryOpen(false)
  }

  const TABS = [
    { id: 'split', label: t.tabSplit },
    { id: 'sushi', label: t.tabSushi },
  ]

  const sharedBillName = shared?.s?.billName?.trim()

  // Decide what `initial` to pass to each tab's store
  const splitInitial = shared && shared.t === 'split' ? shared.s
                     : (loaded && loaded.tab === 'split' ? loaded.state : null)
  const sushiInitial = shared && shared.t === 'sushi' ? shared.s
                     : (loaded && loaded.tab === 'sushi' ? loaded.state : null)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>{t.appName}</span>
          <div className={styles.headerControls}>
            {/* History */}
            <button
              className={styles.iconBtn}
              onClick={() => setHistoryOpen(true)}
              title={t.historyTitle}
              aria-label={t.historyTitle}
            >
              📚
            </button>
            {/* Home */}
            <button
              className={styles.iconBtn}
              onClick={() => { window.location.href = '../' }}
              title={t.backToHome}
              aria-label="Home"
            >
              🏠
            </button>
            {/* Language toggle */}
            <button
              className={styles.iconBtn}
              onClick={toggleLang}
              title={t.langSwitch}
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            {/* Dark/Light toggle */}
            <button
              className={styles.iconBtn}
              onClick={() => setDark(d => !d)}
              title={dark ? t.switchToLight : t.switchToDark}
            >
              {dark ? '\u{1F31E}' : '\u{1F319}'}
            </button>
            {/* Account */}
            <div style={{ position: 'relative' }} ref={popoverWrapRef}>
              <button
                className={styles.iconBtn}
                onClick={() => setPopoverOpen(o => !o)}
                title={user ? user.email : t.acctSignIn}
                aria-label={t.acctSignIn}
                style={user ? { boxShadow: 'inset 0 0 0 2px var(--green, #2e7d32)' } : undefined}
              >
                👤
              </button>
              {popoverOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'var(--color-surface, white)', color: 'var(--color-text, inherit)', border: '1px solid var(--color-border, #ddd)', borderRadius: 8, padding: 12, minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 100, textAlign: 'left' }}>
                  {user ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, wordBreak: 'break-all' }}>{user.displayName || 'User'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted, #666)', marginBottom: 10, wordBreak: 'break-all' }}>{user.email}</div>
                      <button onClick={handleSignOut} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border, #ddd)', background: 'transparent', color: 'inherit', borderRadius: 6, cursor: 'pointer', font: 'inherit' }}>{t.acctSignOut}</button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{t.acctSignIn}</div>
                      <button onClick={handleSignIn} disabled={signingIn} style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'var(--accent, #ff6b35)', color: 'white', borderRadius: 6, cursor: signingIn ? 'default' : 'pointer', font: 'inherit', fontWeight: 600 }}>{signingIn ? t.acctSigningIn : t.acctContinueWithGoogle}</button>
                    </>
                  )}
                </div>
              )}
            </div>
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
        {activeTab === 'split' && (
          <BillSplitter
            key={`split-${loadEpoch}`}
            sharedState={splitInitial}
            readOnly={!!shared}
            onSaveBill={handleSaveBill}
          />
        )}
        {activeTab === 'sushi' && (
          <SushiroCalculator
            key={`sushi-${loadEpoch}`}
            sharedState={sushiInitial}
            readOnly={!!shared}
          />
        )}
      </main>

      {historyOpen && (
        <BillHistory
          entries={history.entries}
          onLoad={handleLoadEntry}
          onRemove={history.remove}
          onClear={history.clear}
          onClose={() => setHistoryOpen(false)}
        />
      )}
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
